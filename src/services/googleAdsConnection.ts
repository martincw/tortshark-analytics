import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const initiateGoogleAdsConnection = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Please sign in to connect Google Ads");
      return { error: "No active session" };
    }

    console.log("Starting Google Ads connection process"); // Added logging
    
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { 
        action: "auth",
        timestamp: new Date().toISOString(),
        state: JSON.stringify({
          redirectPath: '/integrations',
          timestamp: new Date().toISOString()
        })
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Session expired. Please sign in again.");
      return false;
    }

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { 
        action: "callback",
        code,
        userId: session.user.id
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
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
    if (!session?.access_token) return false;

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { action: "validate" },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
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
