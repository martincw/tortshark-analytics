import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

export const initiateGoogleAdsConnection = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Please sign in to connect Google Ads");
      return { error: "No active session" };
    }

    console.log("Starting Google Ads connection process");

    const redirectTo = typeof window !== "undefined"
      ? window.location.href
      : "/data-sources?source=googleads";

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: {
        action: "auth",
        timestamp: new Date().toISOString(),
        redirectTo,
      },
      headers: await getAuthHeaders(),
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

    localStorage.setItem('preAuthPath', redirectTo);

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
      },
      headers: await getAuthHeaders(),
    });

    if (error) {
      console.error("OAuth callback failed:", error);
      throw new Error(error.message);
    }
    
    if (!data?.success) {
      console.error("Callback processing failed:", data?.error || "Unknown error");
      throw new Error(data?.error || "Failed to process authentication");
    }

    await fetchGoogleAdsAccounts();
    
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
      body: { action: "validate" },
      headers: await getAuthHeaders(),
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

export const fetchGoogleAdsAccounts = async (): Promise<any[]> => {
  try {
    console.log("Fetching Google Ads accounts");

    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "accounts" },
      headers: await getAuthHeaders(),
    });

    if (error) {
      console.error("Error fetching Google Ads accounts:", error);
      toast.error("Failed to fetch Google Ads accounts");
      return [];
    }

    if (!data?.accounts) {
      console.log("No accounts returned from API");
      return [];
    }

    console.log(`Successfully fetched ${data.accounts.length} Google Ads accounts`);
    return data.accounts;
  } catch (error) {
    console.error("Error in fetchGoogleAdsAccounts:", error);
    toast.error("Failed to fetch Google Ads accounts");
    return [];
  }
};

export const fetchGoogleAdsCampaignsForAccount = async (customerId: string): Promise<any[]> => {
  try {
    console.log(`Fetching Google Ads campaigns for customer ID: ${customerId}`);

    if (!customerId) {
      throw new Error("Customer ID is required");
    }

    // Check for developer token existence first
    const { data: developerTokenData, error: developerTokenError } = await supabase.functions.invoke('google-ads', {
      body: { action: "get-developer-token" }
    });

    if (developerTokenError || !developerTokenData?.developerToken) {
      console.error("Developer token check failed:", developerTokenError || "No developer token found");
      throw new Error("Google Ads Developer Token is not configured. Please ensure it's set up in your environment.");
    }

    const { data, error } = await supabase.functions.invoke("google-ads-mapping", {
      body: { 
        action: "list-available-campaigns",
        googleAccountId: customerId
      }
    });

    if (error) {
      console.error("Error fetching Google Ads campaigns:", error);
      throw error;
    }

    if (data.error) {
      console.error("API returned an error:", data.error);
      throw new Error(data.error);
    }

    if (!data.campaigns) {
      console.log("No campaigns returned from API");
      return [];
    }

    console.log(`Successfully fetched ${data.campaigns.length} Google Ads campaigns`);
    return data.campaigns;
  } catch (error) {
    console.error("Error in fetchGoogleAdsCampaignsForAccount:", error);
    // More specific error handling
    if (error instanceof Error) {
      if (error.message.includes("token")) {
        throw new Error("Authentication issue: Failed to get Google Ads token. Please reconnect your account.");
      } else if (error.message.includes("Developer Token")) {
        throw new Error("Configuration issue: Google Ads Developer Token is missing or invalid.");
      }
    }
    throw error;
  }
};

export const mapGoogleAdsCampaignToTortshark = async (
  tortsharkCampaignId: string, 
  googleAccountId: string, 
  googleCampaignId: string,
  googleCampaignName: string
): Promise<boolean> => {
  try {
    console.log(`Mapping campaign ${googleCampaignId} to Tortshark campaign ${tortsharkCampaignId}`);

    const { data, error } = await supabase.functions.invoke('google-ads-mapping', {
      body: { 
        action: "create-mapping",
        tortsharkCampaignId,
        googleAccountId,
        googleCampaignId,
        googleCampaignName
      }
    });

    if (error) {
      console.error("Error creating campaign mapping:", error);
      toast.error("Failed to create campaign mapping");
      return false;
    }

    if (data?.error) {
      console.error("API returned an error:", data.error);
      toast.error(`Failed to create mapping: ${data.error}`);
      return false;
    }

    toast.success("Campaign mapping created successfully");
    return true;
  } catch (error) {
    console.error("Error in mapGoogleAdsCampaignToTortshark:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    toast.error(`Failed to create campaign mapping: ${errorMessage}`);
    return false;
  }
};

export const refreshGoogleAdsToken = async (): Promise<boolean> => {
  try {
    console.log("Manually refreshing Google Ads token");
    
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "refresh" }
    });
    
    if (error || !data?.success) {
      console.error("Error refreshing Google Ads token:", error || data?.error);
      return false;
    }
    
    console.log("Token refreshed successfully");
    return true;
  } catch (error) {
    console.error("Error in refreshGoogleAdsToken:", error);
    return false;
  }
};

export const getGoogleAdsDeveloperToken = async (): Promise<string | null> => {
  try {
    console.log("Fetching Google Ads developer token");
    
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "get-developer-token" }
    });
    
    if (error || !data?.developerToken) {
      console.error("Error fetching Google Ads developer token:", error || "No token returned");
      return null;
    }
    
    return data.developerToken;
  } catch (error) {
    console.error("Error in getGoogleAdsDeveloperToken:", error);
    return null;
  }
};
