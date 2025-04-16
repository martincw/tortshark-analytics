import { supabase } from "@/integrations/supabase/client";
import type { GoogleAdsMetrics } from "@/types/campaign";
import type { DateRange } from "@/contexts/CampaignContext";

// Helper function to check if an object is empty
const isEmptyObject = (obj: Record<string, any>) => {
  return Object.keys(obj).length === 0;
};

// Initialize Google Ads configuration
export const GOOGLE_CONFIG = {
  redirectUri: 'https://app.tortshark.com/integrations'
};

/**
 * Initiates the Google OAuth flow
 */
export const initiateGoogleAuth = async (userEmail?: string) => {
  try {
    console.log("Initiating Google Auth...");
    
    const response = await supabase.functions.invoke("google-ads", {
      body: { 
        action: "auth",
        email: userEmail
      }
    });

    if (!response.data?.url) {
      console.error("No authorization URL received:", response);
      throw new Error('No authorization URL received');
    }

    return response.data;
  } catch (error) {
    console.error('Error initiating Google Auth:', error);
    throw error;
  }
};

/**
 * Handles the OAuth callback after Google redirects back
 */
export const handleOAuthCallback = async () => {
  try {
    // Get the authorization code from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) {
      throw new Error('No authorization code received');
    }
    
    console.log("Processing OAuth callback with code");
    
    const response = await supabase.functions.invoke("google-ads", {
      body: { 
        action: "callback",
        code
      }
    });

    if (!response.data?.success) {
      console.error("OAuth callback failed:", response);
      throw new Error(response.data?.error || 'Failed to process OAuth callback');
    }

    return true;
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    throw error;
  }
};

/**
 * Fetches Google Ads accounts for the current user
 */
export const listGoogleAdsAccounts = async () => {
  try {
    console.log("Fetching Google Ads accounts...");
    
    const response = await supabase.functions.invoke("google-ads", {
      body: { action: "accounts" }
    });

    if (!response.data?.success) {
      console.error("Failed to fetch Google Ads accounts:", response);
      throw new Error(response.data?.error || 'Failed to fetch Google Ads accounts');
    }

    return response.data.accounts || [];
  } catch (error) {
    console.error('Error fetching Google Ads accounts:', error);
    throw error;
  }
};

/**
 * Fetches Google Ads metrics for a specific account and date range
 */
export const fetchGoogleAdsMetrics = async (
  customerId: string,
  dateRange: DateRange
): Promise<GoogleAdsMetrics[]> => {
  try {
    if (!customerId) {
      throw new Error("Customer ID is required");
    }
    
    const { startDate, endDate } = dateRange;
    if (!startDate || !endDate) {
      throw new Error("Start and end dates are required");
    }
    
    console.log(`Fetching Google Ads metrics for customer ${customerId} from ${startDate} to ${endDate}`);
    
    const formattedStartDate = startDate.split('T')[0];
    const formattedEndDate = endDate.split('T')[0];
    
    const response = await supabase.functions.invoke("google-ads", {
      body: { action: "metrics" },
      query: {
        customer_id: customerId,
        start_date: formattedStartDate,
        end_date: formattedEndDate
      }
    });

    if (!response.data?.success) {
      console.error("Failed to fetch Google Ads metrics:", response);
      throw new Error(response.data?.error || 'Failed to fetch Google Ads metrics');
    }

    return response.data.metrics || [];
  } catch (error) {
    console.error('Error fetching Google Ads metrics:', error);
    throw error;
  }
};

/**
 * Checks if Google Ads authentication is valid
 */
export const isGoogleAuthValid = async (): Promise<boolean> => {
  try {
    // Try to fetch accounts as a validation test
    const accounts = await listGoogleAdsAccounts();
    return Array.isArray(accounts) && accounts.length > 0;
  } catch (error) {
    console.warn('Google Ads authentication is not valid:', error);
    return false;
  }
};

/**
 * Gets Google Ads credentials (customerId, developerToken) for API calls
 */
export const getGoogleAdsCredentials = async () => {
  try {
    // First try to get locally stored values
    const localCustomerId = localStorage.getItem("googleAds_customer_id");
    const localDeveloperToken = localStorage.getItem("googleAds_developer_token");
    
    if (localCustomerId && localDeveloperToken) {
      return {
        customerId: localCustomerId,
        developerToken: localDeveloperToken,
        source: 'localStorage'
      };
    }
    
    // If not found locally, try to get from backend
    const accounts = await listGoogleAdsAccounts();
    
    if (Array.isArray(accounts) && accounts.length > 0) {
      // Find the first non-manager account
      const account = accounts.find(acc => !acc.manager) || accounts[0];
      
      // Store for future use
      localStorage.setItem("googleAds_customer_id", account.id);
      
      return {
        customerId: account.id,
        developerToken: "GOOGLE_ADS_DEVELOPER_TOKEN", // This is stored on the server
        source: 'server'
      };
    }
    
    throw new Error("No Google Ads accounts found");
  } catch (error) {
    console.error('Error getting Google Ads credentials:', error);
    throw new Error(`No credentials found: ${error.message}`);
  }
};
