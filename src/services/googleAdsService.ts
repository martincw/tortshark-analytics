import { toast } from "sonner";

// Google Ads API OAuth credentials
const GOOGLE_ADS_API_SCOPE = "https://www.googleapis.com/auth/adwords";
const REDIRECT_URI = window.location.origin + "/integrations";

// In Vite, environment variables are accessed via import.meta.env
// and need to be prefixed with VITE_
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "your-google-client-id.apps.googleusercontent.com";

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
  // This would use your actual client ID from Google Cloud Console
  const clientId = GOOGLE_CLIENT_ID;
  
  // This is the actual Google OAuth authorization endpoint
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  
  // Set OAuth parameters
  authUrl.searchParams.append("client_id", clientId);
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", GOOGLE_ADS_API_SCOPE);
  authUrl.searchParams.append("access_type", "offline");
  authUrl.searchParams.append("prompt", "consent");
  
  console.log("Redirecting to Google OAuth:", authUrl.toString());
  
  // Perform actual redirection to Google OAuth
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
  return await exchangeCodeForTokens(code);
};

const exchangeCodeForTokens = async (code: string) => {
  try {
    console.log("Exchanging auth code for tokens...");
    
    // In a real implementation, you would likely use a backend server
    // to handle the token exchange for security reasons
    // Here's the frontend approach for demonstration
    const tokenEndpoint = "https://oauth2.googleapis.com/token";
    
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        // Note: In production, you'd want to use a backend to protect your client secret
        // client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code"
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange code: ${response.status} ${errorText}`);
    }
    
    const tokenResponse = await response.json();
    
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
  // In production, you would store these securely
  // For demo, we'll use localStorage (not secure for production)
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
    
    // This is a simplified approach. In production, you would:
    // 1. Use a backend server to make this request with your developer token
    // 2. Properly implement the Google Ads API
    
    // Simplified approach to get the customer ID
    // You would replace this with actual Google Ads API call
    const mockCustomerId = "123-456-7890"; // Replace with real API call
    
    localStorage.setItem("googleAds_customer_id", mockCustomerId);
    
    toast.success("Successfully connected to Google Ads");
    return mockCustomerId;
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
    developerToken: "Ngh3IukgQ3ovdkH3M0smUg" // This would be your actual developer token in production
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
    return;
  }
  
  try {
    // In production, this would call Google's revocation endpoint
    // const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/x-www-form-urlencoded" }
    // });
    
    console.log("Revoking Google access token...");
    
    // Clear local storage
    clearGoogleAdsAuth();
    
    return true;
  } catch (error) {
    console.error("Error revoking access:", error);
    return false;
  }
};
