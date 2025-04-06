
import { Campaign, AccountConnection } from "@/types/campaign";

// Google Ads API constants
const GOOGLE_ADS_API_SCOPE = "https://www.googleapis.com/auth/adwords.readonly";
const GOOGLE_ADS_API_BASE_URL = "https://googleads.googleapis.com";
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

// Generate Google OAuth URL
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
  
  // Use popup parameter to prevent issues with iframe blocking
  const url = `${GOOGLE_OAUTH_URL}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${state}`;
  
  console.log("Generated OAuth URL:", url);
  console.log("Google OAuth parameters:", {
    clientId,
    redirectUri: decodeURIComponent(redirectUri),
    scope: GOOGLE_ADS_API_SCOPE,
    state: decodeURIComponent(state),
    fullUrl: url
  });

  return url;
};

// Open Google OAuth in a popup window
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
    
    return popup;
  } catch (error) {
    console.error("Error opening Google Auth popup:", error);
    return null;
  }
};

// Handle OAuth callback and exchange code for tokens
export const handleGoogleAuthCallback = async (
  code: string,
  state?: string
): Promise<{ access_token: string; refresh_token: string; accounts?: AccountConnection[] } | null> => {
  try {
    console.log("Attempting to exchange code for tokens");
    console.log("Code received:", code.substring(0, 10) + "...");
    console.log("State received:", state || "No state parameter");
    
    // Parse state parameter if available
    let stateObj = null;
    if (state) {
      try {
        stateObj = JSON.parse(decodeURIComponent(state));
        console.log("Decoded state:", stateObj);
      } catch (e) {
        console.warn("Could not parse state parameter:", e);
      }
    }
    
    // In a real implementation, this would make a server call to exchange the code
    // for tokens, as client secret should never be exposed in the frontend
    
    // Simulating token exchange - in production this would be a backend endpoint
    console.log("Exchanging auth code for tokens", code);
    
    // Mock tokens and mock accounts
    const mockAccounts: AccountConnection[] = [
      {
        id: "ga-" + Date.now(),
        name: "Demo Google Ads Account",
        platform: "google",
        isConnected: true,
        lastSynced: new Date().toISOString()
      }
    ];
    
    // Return mock tokens for now - this would typically come from a backend service
    // that handles the OAuth token exchange securely, also include mock accounts
    return {
      access_token: "mock_access_token_" + Date.now(),
      refresh_token: "mock_refresh_token_" + Date.now(),
      accounts: mockAccounts
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

// Fetch user's Google Ads accounts
export const fetchGoogleAdsAccounts = async (
  accessToken: string
): Promise<AccountConnection[]> => {
  try {
    // In a real implementation, this would call the Google Ads API
    console.log("Fetching Google Ads accounts with token:", accessToken);
    
    // Return mock accounts for demonstration purposes
    return [
      {
        id: "ga-" + Date.now(),
        name: "Demo Google Ads Account",
        platform: "google",
        isConnected: true,
        lastSynced: new Date().toISOString()
      }
    ];
  } catch (error) {
    console.error("Error fetching Google Ads accounts:", error);
    return [];
  }
};

// Fetch campaign data for a specific account
export const fetchCampaigns = async (
  accountId: string,
  accessToken: string,
  dateRange: { startDate: string; endDate: string }
): Promise<Campaign[]> => {
  try {
    // In a real implementation, this would call the Google Ads API
    console.log("Fetching campaigns for account:", accountId);
    console.log("Date range:", dateRange);
    
    // Return empty array for now - would be populated from API response
    return [];
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return [];
  }
};

// Synchronize account data
export const syncAccountData = async (
  accountId: string,
  accessToken: string
): Promise<boolean> => {
  try {
    // In a real implementation, this would call the Google Ads API
    console.log("Syncing data for account:", accountId);
    
    // Return success for now
    return true;
  } catch (error) {
    console.error("Error syncing account data:", error);
    return false;
  }
};

// Store auth tokens securely
// In a real-world application, this should be handled by a backend service
export const storeAuthTokens = (tokens: { 
  access_token: string; 
  refresh_token: string;
  accountId?: string;
  accounts?: AccountConnection[];
}) => {
  localStorage.setItem("googleAdsTokens", JSON.stringify(tokens));
};

// Retrieve stored auth tokens
export const getStoredAuthTokens = () => {
  const tokens = localStorage.getItem("googleAdsTokens");
  return tokens ? JSON.parse(tokens) : null;
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
};
