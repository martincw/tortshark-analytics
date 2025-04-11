import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AccountConnection, DateRange, GoogleAdsMetrics } from "@/types/campaign";

// Store configuration in one place
const GOOGLE_CONFIG = {
  developerToken: "Ngh3IukgQ3ovdkH3M0smUg",
  redirectUri: "https://app.tortshark.com/integrations"
};

// Helper function to get the supabase JWT token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.warn("Error getting auth token:", error);
    return null;
  }
};

export const initiateGoogleAuth = async () => {
  try {
    // Get auth token but don't fail if not available
    let headers = {};
    const token = await getAuthToken();
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    } else {
      console.warn("No auth token available, proceeding without authentication");
    }
    
    const userEmail = localStorage.getItem("userEmail") || "";
    
    console.log("Initiating Google OAuth flow...");
    
    // Call the Supabase edge function to get the authorization URL
    const response = await supabase.functions.invoke("google-oauth", {
      body: { 
        action: "authorize",
        email: userEmail,
        redirectUri: GOOGLE_CONFIG.redirectUri
      },
      headers
    }).catch(error => {
      console.error("Error calling Google OAuth function:", error);
      if (error.message && (
        error.message.includes("Failed to fetch") || 
        error.message.includes("NetworkError") || 
        error.message.includes("refused to connect")
      )) {
        throw new Error(`Network connection error: Unable to connect to authentication service. 
                       Please check your internet connection and firewall settings.`);
      }
      throw error;
    });
    
    if (response.error) {
      console.error("Error initiating Google OAuth:", response.error);
      toast.error("Failed to initiate Google authentication");
      throw new Error(`Error initiating Google OAuth: ${response.error.message}`);
    }
    
    // Enhanced logging for debugging
    console.log("OAuth response:", response.data);
    console.log("OAuth URL:", response.data.url);
    
    // Store debug info in localStorage for troubleshooting
    localStorage.setItem("oauth_debug", JSON.stringify(response.data.debug));
    localStorage.setItem("oauth_ts", new Date().toISOString());
    
    // Redirect to Google OAuth URL
    window.location.href = response.data.url;
  } catch (error) {
    console.error("Error initiating Google auth:", error);
    toast.error(error.message || "Failed to initiate Google authentication");
    throw error;
  }
};

