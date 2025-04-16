
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AccountConnection, DateRange, GoogleAdsMetrics } from "@/types/campaign";

// Add a debounce utility
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const GOOGLE_CONFIG = {
  developerToken: "Ngh3IukgQ3ovdkH3M0smUg",
  redirectUri: "https://app.tortshark.com/integrations"
};

const getAuthToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.warn("Error getting auth token:", error);
    return null;
  }
};

export const initiateGoogleAuth = async (userEmail?: string) => {
  try {
    let headers = {};
    const token = await getAuthToken();
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    } else {
      console.warn("No auth token available, proceeding without authentication");
    }
    
    const email = userEmail || localStorage.getItem("userEmail") || "";
    
    console.log("Initiating Google OAuth flow...");
    
    const response = await supabase.functions.invoke("google-oauth", {
      body: { 
        action: "authorize",
        email: email,
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
    
    if (!response.data?.url) {
      throw new Error('No authorization URL received');
    }
    
    console.log("OAuth response:", response.data);
    console.log("OAuth URL:", response.data.url);
    
    localStorage.setItem("oauth_debug", JSON.stringify(response.data.debug));
    localStorage.setItem("oauth_ts", new Date().toISOString());
    
    return response.data;
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
  
  // Add a unique request ID to help with debugging
  const requestId = Math.random().toString(36).substring(7);
  console.log(`Starting OAuth callback processing (${requestId})`);
  
  if (error) {
    console.error(`OAuth error from Google (${requestId}): ${error}`);
    const errorDescription = urlParams.get('error_description');
    throw new Error(`Google OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`);
  }
  
  if (!code) {
    console.error(`No auth code found in URL (${requestId})`);
    return false;
  }
  
  console.log(`Received auth code from Google (${requestId}), length: ${code.length}`);
  
  try {
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log(`User authentication token available for callback (${requestId})`);
    } else {
      console.warn(`No user authentication token available for callback (${requestId})`);
    }
    
    console.log(`Calling google-oauth edge function with callback action (${requestId})`);
    const response = await supabase.functions.invoke("google-oauth", {
      body: { 
        action: "callback",
        code,
        redirectUri: GOOGLE_CONFIG.redirectUri,
        requestId
      },
      headers
    });
    
    console.log(`Edge function response status (${requestId}):`, response.error ? "error" : "success");
    
    if (response.error) {
      console.error(`Error handling OAuth callback (${requestId}):`, response.error);
      toast.error(`Failed to complete Google authentication: ${response.error.message}`);
      throw new Error(`Error exchanging code for tokens: ${response.error.message}`);
    }
    
    localStorage.setItem("oauth_callback_response", JSON.stringify({
      success: response.data.success,
      hasAccessToken: !!response.data.accessToken,
      hasRefreshToken: !!response.data.refreshToken,
      userEmail: response.data.userEmail || null,
      timestamp: new Date().toISOString(),
      requestId
    }));
    
    if (response.data.success) {
      console.log(`Successfully obtained tokens (${requestId}), storing in localStorage`);
      localStorage.setItem("googleAds_access_token", response.data.accessToken);
      localStorage.setItem("googleAds_refresh_token", response.data.refreshToken);
      localStorage.setItem("googleAds_token_expiry", response.data.expiry_date.toString());
      localStorage.setItem("userEmail", response.data.userEmail);
      
      if (response.data.accounts && response.data.accounts.length > 0) {
        console.log(`Storing ${response.data.accounts.length} Google Ads accounts (${requestId})`);
        localStorage.setItem("googleAds_accounts", JSON.stringify(response.data.accounts));
        localStorage.setItem("googleAds_account_id", response.data.accounts[0].id);
      } else {
        console.log(`No Google Ads accounts returned in response (${requestId})`);
      }
      
      if (response.data.warning) {
        console.warn(`Warning from Google Ads API (${requestId}):`, response.data.warning);
      }
      
      toast.success("Successfully connected to Google Ads");
      return true;
    }
    
    console.error(`Callback processed but response indicated failure (${requestId})`);
    return false;
  } catch (error) {
    console.error(`Error handling OAuth callback (${requestId}):`, error);
    toast.error(error.message || "Failed to complete Google authentication");
    throw error;
  }
};

// Wrap the Google Ads accounts fetching in a debounced function to prevent excessive calls
const debouncedFetchAccounts = debounce(async (accessToken: string, token: string | null, onSuccess: (accounts: any[]) => void, onError: (error: any) => void) => {
  try {
    const headers: Record<string, string> = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("No auth token available, proceeding without authentication");
    }
    
    const response = await supabase.functions.invoke("google-ads-manager", {
      body: { 
        action: "list-accounts",
        accessToken
      },
      headers
    });
    
    if (response.error) {
      console.error("Error from Edge Function:", response.error);
      onError(response.error);
      return;
    }
    
    if (!response.data || !response.data.success) {
      console.error("Error from API:", response.data?.error || "Unknown error");
      onError(response.data?.error || "Failed to fetch Google Ads accounts");
      return;
    }
    
    onSuccess(response.data.accounts || []);
  } catch (error) {
    console.error("Error in debounced fetch accounts:", error);
    onError(error);
  }
}, 1000); // 1 second debounce

export const getGoogleAdsCredentials = async (): Promise<any | null> => {
  try {
    const token = await getAuthToken();
    
    // First check localStorage for cached credentials
    const accessToken = localStorage.getItem("googleAds_access_token");
    const accountId = localStorage.getItem("googleAds_account_id");
    
    // If we have locally cached credentials, use them first instead of waiting for the server
    if (accessToken) {
      console.log("Using cached credentials from localStorage");
      return {
        accessToken,
        customerId: accountId,
        developerToken: GOOGLE_CONFIG.developerToken,
        userEmail: localStorage.getItem("userEmail"),
        source: "localStorage" // Add source for debugging
      };
    }
    
    if (!token) {
      console.warn("No auth token available, cannot fetch credentials from server");
      return null;
    }
    
    console.log("Fetching credentials from server...");
    const response = await supabase.functions.invoke("google-oauth", {
      body: { 
        action: "get-credentials"
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.error) {
      console.error("Error fetching credentials from server:", response.error);
      return null;
    }
    
    if (!response.data.success) {
      console.log("No credentials found on server:", response.data.error);
      return null;
    }
    
    // Store the credentials in localStorage
    if (response.data.accessToken) {
      localStorage.setItem("googleAds_access_token", response.data.accessToken);
    }
    
    return {
      accessToken: response.data.accessToken,
      customerId: response.data.customerId,
      developerToken: response.data.developerToken,
      userEmail: response.data.userEmail,
      source: "server" // Add source for debugging
    };
  } catch (error) {
    console.error("Error getting Google Ads credentials:", error);
    return null;
  }
};

export const listGoogleAdsAccounts = async (): Promise<AccountConnection[]> => {
  try {
    const credentials = await getGoogleAdsCredentials();
    
    if (!credentials || !credentials.accessToken) {
      console.error("Cannot list Google Ads accounts: No valid credentials found");
      toast.error("Google Ads access token not found. Please connect your account first.");
      return [];
    }
    
    console.log("Fetching Google Ads accounts using optimized endpoint");
    
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("No auth token available, proceeding without authentication");
      return [];
    }
    
    // Create a promise-based wrapper for the debounced fetch
    return new Promise((resolve, reject) => {
      debouncedFetchAccounts(
        credentials.accessToken,
        token,
        (accounts) => {
          if (accounts.length > 0) {
            localStorage.setItem("googleAds_accounts", JSON.stringify(accounts));
            
            const mappedAccounts = accounts.map((account: any) => ({
              id: account.id,
              name: account.name || `Google Ads Account ${account.id}`,
              platform: "google",
              isConnected: true,
              lastSynced: new Date().toISOString(),
              customerId: account.id,
              credentials: {}
            }));
            
            resolve(mappedAccounts);
          } else {
            toast.info("No Google Ads accounts found");
            resolve([]);
          }
        },
        (error) => {
          toast.error("Failed to list Google Ads accounts");
          console.error("Error in listGoogleAdsAccounts:", error);
          reject(error);
        }
      );
    });
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
    const credentials = await getGoogleAdsCredentials();
    if (!credentials) {
      toast.error("Google Ads credentials not found");
      return null;
    }
    
    const token = await getAuthToken();
    if (!token) {
      toast.error("Authentication token not found");
      return null;
    }
    
    if (!dateRange.startDate || !dateRange.endDate) {
      console.log("Date range is missing start or end date, can't fetch metrics");
      return null;
    }
    
    console.log(`Fetching Google Ads metrics with date range: ${dateRange.startDate} to ${dateRange.endDate}`);
    
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

export const validateGoogleToken = async (): Promise<boolean> => {
  try {
    const accessToken = localStorage.getItem("googleAds_access_token");
    
    if (!accessToken) {
      console.log("No access token found for validation");
      return false;
    }
    
    console.log("Calling token validation endpoint");
    
    const response = await supabase.functions.invoke("google-oauth", {
      body: { 
        action: "validate-token",
        accessToken
      }
    });
    
    console.log("Token validation response:", response);
    
    if (response.error || !response.data.success) {
      console.error("Error validating token:", response.error || response.data.error);
      return false;
    }
    
    return response.data.valid;
  } catch (error) {
    console.error("Error validating token:", error);
    return false;
  }
};

export const isGoogleAuthValid = async (): Promise<boolean> => {
  try {
    // First check localStorage for quick validation
    const accessToken = localStorage.getItem("googleAds_access_token");
    
    if (!accessToken) {
      console.log("No access token in localStorage, Google Auth is not valid");
      return false;
    }
    
    // Check server-side credentials too (for completeness)
    const token = await getAuthToken();
    if (token) {
      console.log("Checking server-side credentials");
      try {
        const response = await supabase.functions.invoke("google-oauth", {
          body: { 
            action: "get-credentials"
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (!response.error && response.data.success) {
          console.log("Server-side credentials found and valid");
          return true;
        }
      } catch (e) {
        console.warn("Error checking server-side credentials:", e);
        // Continue with localStorage validation
      }
    }
    
    // Check token expiry
    const expiry = localStorage.getItem("googleAds_token_expiry");
    
    if (expiry && new Date(Number(expiry)) <= new Date()) {
      console.log("Token expired, attempting refresh");
      const refreshed = await refreshGoogleToken();
      return refreshed;
    }
    
    // Validate token if needed
    const isValid = await validateGoogleToken();
    return isValid;
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
    
    console.log("Calling direct refresh token endpoint");
    
    const response = await supabase.functions.invoke("google-oauth", {
      body: { 
        action: "refresh-direct",
        refreshToken
      }
    });
    
    console.log("Token refresh response:", response);
    
    if (response.error || !response.data.success) {
      console.error("Error refreshing token:", response.error || response.data.error);
      return false;
    }
    
    localStorage.setItem("googleAds_access_token", response.data.accessToken);
    if (response.data.expiryDate) {
      localStorage.setItem("googleAds_token_expiry", response.data.expiryDate.toString());
    }
    
    console.log("Token refreshed successfully");
    return true;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
};

export const revokeGoogleAccess = async (): Promise<boolean> => {
  try {
    const accessToken = localStorage.getItem("googleAds_access_token");
    const token = await getAuthToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    
    const response = await supabase.functions.invoke("google-oauth", {
      body: { 
        action: "revoke",
        accessToken
      },
      headers
    });
    
    if (response.error) {
      console.error("Error revoking access:", response.error);
    } else {
      console.log("Revocation response:", response.data);
    }
    
    localStorage.removeItem("googleAds_access_token");
    localStorage.removeItem("googleAds_refresh_token");
    localStorage.removeItem("googleAds_token_expiry");
    localStorage.removeItem("googleAds_account_id");
    localStorage.removeItem("googleAds_accounts");
    
    return true;
  } catch (error) {
    console.error("Error revoking access:", error);
    return true;
  }
};

export const fetchGoogleAdsAccounts = listGoogleAdsAccounts;

export const cleanupAllAccounts = async (): Promise<boolean> => {
  try {
    console.log("Starting complete cleanup of ALL Google Ads accounts");
    
    const token = await getAuthToken();
    
    if (!token) {
      console.warn("No auth token available, cannot proceed with account deletion");
      toast.error("Authentication required for account deletion");
      return false;
    }
    
    console.log("Removing all accounts from localStorage");
    localStorage.removeItem("googleAds_accounts");
    localStorage.removeItem("googleAds_account_id");
    
    const response = await supabase.functions.invoke("google-ads-manager", {
      body: { 
        action: "delete-all-accounts"
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log("Cleanup response from edge function:", response);
    
    if (response.error) {
      console.error("Error from Edge Function:", response.error);
      toast.error("Server error during cleanup operation");
      return false;
    } 
    
    if (response.data && response.data.success) {
      const removedCount = response.data.removedCount || 0;
      toast.success(`Successfully removed all ${removedCount} Google Ads accounts`);
      return true;
    } else {
      console.error("Error from API:", response.data?.error || "Unknown error");
      toast.error(response.data?.error || "Failed to remove accounts");
      return false;
    }
  } catch (error) {
    console.error("Error cleaning up accounts:", error);
    toast.error("Failed to clean up accounts");
    return false;
  }
};

export const googleAdsService = {
  initiateGoogleAuth,
  handleOAuthCallback,
  getGoogleAdsCredentials,
  fetchGoogleAdsMetrics,
  isGoogleAuthValid,
  refreshGoogleToken,
  listGoogleAdsAccounts,
  fetchGoogleAdsAccounts,
  revokeGoogleAccess,
  validateGoogleToken,
  cleanupAllAccounts
};

