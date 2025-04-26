
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const initiateGoogleAdsConnection = async () => {
  try {
    // Verify active session first
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to connect Google Ads");
      throw new Error("No active session");
    }

    console.log("Starting Google Ads connection with user:", session.user.id);
    
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { 
        action: "auth",
        timestamp: new Date().toISOString(),
        state: JSON.stringify({
          userId: session.user.id,
          timestamp: new Date().toISOString()
        })
      }
    });

    if (error || !data?.url) {
      console.error("Failed to initiate OAuth:", error || "No URL returned");
      throw new Error(error?.message || "Failed to start Google Ads connection");
    }

    console.log("Successfully generated auth URL");
    return { url: data.url };
  } catch (error) {
    console.error("Error in initiateGoogleAdsConnection:", error);
    throw error;
  }
};

export const processOAuthCallback = async (code: string): Promise<boolean> => {
  try {
    console.log("Processing OAuth callback with code");
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Session expired. Please sign in again.");
      return false;
    }

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { 
        action: "callback",
        code,
        userId: session.user.id
      }
    });

    if (error || !data?.success) {
      console.error("OAuth callback failed:", error || data?.error);
      throw new Error(error?.message || data?.error || "Failed to complete authentication");
    }

    return true;
  } catch (error) {
    console.error("Error in processOAuthCallback:", error);
    throw error;
  }
};

export const validateConnection = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return false;
    }

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { action: "validate" }
    });

    if (error || !data?.valid) {
      console.error("Connection validation failed:", error || data?.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating connection:", error);
    return false;
  }
};
