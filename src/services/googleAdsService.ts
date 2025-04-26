
import { supabase } from "@/integrations/supabase/client";
import { DateRange, GoogleAdsMetrics } from "@/types/campaign";

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

interface GoogleAdsMetricsResponse {
  impressions: number;
  clicks: number;
  adSpend: number;
  ctr: number;
  cpc: number;
  cpl: number; 
  date: string;
  conversions?: number;
}

// Authentication functions
export const isGoogleAuthValid = async (): Promise<boolean> => {
  try {
    console.log("Checking Google Ads authentication validity...");
    
    // Attempt to fetch accounts as a validation test
    const accounts = await listGoogleAdsAccounts();
    
    console.log(`Google Ads authentication check: Found ${accounts.length} accounts`);
    
    return Array.isArray(accounts) && accounts.length > 0;
  } catch (error) {
    console.warn('Google Ads authentication validation failed:', {
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    // Add more specific error logging
    if (error.message?.includes("Failed to fetch")) {
      console.error("Network error or API endpoint unavailable");
    } else if (error.message?.includes("Unauthorized")) {
      console.error("Authentication token is invalid or expired");
    }
    
    return false;
  }
};

export const initiateGoogleAuth = async (): Promise<{ url: string }> => {
  try {
    console.log("Initiating Google Auth process");
    
    // Call the edge function to get the auth URL
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "auth" }
    });
    
    if (error) {
      console.error("Error initiating Google Auth:", error);
      throw error;
    }
    
    if (!data || !data.url) {
      throw new Error("Failed to get authentication URL");
    }
    
    console.log("Successfully generated Google Auth URL");
    return { url: data.url };
  } catch (error) {
    console.error("Error in initiateGoogleAuth:", error);
    throw error;
  }
};

export const handleOAuthCallback = async (): Promise<boolean> => {
  try {
    console.log("Processing OAuth callback");
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) {
      console.error("No authorization code found in URL");
      return false;
    }
    
    // Call the edge function to exchange the code for tokens
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { 
        action: "callback",
        code 
      }
    });
    
    if (error) {
      console.error("Error processing OAuth callback:", error);
      throw error;
    }
    
    if (!data || !data.success) {
      console.error("Failed to process OAuth callback:", data?.message);
      return false;
    }
    
    console.log("Successfully processed OAuth callback");
    return true;
  } catch (error) {
    console.error("Error in handleOAuthCallback:", error);
    throw error;
  }
};

export const getGoogleAdsCredentials = async (): Promise<GoogleAdsCredentials | null> => {
  try {
    // Get real credentials from the database
    const { data, error } = await supabase
      .from('google_ads_tokens')
      .select('refresh_token, access_token, email')
      .maybeSingle();
      
    if (error || !data) {
      console.error("Error getting Google Ads credentials:", error);
      return null;
    }
    
    if (!data.access_token) {
      console.error("No access token found in database");
      return null;
    }

    // Get the developer token from environment variables via edge function
    const { data: tokenData, error: tokenError } = await supabase.functions.invoke('google-ads', {
      body: { action: "get-developer-token" }
    });

    if (tokenError || !tokenData || !tokenData.developerToken) {
      console.error("Error getting developer token:", tokenError);
      return null;
    }
    
    return {
      customerId: data.customer_id || "", // This will be set when user selects an account
      developerToken: tokenData.developerToken,
      userEmail: data.email
    };
  } catch (error) {
    console.error("Error in getGoogleAdsCredentials:", error);
    return null;
  }
};

export const validateGoogleToken = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke('google-ads', {
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
    // Call the edge function to refresh the token
    const { data, error } = await supabase.functions.invoke('google-ads', {
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
    
    // Call edge function to revoke access with Google
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "revoke" }
    });
    
    if (error) {
      console.error("Error revoking Google access:", error);
      throw error;
    }
    
    // Delete the token from the database
    const { error: deleteError } = await supabase
      .from('google_ads_tokens')
      .delete()
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');
      
    if (deleteError) {
      console.error("Error deleting token from database:", deleteError);
      throw deleteError;
    }
    
    console.log("Successfully revoked Google access");
    return true;
  } catch (error) {
    console.error("Error in revokeGoogleAccess:", error);
    return false;
  }
};

// Accounts management functions
export const listGoogleAdsAccounts = async (): Promise<GoogleAdsAccount[]> => {
  try {
    console.log("Listing Google Ads accounts");
    
    // Call the edge function to list accounts
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "accounts" }
    });
    
    if (error) {
      console.error("Error listing Google Ads accounts:", error);
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
    throw error;
  }
};

export const cleanupAllAccounts = async (): Promise<boolean> => {
  try {
    console.log("Cleaning up all Google Ads accounts");
    
    // Call the edge function to delete all accounts
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
    
    // Call edge function to get real metrics from Google Ads API
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
