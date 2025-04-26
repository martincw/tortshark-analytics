
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const initiateGoogleAdsConnection = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
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
      toast.error(error.message || "Failed to start Google Ads connection");
      return { error: error.message || "Failed to start Google Ads connection" };
    }

    if (!data?.url) {
      console.error("No URL returned from edge function");
      toast.error("No authentication URL returned");
      return { error: "No authentication URL returned" };
    }

    // Store the current URL for redirect after auth
    localStorage.setItem('preAuthPath', '/integrations');
    
    return { url: data.url };
  } catch (error) {
    console.error("Error in initiateGoogleAdsConnection:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    toast.error(errorMessage);
    return { error: errorMessage };
  }
};

export const processOAuthCallback = async (code: string): Promise<boolean> => {
  try {
    console.log("Starting OAuth callback processing");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Session expired. Please sign in again.");
      return false;
    }

    console.log("Processing callback with session");

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { 
        action: "callback",
        code,
        user_id: session.user.id
      }
    });

    if (error) {
      console.error("OAuth callback failed:", error);
      throw new Error(error.message);
    }
    
    if (!data?.success) {
      console.error("Callback processing failed:", data?.error || "Unknown error");
      throw new Error(data?.error || "Failed to process authentication");
    }

    await validateGoogleAdsConnection();
    return true;
  } catch (error) {
    console.error("Error in processOAuthCallback:", error);
    throw error;
  }
};

export const validateGoogleAdsConnection = async (): Promise<boolean> => {
  try {
    console.log("Validating Google Ads connection");
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { action: "validate" }
    });

    if (error || !data?.valid) {
      console.error("Connection validation failed:", error || data?.error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error validating Google Ads connection:", error);
    return false;
  }
};
