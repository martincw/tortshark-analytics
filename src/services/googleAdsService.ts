import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AccountConnection, DateRange, GoogleAdsMetrics } from "@/types/campaign";

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

export const initiateGoogleAuth = async () => {
  try {
    let headers = {};
    const token = await getAuthToken();
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    } else {
      console.warn("No auth token available, proceeding without authentication");
    }
    
    const userEmail = localStorage.getItem("userEmail") || "";
    
    console.log("Initiating Google OAuth flow...");
    
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
      toast({
        title: "Error",
        description: "Failed to initiate Google authentication",
        variant: "destructive",
      });
      throw new Error(`Error initiating Google OAuth: ${response.error.message}`);
    }
    
    console.log("OAuth response:", response.data);
    console.log("OAuth URL:", response.data.url);
    
    localStorage.setItem("oauth_debug", JSON.stringify(response.data.debug));
    localStorage.setItem("oauth_ts", new Date().toISOString());
    
    window.location.href = response.data.url;
  } catch (error) {
    console.error("Error initiating Google auth:", error);
    toast({
      title: "Error",
      description: error.message || "Failed to initiate Google authentication",
      variant: "destructive",
    });
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
    const response = await supabase.functions.invoke("google-oauth", {
      body: { 
        action: "callback",
        code
      }
    });
    
    console.log("Edge function response:", response);
    
    if (response.error) {
      console.error("Error handling OAuth callback:", response.error);
      toast({
        title: "Authentication Failed",
        description: "Failed to complete Google authentication",
        variant: "destructive",
      });
      throw new Error(`Error exchanging code for tokens: ${response.error.message}`);
    }
    
    localStorage.setItem("oauth_callback_response", JSON.stringify(response.data));
    
    window.history.replaceState({}, document.title, window.location.pathname);
    
    if (response.data.success) {
      localStorage.setItem("googleAds_access_token", response.data.accessToken);
      localStorage.setItem("googleAds_refresh_token", response.data.refreshToken);
      localStorage.setItem("googleAds_token_expiry", response.data.expiry_date.toString());
      localStorage.setItem("userEmail", response.data.userEmail);
      
      if (response.data.accounts && response.data.accounts.length > 0) {
        localStorage.setItem("googleAds_accounts", JSON.stringify(response.data.accounts));
        localStorage.setItem("googleAds_account_id", response.data.accounts[0].id);
      }
      
      if (response.data.warning) {
        console.warn("Warning from Google Ads API:", response.data.warning);
      }
      
      toast({
        title: "Success",
        description: "Successfully connected to Google Ads",
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    toast({
      title: "Authentication Failed",
      description: "Failed to complete Google authentication",
      variant: "destructive",
    });
    throw error;
  }
};

export const getGoogleAdsCredentials = async (): Promise<any | null> => {
  try {
    const accessToken = localStorage.getItem("googleAds_access_token");
    const accountId = localStorage.getItem("googleAds_account_id");
    const expiry = localStorage.getItem("googleAds_token_expiry");
    
    if (!accessToken) {
      return null;
    }
    
    if (expiry && new Date(Number(expiry)) <= new Date()) {
      const refreshed = await refreshGoogleToken();
      if (!refreshed) {
        return null;
      }
    }
    
    return {
      accessToken,
      customerId: accountId,
      developerToken: GOOGLE_CONFIG.developerToken,
      userEmail: localStorage.getItem("userEmail")
    };
  } catch (error) {
    console.error("Error getting Google Ads credentials:", error);
    return null;
  }
};

export const listGoogleAdsAccounts = async (): Promise<AccountConnection[]> => {
  try {
    const cachedAccounts = localStorage.getItem("googleAds_accounts");
    
    if (cachedAccounts) {
      try {
        const accounts = JSON.parse(cachedAccounts);
        return accounts.map((account: any) => ({
          id: account.id,
          name: account.name || `Google Ads Account ${account.id}`,
          platform: "google",
          isConnected: true,
          lastSynced: new Date().toISOString(),
          customerId: account.id
        }));
      } catch (parseError) {
        console.error("Error parsing cached accounts:", parseError);
      }
    }
    
    const accessToken = localStorage.getItem("googleAds_access_token");
    
    if (!accessToken) {
      toast({
        title: "Error",
        description: "Google Ads access token not found",
        variant: "destructive",
      });
      return [];
    }
    
    console.log("Attempting to fetch Google Ads accounts");
    
    const response = await supabase.functions.invoke("google-ads-data", {
      body: { 
        action: "get-accounts",
        accessToken
      }
    });
    
    console.log("Account listing response:", response);
    
    if (response.error) {
      console.error("Error from Edge Function:", response.error);
      toast({
        title: "Error",
        description: "Failed to fetch Google Ads accounts",
        variant: "destructive",
      });
      return [];
    }
    
    if (!response.data || !response.data.success) {
      console.error("Error from API:", response.data?.error || "Unknown error");
      toast({
        title: "Error",
        description: response.data?.error || "Failed to fetch Google Ads accounts",
        variant: "destructive",
      });
      return [];
    }
    
    localStorage.setItem("googleAds_accounts", JSON.stringify(response.data.accounts));
    
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
    toast({
      title: "Error",
      description: "Failed to list Google Ads accounts",
      variant: "destructive",
    });
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
      toast({
        title: "Error",
        description: "Google Ads credentials not found",
        variant: "destructive",
      });
      return null;
    }
    
    const token = await getAuthToken();
    if (!token) {
      toast({
        title: "Error",
        description: "Authentication token not found",
        variant: "destructive",
      });
      return null;
    }
    
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
      toast({
        title: "Error",
        description: "Failed to fetch Google Ads metrics",
        variant: "destructive",
      });
      return null;
    }
    
    return response.data.metrics;
  } catch (error) {
    console.error("Error fetching Google Ads metrics:", error);
    toast({
      title: "Error",
      description: "Failed to fetch Google Ads metrics",
      variant: "destructive",
    });
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
    const accessToken = localStorage.getItem("googleAds_access_token");
    const expiry = localStorage.getItem("googleAds_token_expiry");
    
    if (!accessToken) {
      return false;
    }
    
    if (expiry && new Date(Number(expiry)) <= new Date()) {
      const refreshed = await refreshGoogleToken();
      return refreshed;
    }
    
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
    
    if (accessToken) {
      console.log("Calling Google OAuth revocation endpoint");
      
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
    }
    
    localStorage.removeItem("googleAds_access_token");
    localStorage.removeItem("googleAds_refresh_token");
    localStorage.removeItem("googleAds_token_expiry");
    localStorage.removeItem("googleAds_account_id");
    
    return true;
  } catch (error) {
    console.error("Error revoking access:", error);
    return true;
  }
};

export const fetchGoogleAdsAccounts = listGoogleAdsAccounts;

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
  validateGoogleToken
};
