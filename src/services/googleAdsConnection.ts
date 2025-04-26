import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const initiateGoogleAdsConnection = async () => {
  try {
    // Get current session to ensure we have auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to connect Google Ads");
      return { error: "No active session" };
    }

    console.log("Starting Google Ads connection process");
    
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { 
        action: "auth",
        timestamp: new Date().toISOString(),
        state: JSON.stringify({
          redirectPath: '/integrations',
          timestamp: new Date().toISOString()
        })
      }
    });

    if (error) {
      console.error("Failed to initiate OAuth:", error);
      return { error: error.message || "Failed to start Google Ads connection" };
    }

    if (!data?.url) {
      console.error("No URL returned from edge function");
      return { error: "No authentication URL returned" };
    }

    return { url: data.url };
  } catch (error) {
    console.error("Error in initiateGoogleAdsConnection:", error);
    return { error: error instanceof Error ? error.message : "An unexpected error occurred" };
  }
};

export const processOAuthCallback = async (code: string): Promise<boolean> => {
  try {
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
      toast.error("Failed to complete Google Ads connection");
      return false;
    }

    toast.success("Successfully connected to Google Ads");
    return true;
  } catch (error) {
    console.error("Error in processOAuthCallback:", error);
    toast.error("An unexpected error occurred");
    return false;
  }
};

export const validateGoogleAdsConnection = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { action: "validate" }
    });

    if (error || !data?.valid) {
      console.error("Connection validation failed:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating Google Ads connection:", error);
    return false;
  }
};
