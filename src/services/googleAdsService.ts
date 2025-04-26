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
    const { data: tokenData } = await supabase
      .from('google_ads_tokens')
      .select('access_token, expires_at')
      .single();
    
    if (!tokenData?.access_token) {
      console.log("No access token found");
      return false;
    }
    
    const isExpired = new Date(tokenData.expires_at) <= new Date();
    if (isExpired) {
      console.log("Token is expired, attempting refresh");
      return await refreshGoogleToken();
    }
    
    return true;
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
    console.log("Initiating Google Auth process");
    
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "auth" }
    });
    
    if (error || !data?.url) {
      console.error("Failed to get auth URL:", error || "No URL returned");
      throw new Error(error?.message || "Failed to get authentication URL");
    }
    
    console.log("Redirecting to Google Auth URL:", data.url);
    window.location.href = data.url;
    return { url: data.url };
  } catch (error) {
    console.error("Error in initiateGoogleAuth:", error);
    throw new Error(`Authentication initialization failed: ${error.message}`);
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
    
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "revoke" }
    });
    
    if (error) {
      console.error("Error revoking Google access:", error);
      throw error;
    }
    
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
