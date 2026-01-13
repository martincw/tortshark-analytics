import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRange } from "@/types/common";
import { GoogleAdsMetricsResponse } from "@/types/metrics";

// Types
interface GoogleAdsCredentials {
  customerId: string;
  developerToken: string;
  userEmail?: string;
}

interface GoogleAdsAccount {
  id: string;
  name: string;
  customerId: string;
  status?: string;
}

// Authentication functions
export const isGoogleAuthValid = async (): Promise<boolean> => {
  try {
    console.log("Checking Google Ads authentication validity...");
    
    // Use the edge function to validate token instead of directly querying the database
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { action: "validate" }
    });
    
    if (error) {
      console.error("Error validating Google auth:", error);
      return false;
    }
    
    return data?.valid || false;
  } catch (error) {
    console.error('Google Ads authentication validation failed:', {
      errorMessage: error.message,
      errorStack: error.stack
    });
    return false;
  }
};

export const initiateGoogleAuth = async (): Promise<{ url: string }> => {
  try {
    const { data: session } = await supabase.auth.getSession();

    if (!session?.session) {
      toast.error("Please sign in to connect Google Ads");
      throw new Error("No active session found");
    }

    const redirectTo = typeof window !== "undefined"
      ? window.location.href
      : "/data-sources?source=googleads";

    console.log("Starting Google Auth process with valid session");

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: {
        action: "auth",
        timestamp: new Date().toISOString(),
        redirectTo,
      }
    });

    if (error) {
      console.error("Failed to get auth URL:", error);
      throw new Error(`Failed to get authentication URL: ${error.message || error}`);
    }

    if (!data?.url) {
      console.error("No URL returned from edge function");
      throw new Error("No authentication URL was returned from the server");
    }

    // Redirect the browser to Google's consent screen
    window.location.href = data.url;

    return { url: data.url };
  } catch (error) {
    console.error("Error in initiateGoogleAuth:", error);
    throw error;
  }
};

export const handleOAuthCallback = async (
  code: string,
  redirectUri?: string
): Promise<boolean> => {
  try {
    console.log("Processing OAuth callback");
    
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session) {
      toast.error("Session expired. Please sign in again.");
      return false;
    }

    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { 
        action: "callback",
        code,
        redirectUri
      }
    });
    
    if (error) {
      console.error("Error processing OAuth callback:", error);
      throw error;
    }
    
    if (!data.success) {
      console.error("Callback processing failed:", data.error || "Unknown error");
      throw new Error(data.error || "Failed to process authentication");
    }
    
    return true;
  } catch (error) {
    console.error("Error in handleOAuthCallback:", error);
    throw error;
  }
};

export const getGoogleAdsCredentials = async (): Promise<GoogleAdsCredentials | null> => {
  try {
    // Use the edge function to get credential info instead of direct database access
    const { data: userData, error: userError } = await supabase.functions.invoke('google-ads', {
      body: { action: "get-credentials" }
    });
      
    if (userError || !userData) {
      console.error("Error getting Google Ads credentials:", userError);
      return null;
    }
    
    if (!userData.access_token) {
      console.error("No access token found");
      return null;
    }

    const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-ads', {
      body: { action: "get-developer-token" }
    });

    if (tokenError || !tokenData || !tokenData.developerToken) {
      console.error("Error getting developer token:", tokenError);
      return null;
    }
    
    return {
      customerId: "", // Initially empty, will be set when user selects an account
      developerToken: tokenData.developerToken,
      userEmail: userData.email
    };
  } catch (error) {
    console.error("Error in getGoogleAdsCredentials:", error);
    return null;
  }
};

export const validateGoogleToken = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { action: "validate" }
    });
    
    if (error) {
      console.error("Error validating Google token:", error);
      return false;
    }
    
    return data?.valid || false;
  } catch (error) {
    console.error("Error in validateGoogleToken:", error);
    return false;
  }
};

export const refreshGoogleToken = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { action: "refresh" }
    });
    
    if (error) {
      console.error("Error refreshing Google token:", error);
      throw error;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error in refreshGoogleToken:", error);
    return false;
  }
};

export const revokeGoogleAccess = async (): Promise<boolean> => {
  try {
    console.log("Revoking Google access");
    
    const { data, error } = await supabase.functions.invoke('google-oauth', {
      body: { action: "revoke" }
    });
    
    if (error) {
      console.error("Error revoking Google access:", error);
      throw error;
    }
    
    console.log("Successfully revoked Google access");
    return data?.success || false;
  } catch (error) {
    console.error("Error in revokeGoogleAccess:", error);
    return false;
  }
};

// Accounts management functions
export const listGoogleAdsAccounts = async (): Promise<GoogleAdsAccount[]> => {
  try {
    console.log("Listing Google Ads accounts");
    
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "accounts" }
    });
    
    if (error) {
      console.error("Error listing Google Ads accounts:", error);
      // Show more specific error message
      const errorMessage = error.message || "Unknown error";
      toast.error(`Failed to list Google Ads accounts: ${errorMessage}`);
      throw error;
    }
    
    if (!data || !data.accounts) {
      console.warn("No accounts data returned");
      return [];
    }
    
    console.log(`Retrieved ${data.accounts.length} Google Ads accounts`);
    return data.accounts;
  } catch (error) {
    console.error("Error listing Google Ads accounts:", error);
    // More specific error handling - attempt a refresh if it might be a token issue
    if (error.message?.includes("401") || error.message?.includes("auth")) {
      toast.error("Authentication problem with Google Ads. Attempting to refresh...");
      const refreshed = await refreshGoogleToken();
      if (refreshed) {
        toast.success("Reconnected to Google Ads, please try again");
      } else {
        toast.error("Failed to reconnect. Please reconnect your Google Ads account in Integrations.");
      }
    }
    throw error;
  }
};

export const cleanupAllAccounts = async (): Promise<boolean> => {
  try {
    console.log("Cleaning up all Google Ads accounts");
    
    const { data, error } = await supabase.functions.invoke('google-ads-manager', {
      body: { action: "delete-all-accounts" }
    });
    
    if (error) {
      console.error("Error cleaning up accounts:", error);
      throw error;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error in cleanupAllAccounts:", error);
    return false;
  }
};

// Metrics functions
export const fetchGoogleAdsMetrics = async (
  accountId: string,
  dateRange: DateRange
): Promise<GoogleAdsMetricsResponse[]> => {
  try {
    console.log(`Fetching Google Ads metrics for account ${accountId} from ${dateRange.startDate} to ${dateRange.endDate}`);
    
    const { data, error } = await supabase.functions.invoke('google-ads-data', {
      body: { 
        action: "get-metrics",
        customerId: accountId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }
    });
    
    if (error) {
      console.error("Error fetching Google Ads metrics:", error);
      return [];
    }
    
    if (!data || !data.metrics || !Array.isArray(data.metrics)) {
      console.error("Invalid metrics data returned:", data);
      return [];
    }
    
    return data.metrics;
  } catch (error) {
    console.error("Error in fetchGoogleAdsMetrics:", error);
    return [];
  }
};
