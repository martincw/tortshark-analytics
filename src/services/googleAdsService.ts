
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DateRange, GoogleAdsMetrics } from "@/types/campaign";

// Store the developer token
const DEVELOPER_TOKEN = "Ngh3IukgQ3ovdkH3M0smUg";

// Project URL - updated for custom domain
const PROJECT_URL = "https://app.tortshark.com";

export interface GoogleAdsCredentials {
  customerId: string;
  accessToken: string;
  refreshToken?: string;
  developerToken: string;
  userEmail?: string;
}

// Helper function to get the supabase JWT token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.warn("Error getting auth token:", error);
    return null;
  }
}

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
        redirectUri: `${PROJECT_URL}/integrations`
      },
      headers
    }).catch(error => {
      console.error("Error calling Google OAuth function:", error);
      // More detailed network error handling
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
    console.log("Debug info:", response.data.debug);
    
    // Store the debug info in localStorage for troubleshooting
    localStorage.setItem("oauth_debug", JSON.stringify(response.data.debug));
    localStorage.setItem("oauth_ts", new Date().toISOString());
    
    // Create a ping test to check if Google is reachable
    try {
      const pingTest = await fetch("https://accounts.google.com/favicon.ico", {
        mode: 'no-cors',
        cache: 'no-cache',
      });
      console.log("Google accounts ping test result:", pingTest.type);
    } catch (pingError) {
      console.error("Unable to reach Google accounts:", pingError);
      // Still proceed with the redirect even if ping fails
    }
    
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
    // Get auth token, but don't fail if not available
    let headers = {};
    try {
      const token = await getAuthToken();
      if (token) {
        headers = { Authorization: `Bearer ${token}` };
      } else {
        console.warn("No auth token available, proceeding without authentication");
      }
    } catch (authError) {
      console.warn("Error getting auth token, proceeding without authentication:", authError);
    }
    
    console.log("Exchanging auth code for tokens...");
    
    // Call the Supabase edge function to exchange the code for tokens
    const response = await supabase.functions.invoke("google-oauth", {
      body: { 
        action: "callback",
        code,
        redirectUri: `${PROJECT_URL}/integrations`
      },
      headers
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
    
    // Store credentials in local storage for immediate use
    if (response.data.success) {
      localStorage.setItem("googleAds_access_token", response.data.accessToken);
      localStorage.setItem("googleAds_customer_id", response.data.customerId);
      
      if (response.data.userEmail) {
        localStorage.setItem("googleAds_user_email", response.data.userEmail);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    toast.error("Failed to complete Google authentication");
    throw error;
  }
};

export const getGoogleAdsCredentials = async (): Promise<GoogleAdsCredentials | null> => {
  try {
    // First check local storage for cached credentials
    const accessToken = localStorage.getItem("googleAds_access_token");
    const customerId = localStorage.getItem("googleAds_customer_id");
    const userEmail = localStorage.getItem("googleAds_user_email");
    
    if (accessToken && customerId) {
      return {
        accessToken,
        customerId,
        developerToken: DEVELOPER_TOKEN,
        userEmail: userEmail || undefined
      };
    }
    
    // If not in local storage, fetch from Supabase
    let headers = {};
    const token = await getAuthToken();
    
    if (token) {
      headers = { Authorization: `Bearer ${token}` };
    } else {
      console.warn("No auth token available, cannot fetch credentials from server");
      return null;
    }
    
    const response = await supabase.functions.invoke("google-oauth", {
      body: { action: "get-credentials" },
      headers
    });
    
    if (response.error || !response.data.success) {
      console.error("Error fetching Google Ads credentials:", response.error || response.data.error);
      return null;
    }
    
    // Cache credentials in local storage
    localStorage.setItem("googleAds_access_token", response.data.accessToken);
    localStorage.setItem("googleAds_customer_id", response.data.customerId);
    
    if (response.data.userEmail) {
      localStorage.setItem("googleAds_user_email", response.data.userEmail);
    }
    
    return {
      accessToken: response.data.accessToken,
      customerId: response.data.customerId,
      developerToken: response.data.developerToken,
      userEmail: response.data.userEmail
    };
  } catch (error) {
    console.error("Error getting Google Ads credentials:", error);
    return null;
  }
};

export const fetchGoogleAdsMetrics = async (
  dateRange: DateRange,
  customerId?: string
): Promise<GoogleAdsMetrics[] | null> => {
  try {
    // Get credentials
    const credentials = await getGoogleAdsCredentials();
    if (!credentials) {
      toast.error("Google Ads credentials not found");
      return null;
    }
    
    // Use provided customerId or default to the one from credentials
    const customerIdToUse = customerId || credentials.customerId;
    
    // Call the Supabase edge function to get the metrics from Google Ads API
    const token = await getAuthToken();
    if (!token) {
      toast.error("Authentication token not found");
      return null;
    }
    
    const response = await supabase.functions.invoke("google-ads-data", {
      body: { 
        action: "get-metrics",
        customerId: customerIdToUse,
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

export const fetchGoogleAdsAccounts = async (): Promise<any[]> => {
  try {
    // Get Google Ads token
    const credentials = await getGoogleAdsCredentials();
    if (!credentials) {
      console.error("No Google Ads credentials found");
      return [];
    }
    
    // Get auth token
    const token = await getAuthToken();
    if (!token) {
      console.error("No auth token available");
      return [];
    }
    
    // Call the Supabase edge function to get the accounts from Google Ads API
    console.log("Fetching Google Ads accounts");
    const response = await supabase.functions.invoke("google-ads-data", {
      body: { 
        action: "get-accounts"
      },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.error || !response.data.success) {
      console.error("Error fetching Google Ads accounts:", response.error || response.data.error);
      return [];
    }
    
    console.log("Received Google Ads accounts:", response.data.accounts);
    
    return response.data.accounts || [];
  } catch (error) {
    console.error("Error fetching Google Ads accounts:", error);
    return [];
  }
};

export const isGoogleAuthValid = async (): Promise<boolean> => {
  try {
    const credentials = await getGoogleAdsCredentials();
    return !!credentials;
  } catch (error) {
    console.error("Error checking Google auth validity:", error);
    return false;
  }
};

export const clearGoogleAdsAuth = () => {
  localStorage.removeItem("googleAds_access_token");
  localStorage.removeItem("googleAds_customer_id");
  localStorage.removeItem("googleAds_user_email");
};

export const revokeGoogleAccess = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return false;
    }
    
    const response = await supabase.functions.invoke("google-oauth", {
      body: { action: "revoke" },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    // Clear local storage regardless of the response
    clearGoogleAdsAuth();
    
    if (response.error) {
      console.error("Error revoking access:", response.error);
      return false;
    }
    
    return response.data.success;
  } catch (error) {
    console.error("Error revoking access:", error);
    // Still clear local storage even if the API call fails
    clearGoogleAdsAuth();
    return false;
  }
};

export const refreshGoogleToken = async (): Promise<boolean> => {
  try {
    const token = await getAuthToken();
    
    if (!token) {
      return false;
    }
    
    const response = await supabase.functions.invoke("google-oauth", {
      body: { action: "refresh-token" },
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.error || !response.data.success) {
      console.error("Error refreshing token:", response.error || response.data.error);
      return false;
    }
    
    // Update the stored access token
    localStorage.setItem("googleAds_access_token", response.data.accessToken);
    
    return true;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
};

// Create an object with all the exported functions
export const googleAdsService = {
  initiateGoogleAuth,
  handleOAuthCallback,
  getGoogleAdsCredentials,
  fetchGoogleAdsMetrics,
  fetchGoogleAdsAccounts,
  isGoogleAuthValid,
  clearGoogleAdsAuth,
  revokeGoogleAccess,
  refreshGoogleToken
};
