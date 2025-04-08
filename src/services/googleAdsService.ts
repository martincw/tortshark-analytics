import { Campaign, AccountConnection } from "@/types/campaign";
import { supabase, SUPABASE_PROJECT_URL } from "@/integrations/supabase/client";

// Google Ads API constants
// Updated to use the correct scope for Google Ads API
const GOOGLE_ADS_API_SCOPE = "https://www.googleapis.com/auth/adwords";
const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

// Hard-coded client ID for immediate testing
// In production, this should come from environment variables
const GOOGLE_CLIENT_ID = "588217915343-e9ie84prjmlg53ofg9bhv670pas52n18.apps.googleusercontent.com";

// Get Google Client ID from environment variable or fallback to hard-coded value
const getGoogleClientId = () => {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID;
};

// Get redirect URL based on current environment
const getRedirectUri = () => {
  const redirectUri = `${window.location.origin}/auth/google/callback`;
  return encodeURIComponent(redirectUri);
};

// Generate Google OAuth URL with additional debugging
export const getGoogleAuthUrl = (): string => {
  const clientId = getGoogleClientId();
  
  if (!clientId) {
    throw new Error("Google Client ID is not configured. Please set the VITE_GOOGLE_CLIENT_ID environment variable.");
  }
  
  // Create OAuth URL with properly encoded parameters
  const redirectUri = getRedirectUri();
  const scope = encodeURIComponent(GOOGLE_ADS_API_SCOPE);
  
  // Add state parameter for CSRF protection and debugging
  const state = encodeURIComponent(JSON.stringify({
    timestamp: Date.now(),
    origin: window.location.origin,
    random: Math.random().toString(36).substring(2, 15)
  }));
  
  // Add prompt=consent to force consent screen and access_type=offline for refresh token
  // Add additional parameter to improve compatibility
  const url = `${GOOGLE_OAUTH_URL}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}&include_granted_scopes=true`;
  
  console.log("Generated OAuth URL:", url);
  
  return url;
};

// Open Google OAuth in a popup window with improved error handling
export const openGoogleAuthPopup = (): Window | null => {
  try {
    const url = getGoogleAuthUrl();
    // Open popup with specific dimensions
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      url,
      "googleAuthPopup",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );
    
    if (!popup) {
      console.error("Popup was blocked by the browser");
      throw new Error("Popup was blocked. Please allow popups for this site.");
    }
    
    // Monitor popup
    const checkPopupClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopupClosed);
        
        // Check if authentication succeeded
        const tokens = getStoredAuthTokens();
        if (!tokens?.access_token) {
          // Dispatch authentication failure event
          window.dispatchEvent(new CustomEvent('googleAuthFailure', { 
            detail: { error: 'auth_incomplete', message: 'Authentication was not completed' } 
          }));
        }
      }
    }, 500);
    
    return popup;
  } catch (error) {
    console.error("Error opening Google Auth popup:", error);
    return null;
  }
};

