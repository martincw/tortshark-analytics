
import { Campaign, AccountConnection } from "@/types/campaign";

// Google Ads API constants
// Updated to use the correct scope for Google Ads API
const GOOGLE_ADS_API_SCOPE = "https://www.googleapis.com/auth/adwords";
const GOOGLE_OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

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

// Updated to handle real API integration
export const handleGoogleAuthCallback = async (
  code: string,
  state?: string
): Promise<{ access_token: string; refresh_token: string; accounts?: AccountConnection[] } | null> => {
  try {
    console.log("Attempting to exchange code for tokens");
    console.log("Code received:", code.substring(0, 10) + "...");
    
    // Use server proxy to exchange code for tokens
    // This avoids exposing client secret in frontend code
    const tokenEndpoint = `${window.location.origin}/api/auth/google-token`;
    
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        code,
        redirectUri: `${window.location.origin}/auth/google/callback`
      })
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}));
      console.error("Token exchange failed:", tokenResponse.status, errorData);
      throw new Error(`Failed to exchange code: ${tokenResponse.statusText}`);
    }
    
    const tokenData = await tokenResponse.json();
    console.log("Received token data:", { 
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token
    });
    
    // After getting the token, fetch the accounts
    let accountData: AccountConnection[] = [];
    
    if (tokenData.access_token) {
      // Fetch Google Ads accounts with the new token
      accountData = await fetchGoogleAdsAccounts(tokenData.access_token);
    }
    
    return {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      accounts: accountData
    };
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    
    // We won't return fallback accounts anymore as we want real data
    // Instead, properly communicate the error
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

// Updated to use real API integration
export const fetchGoogleAdsAccounts = async (
  accessToken: string
): Promise<AccountConnection[]> => {
  try {
    // Call our server-side proxy to the Google Ads API
    const accountsEndpoint = `${window.location.origin}/api/google/accounts`;
    
    const response = await fetch(accountsEndpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Accounts fetch failed:", response.status, errorData);
      throw new Error(`Failed to fetch accounts: ${response.statusText}`);
    }
    
    const accountsData = await response.json();
    
    // Map the account data to our internal structure
    return accountsData.map((account: any) => ({
      id: account.id || `ga-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

// Fetch campaign data for a specific account
export const fetchCampaigns = async (
  accountId: string,
  accessToken: string,
  dateRange: { startDate: string; endDate: string }
): Promise<Campaign[]> => {
  try {
    // Call our server-side proxy to the Google Ads API
    const campaignsEndpoint = `${window.location.origin}/api/google/campaigns`;
    
    const response = await fetch(campaignsEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        accountId,
        dateRange
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Campaigns fetch failed:", response.status, errorData);
      throw new Error(`Failed to fetch campaigns: ${response.statusText}`);
    }
    
    const campaignsData = await response.json();
    return campaignsData;
    
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    throw error; // Let the error propagate so we don't silently fail
  }
};

// Synchronize account data
export const syncAccountData = async (
  accountId: string,
  accessToken: string
): Promise<boolean> => {
  try {
    // Call our server-side proxy to the Google Ads API
    const syncEndpoint = `${window.location.origin}/api/google/sync`;
    
    const response = await fetch(syncEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountId })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Account sync failed:", response.status, errorData);
      throw new Error(`Failed to sync account: ${response.statusText}`);
    }
    
    const result = await response.json();
    return result.success || false;
    
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