export const handleOAuthCallback = async (): Promise<boolean> => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  
  if (error) {
    console.error(`OAuth error from Google: ${error}`);
    const errorDescription = urlParams.get('error_description');
    throw new Error(`Google OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
  }
  
  if (!code) {
    console.error("No auth code found in URL");
    return false;
  }
  
  console.log("Received auth code from Google");
  
  try {
    // Exchange the code for tokens using our new edge function
    const response = await supabase.functions.invoke("google-ads-accounts", {
      body: { 
        action: "exchange-code",
        code
      }
    });
    
    console.log("Edge function response:", response);
    
    if (response.error) {
      console.error("Error handling OAuth callback:", response.error);
      toast.error("Failed to complete Google authentication");
      throw new Error(`Error exchanging code for tokens: ${response.error.message}`);
    }
    
    // Store response data for debugging
    localStorage.setItem("oauth_callback_response", JSON.stringify(response.data));
    
    // Clear code from URL to prevent repeated processing
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Store tokens and account info in local storage
    if (response.data.success) {
      localStorage.setItem("googleAds_access_token", response.data.tokens.access_token);
      localStorage.setItem("googleAds_refresh_token", response.data.tokens.refresh_token);
      localStorage.setItem("googleAds_token_expiry", response.data.tokens.expiry_date);
      localStorage.setItem("userEmail", response.data.userEmail);
      
      // If accounts are available, store the first one as default
      if (response.data.accounts && response.data.accounts.length > 0) {
        localStorage.setItem("googleAds_account_id", response.data.accounts[0].id);
      }
      
      toast.success("Successfully connected to Google Ads");
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    toast.error("Failed to complete Google authentication");
    throw error;
  }
};

export const getGoogleAdsCredentials = async (): Promise<any | null> => {
  try {
    // Check local storage for cached credentials
    const accessToken = localStorage.getItem("googleAds_access_token");
    const accountId = localStorage.getItem("googleAds_account_id");
    const expiry = localStorage.getItem("googleAds_token_expiry");
    
    if (!accessToken) {
      return null;
    }
    
    // Check if token is expired
    if (expiry && new Date(Number(expiry)) <= new Date()) {
      // Token expired, try to refresh
      const refreshed = await refreshGoogleToken();
      if (!refreshed) {
        return null;
      }
    }
    
    return {
      accessToken,
      customerId: accountId,
      developerToken: GOOGLE_CONFIG.developerToken
    };
  } catch (error) {
    console.error("Error getting Google Ads credentials:", error);
    return null;
  }
};

export const listGoogleAdsAccounts = async (): Promise<AccountConnection[]> => {
  try {
    // Get access token from local storage
    const accessToken = localStorage.getItem("googleAds_access_token");
    
    if (!accessToken) {
      toast.error("Google Ads access token not found");
      return [];
    }
    
    // Call our edge function to list accounts
    const response = await supabase.functions.invoke("google-ads-accounts", {
      body: { 
        action: "list-accounts",
        accessToken
      }
    });
    
    if (response.error) {
      console.error("Error fetching Google Ads accounts:", response.error);
      toast.error("Failed to fetch Google Ads accounts");
      return [];
    }
    
    if (!response.data.success) {
      console.error("Error from API:", response.data.error);
      toast.error(response.data.error || "Failed to fetch Google Ads accounts");
      return [];
    }
    
    // Transform to AccountConnection format
    return response.data.accounts.map((account: any) => ({
      id: account.id,
      name: account.name || `Google Ads Account ${account.id}`,
      platform: "google",
      isConnected: true,
      lastSynced: new Date().toISOString(),
      customerId: account.id
    }));
  } catch (error) {
    console.error("Error listing Google Ads accounts:", error);
    toast.error("Failed to list Google Ads accounts");
    return [];
  }
};

export const fetchGoogleAdsMetrics = async (
  customerId: string,
  dateRange: DateRange
): Promise<GoogleAdsMetrics[] | null> => {
  try {
    // Get credentials
    const credentials = await getGoogleAdsCredentials();
    if (!credentials) {
      toast.error("Google Ads credentials not found");
      return null;
    }
    
    // Get auth token for Supabase function call
    const token = await getAuthToken();
    if (!token) {
      toast.error("Authentication token not found");
      return null;
    }
    
    // Call the Supabase edge function to get the metrics from Google Ads API
    const response = await supabase.functions.invoke("google-ads-data", {
      body: { 
        action: "get-metrics",
        customerId: customerId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.error || !response.data.success) {
      console.error("Error fetching Google Ads metrics:", response.error || response.data.error);
      toast.error("Failed to fetch Google Ads metrics");
      return null;
    }
    
    return response.data.metrics;
  } catch (error) {
    console.error("Error fetching Google Ads metrics:", error);
    toast.error("Failed to fetch Google Ads metrics");
    return null;
  }
};

export const isGoogleAuthValid = async (): Promise<boolean> => {
  try {
    const accessToken = localStorage.getItem("googleAds_access_token");
    const expiry = localStorage.getItem("googleAds_token_expiry");
    
    if (!accessToken) {
      return false;
    }
    
    // Check if token is expired
    if (expiry && new Date(Number(expiry)) <= new Date()) {
      // Token expired, try to refresh
      const refreshed = await refreshGoogleToken();
      return refreshed;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking Google auth validity:", error);
    return false;
  }
};

export const refreshGoogleToken = async (): Promise<boolean> => {
  try {
    const refreshToken = localStorage.getItem("googleAds_refresh_token");
    
    if (!refreshToken) {
      console.error("No refresh token available");
      return false;
    }
    
    // Call our edge function to refresh the token
    const response = await supabase.functions.invoke("google-ads-accounts", {
      body: { 
        action: "refresh-token",
        refreshToken
      }
    });
    
    if (response.error || !response.data.success) {
      console.error("Error refreshing token:", response.error || response.data.error);
      return false;
    }
    
    // Update stored tokens
    localStorage.setItem("googleAds_access_token", response.data.tokens.access_token);
    if (response.data.tokens.expiry_date) {
      localStorage.setItem("googleAds_token_expiry", response.data.tokens.expiry_date);
    }
    
    return true;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
};

export const revokeGoogleAccess = async (): Promise<boolean> => {
  try {
    // Clear local storage regardless of API call
    localStorage.removeItem("googleAds_access_token");
    localStorage.removeItem("googleAds_refresh_token");
    localStorage.removeItem("googleAds_token_expiry");
    localStorage.removeItem("googleAds_account_id");
    
    // Call our edge function to revoke access
    const token = await getAuthToken();
    if (!token) {
      // Still return true as we cleared local storage
      return true;
    }
    
    const response = await supabase.functions.invoke("google-oauth", {
      body: { action: "revoke" },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.error) {
      console.error("Error revoking access:", response.error);
      // Still return true as we cleared local storage
      return true;
    }
    
    return response.data.success || true;
  } catch (error) {
    console.error("Error revoking access:", error);
    // Still return true as we cleared local storage
    return true;
  }
};

// Let's add fetchGoogleAdsAccounts as an alias to listGoogleAdsAccounts
export const fetchGoogleAdsAccounts = listGoogleAdsAccounts;

// Create an object with all the exported functions
export const googleAdsService = {
  initiateGoogleAuth,
  handleOAuthCallback,
  getGoogleAdsCredentials,
  fetchGoogleAdsMetrics,
  isGoogleAuthValid,
  refreshGoogleToken,
  listGoogleAdsAccounts,
  fetchGoogleAdsAccounts,
  revokeGoogleAccess
};