// Updated to use Supabase Edge Function for token exchange
export const handleGoogleAuthCallback = async (
  code: string,
  state?: string
): Promise<{ access_token: string; refresh_token: string; accounts?: AccountConnection[] } | null> => {
  try {
    console.log("Attempting to exchange code for tokens via Edge Function");
    console.log("Code received:", code.substring(0, 10) + "...");
    
    // Use our Supabase Edge Function to exchange code for tokens
    const { data: tokenData, error } = await supabase.functions.invoke("google-token", {
      method: 'POST',
      body: { 
        code,
        redirectUri: `${window.location.origin}/auth/google/callback`
      }
    });
    
    if (error) {
      console.error("Token exchange failed:", error);
      throw new Error(`Failed to exchange code: ${error.message}`);
    }
    
    if (!tokenData) {
      throw new Error("No token data received from Edge Function");
    }
    
    console.log("Received token data:", { 
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
    
    // After getting the token, fetch the accounts
    let accountData: AccountConnection[] = [];
    
    if (tokenData.access_token) {
      try {
        // Fetch Google Ads accounts with the new token
        accountData = await fetchGoogleAdsAccounts(tokenData.access_token);
      } catch (error) {
        console.error("Error fetching Google Ads accounts:", error);
        
        // Check if the error is related to missing developer token
        if (error instanceof Error && error.message.includes("developer-token")) {
          toast.error("Missing Google Ads Developer Token. Please check Supabase Edge Function settings.");
        }
      }
    }
    
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      accounts: accountData
    };
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    return null;
  }
};

// Parse error message from OAuth error response
export const parseOAuthError = (errorCode: string): string => {
  const errorMessages: Record<string, string> = {
    "access_denied": "User denied access to their Google account",
    "invalid_request": "The OAuth request was invalid or malformed",
    "invalid_client": "Client authentication failed. Check your Client ID",
    "invalid_grant": "The authorization code is invalid or expired",
    "unauthorized_client": "This client is not authorized to use this grant type",
    "unsupported_grant_type": "The requested grant type is not supported",
    "invalid_scope": "The requested scope is invalid or unknown",
    "redirect_uri_mismatch": "The redirect URI does not match the one registered in Google Cloud Console",
    "server_error": "Google authentication server error",
    "temporarily_unavailable": "Google authentication server is temporarily unavailable"
  };
  
  return errorMessages[errorCode] || `Authentication error: ${errorCode}`;
};

// Updated to use Supabase Edge Function
export const fetchGoogleAdsAccounts = async (
  accessToken: string
): Promise<AccountConnection[]> => {
  try {
    // Call our Edge Function instead of direct Google API
    const { data: accountsData, error } = await supabase.functions.invoke("google-accounts", {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (error) {
      console.error("Accounts fetch failed:", error);
      
      // Check if the error might be related to missing developer token
      if (error.message && error.message.includes("developer-token")) {
        toast.error("Google Ads Developer Token is missing. Please add it to the Supabase Edge Function secrets.");
        throw new Error("developer-token is missing or invalid");
      }
      
      throw new Error(`Failed to fetch accounts: ${error.message}`);
    }
    
    if (!accountsData) {
      throw new Error("No accounts data received from Edge Function");
    }
    
    // If the response is an error object with details
    if (accountsData.error) {
      console.error("Google Ads API error:", accountsData);
      toast.error(accountsData.message || "Failed to fetch Google Ads accounts");
      throw new Error(accountsData.error);
    }
    
    // Map the account data to our internal structure
    return accountsData.map((account: any) => ({
      id: account.id, // Use the fixed ID from the response
      name: account.name || "Unnamed Account",
      platform: "google" as const,
      isConnected: true,
      lastSynced: new Date().toISOString()
    }));
    
  } catch (error) {
    console.error("Error fetching Google Ads accounts:", error);
    throw error; // Let the error propagate so we don't silently fail
  }
};

// Updated to use Supabase Edge Function
export const fetchCampaigns = async (
  accountId: string,
  accessToken: string,
  dateRange: { startDate: string; endDate: string }
): Promise<Campaign[]> => {
  try {
    // Call our Edge Function instead of direct Google API
    const { data: campaignsData, error } = await supabase.functions.invoke("google-campaigns", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: { 
        accountId,
        dateRange
      }
    });
    
    if (error) {
      console.error("Campaigns fetch failed:", error);
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }
    
    if (!campaignsData) {
      throw new Error("No campaigns data received from Edge Function");
    }
    
    return campaignsData;
    
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    throw error; // Let the error propagate so we don't silently fail
  }
};

// Updated to use Supabase Edge Function
export const syncAccountData = async (
  accountId: string,
  accessToken: string
): Promise<boolean> => {
  try {
    // Call our Edge Function instead of direct Google API
    const { data, error } = await supabase.functions.invoke("google-sync", {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: { accountId }
    });
    
    if (error) {
      console.error("Account sync failed:", error);
      throw new Error(`Failed to sync account: ${error.message}`);
    }
    
    return data?.success || false;
    
  } catch (error) {
    console.error("Error syncing account data:", error);
    return false;
  }
};

// Store auth tokens securely with improved event handling
export const storeAuthTokens = (tokens: { 
  access_token: string; 
  refresh_token: string;
  accountId?: string;
  accounts?: AccountConnection[];
}) => {
  const storageItem = {
    ...tokens,
    timestamp: Date.now(), // Add timestamp for checking token freshness
  };
  
  localStorage.setItem("googleAdsTokens", JSON.stringify(storageItem));
  
  // If we have accounts, also store them separately for easy access
  if (tokens.accounts && tokens.accounts.length > 0) {
    localStorage.setItem("googleAdsAccounts", JSON.stringify(tokens.accounts));
    console.log("Stored Google Ads accounts:", tokens.accounts);
    
    // Dispatch a custom event that we can listen for in other components
    window.dispatchEvent(new CustomEvent('googleAuthSuccess', { 
      detail: { accounts: tokens.accounts }
    }));
  } else {
    // Even if no accounts are found, we still dispatch success (with empty accounts array)
    // This ensures the UI updates appropriately
    window.dispatchEvent(new CustomEvent('googleAuthSuccess', { 
      detail: { accounts: [] }
    }));
  }
};

// Retrieve stored auth tokens
export const getStoredAuthTokens = () => {
  const tokens = localStorage.getItem("googleAdsTokens");
  if (!tokens) return null;
  
  const parsedTokens = JSON.parse(tokens);
  return parsedTokens;
};

// Retrieve stored Google Ads accounts
export const getStoredAccounts = (): AccountConnection[] => {
  // First try to get accounts from dedicated storage
  const accountsStr = localStorage.getItem("googleAdsAccounts");
  if (accountsStr) {
    try {
      const accounts = JSON.parse(accountsStr);
      if (Array.isArray(accounts) && accounts.length > 0) {
        return accounts;
      }
    } catch (e) {
      console.error("Error parsing stored accounts:", e);
    }
  }
  
  // Fall back to accounts in the tokens
  const tokens = getStoredAuthTokens();
  return tokens?.accounts || [];
};

// Check if ad platform is connected - returns true if authenticated
// or if we're allowing manual campaigns (which we now are)
export const isPlatformConnected = (platform: string = "any"): boolean => {
  // Always return true since we now allow manual campaign creation
  return true;
};

// Clear stored auth tokens (for logout)
export const clearAuthTokens = () => {
  localStorage.removeItem("googleAdsTokens");
  localStorage.removeItem("googleAdsAccounts");
  // Dispatch event to update UI
  window.dispatchEvent(new CustomEvent('googleAuthLogout'));
};
