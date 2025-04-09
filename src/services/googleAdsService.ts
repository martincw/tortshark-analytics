
import { toast } from "sonner";

// Google Ads API OAuth credentials
const GOOGLE_ADS_API_SCOPE = "https://www.googleapis.com/auth/adwords";
const REDIRECT_URI = window.location.origin + "/integrations";

// Access environment variables in Vite
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id.apps.googleusercontent.com";

// Store the developer token
const DEVELOPER_TOKEN = "Ngh3IukgQ3ovdkH3M0smUg";

interface GoogleAuthResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface GoogleAdsCredentials {
  customerId: string;
  accessToken: string;
  refreshToken?: string;
  developerToken: string;
}

export const initiateGoogleAuth = () => {
  const clientId = GOOGLE_CLIENT_ID;
  
  // Real Google OAuth authorization endpoint
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  
  // Set OAuth parameters
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", GOOGLE_ADS_API_SCOPE);
  authUrl.searchParams.append("access_type", "offline");
  authUrl.searchParams.append("prompt", "consent");
  
  console.log("Redirecting to Google OAuth:", authUrl.toString());
  
  // Actual redirect to Google OAuth
  window.location.href = authUrl.toString();
};

export const handleOAuthCallback = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  
  if (!code) {
    console.error("No auth code found in URL");
    return false;
  }
  
  console.log("Received auth code from Google");
  
  // Clear code from URL to prevent repeated processing
  window.history.replaceState({}, document.title, window.location.pathname);
  
  return await exchangeCodeForTokens(code);
};

const exchangeCodeForTokens = async (code: string) => {
  try {
    console.log("Exchanging auth code for tokens...");
    
    // Token exchange endpoint
    const tokenEndpoint = "https://oauth2.googleapis.com/token";
    
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code"
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange code: ${response.status} ${errorText}`);
    }
    
    const tokenResponse: GoogleAuthResponse = await response.json();
    
    // Store the tokens
    storeGoogleAdsTokens(tokenResponse);
    
    // Fetch the customer ID
    await fetchGoogleAdsCustomerId(tokenResponse.access_token);
    
    return true;
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    toast.error("Failed to complete Google authentication");
    return false;
  }
};

const storeGoogleAdsTokens = (tokenResponse: GoogleAuthResponse) => {
  localStorage.setItem("googleAds_access_token", tokenResponse.access_token);
  if (tokenResponse.refresh_token) {
    localStorage.setItem("googleAds_refresh_token", tokenResponse.refresh_token);
  }
  
  const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
  localStorage.setItem("googleAds_expires_at", expiresAt.toString());
};

const fetchGoogleAdsCustomerId = async (accessToken: string) => {
  try {
    console.log("Fetching Google Ads customer ID...");
    
    // In a real implementation, we would call the Google Ads API
    // Since we can't make direct API calls from the frontend due to CORS and security,
    // this would typically be done through a backend service
    
    // For now, we'll use a placeholder customer ID
    // In a production app, you would implement a backend endpoint to handle this
    const customerId = "123-456-7890";
    
    localStorage.setItem("googleAds_customer_id", customerId);
    
    toast.success("Successfully connected to Google Ads");
    return customerId;
  } catch (error) {
    console.error("Error fetching customer ID:", error);
    toast.error("Failed to fetch Google Ads account information");
    throw error;
  }
};

export const getGoogleAdsCredentials = (): GoogleAdsCredentials | null => {
  const accessToken = localStorage.getItem("googleAds_access_token");
  const refreshToken = localStorage.getItem("googleAds_refresh_token");
  const customerId = localStorage.getItem("googleAds_customer_id");
  
  if (!accessToken || !customerId) {
    return null;
  }
  
  return {
    accessToken,
    refreshToken: refreshToken || undefined,
    customerId,
    developerToken: DEVELOPER_TOKEN
  };
};

export const isGoogleAuthValid = (): boolean => {
  const expiresAt = localStorage.getItem("googleAds_expires_at");
  const accessToken = localStorage.getItem("googleAds_access_token");
  
  if (!expiresAt || !accessToken) {
    return false;
  }
  
  // Check if token is expired
  const expiryTime = parseInt(expiresAt, 10);
  const isExpired = Date.now() > expiryTime;
  
  return !isExpired;
};

export const clearGoogleAdsAuth = () => {
  localStorage.removeItem("googleAds_access_token");
  localStorage.removeItem("googleAds_refresh_token");
  localStorage.removeItem("googleAds_expires_at");
  localStorage.removeItem("googleAds_customer_id");
};

export const revokeGoogleAccess = async () => {
  const accessToken = localStorage.getItem("googleAds_access_token");
  
  if (!accessToken) {
    return false;
  }
  
  try {
    // Call Google's revocation endpoint
    const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    
    // Clear local storage regardless of the response
    clearGoogleAdsAuth();
    
    return response.ok;
  } catch (error) {
    console.error("Error revoking access:", error);
    // Still clear local storage even if the API call fails
    clearGoogleAdsAuth();
    return false;
  }
};

// Function to refresh the token when it expires
export const refreshGoogleToken = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem("googleAds_refresh_token");
  
  if (!refreshToken) {
    return false;
  }
  
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.status}`);
    }
    
    const tokenResponse: GoogleAuthResponse = await response.json();
    
    // Store the new access token
    localStorage.setItem("googleAds_access_token", tokenResponse.access_token);
    
    const expiresAt = Date.now() + (tokenResponse.expires_in * 1000);
    localStorage.setItem("googleAds_expires_at", expiresAt.toString());
    
    return true;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return false;
  }
};
