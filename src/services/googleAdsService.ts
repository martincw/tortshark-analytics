
import { supabase } from "@/integrations/supabase/client";
import { DateRange, GoogleAdsMetrics } from "@/types/campaign";

// Types
interface GoogleAdsCredentials {
  customerId: string;
  developerToken: string;
  userEmail?: string;
  source?: string;
}

interface GoogleAdsAccount {
  id: string;
  name: string;
  customerId: string;
  status?: string;
}

interface GoogleAdsMetricsResponse {
  impressions: number;
  clicks: number;
  adSpend: number;
  ctr: number;
  cpc: number;
  cpl: number; // Added the cpl property to match GoogleAdsMetrics
  date: string;
  conversions?: number; // Optional for transformation
}

// Authentication functions
export const isGoogleAuthValid = async (): Promise<boolean> => {
  try {
    console.log("Checking Google Ads authentication validity...");
    
    // Attempt to fetch accounts as a validation test
    const accounts = await listGoogleAdsAccounts();
    
    console.log(`Google Ads authentication check: Found ${accounts.length} accounts`);
    
    return Array.isArray(accounts) && accounts.length > 0;
  } catch (error) {
    console.warn('Google Ads authentication validation failed:', {
      errorMessage: error.message,
      errorStack: error.stack
    });
    
    // Add more specific error logging
    if (error.message?.includes("Failed to fetch")) {
      console.error("Network error or API endpoint unavailable");
    } else if (error.message?.includes("Unauthorized")) {
      console.error("Authentication token is invalid or expired");
    }
    
    return false;
  }
};

export const initiateGoogleAuth = async (): Promise<{ url: string }> => {
  try {
    console.log("Initiating Google Auth process");
    
    // Call the edge function to get the auth URL
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "auth" }
    });
    
    if (error) {
      console.error("Error initiating Google Auth:", error);
      throw error;
    }
    
    if (!data || !data.url) {
      throw new Error("Failed to get authentication URL");
    }
    
    console.log("Successfully generated Google Auth URL");
    return { url: data.url };
  } catch (error) {
    console.error("Error in initiateGoogleAuth:", error);
    throw error;
  }
};

export const handleOAuthCallback = async (): Promise<boolean> => {
  try {
    console.log("Processing OAuth callback");
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) {
      console.error("No authorization code found in URL");
      return false;
    }
    
    // Call the edge function to exchange the code for tokens
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { 
        action: "callback",
        code 
      }
    });
    
    if (error) {
      console.error("Error processing OAuth callback:", error);
      throw error;
    }
    
    if (!data || !data.success) {
      console.error("Failed to process OAuth callback:", data?.message);
      return false;
    }
    
    console.log("Successfully processed OAuth callback");
    return true;
  } catch (error) {
    console.error("Error in handleOAuthCallback:", error);
    throw error;
  }
};

export const getGoogleAdsCredentials = async (): Promise<GoogleAdsCredentials | null> => {
  try {
    // First check for demo mode
    const isDemoMode = true; // For now, always return demo credentials
    
    if (isDemoMode) {
      console.log("Using demo credentials for Google Ads");
      return {
        customerId: "1234567890",
        developerToken: "demo_token",
        userEmail: "demo@example.com",
        source: "demo"
      };
    }
    
    // In a real implementation, we would fetch the credentials from the database
    const { data, error } = await supabase
      .from('google_ads_tokens')
      .select('refresh_token, access_token, email')
      .maybeSingle();
      
    if (error || !data) {
      console.error("Error getting Google Ads credentials:", error);
      return null;
    }
    
    if (!data.access_token) {
      console.error("No access token found in database");
      return null;
    }
    
    return {
      customerId: "1234567890", // This would come from the database in a real implementation
      developerToken: "demo_token", // This would be stored securely
      userEmail: data.email,
      source: "database"
    };
  } catch (error) {
    console.error("Error in getGoogleAdsCredentials:", error);
    return null;
  }
};

export const validateGoogleToken = async (): Promise<boolean> => {
  try {
    // In a real implementation, we would validate the token with Google
    // For now, just return true
    return true;
  } catch (error) {
    console.error("Error validating Google token:", error);
    return false;
  }
};

export const refreshGoogleToken = async (): Promise<boolean> => {
  try {
    // Call the edge function to refresh the token
    const { data, error } = await supabase.functions.invoke('google-ads', {
      body: { action: "refresh" }
    });
    
    if (error) {
      console.error("Error refreshing Google token:", error);
      throw error;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error in refreshGoogleToken:", error);
    return false;
  }
};

export const revokeGoogleAccess = async (): Promise<boolean> => {
  try {
    console.log("Revoking Google access");
    
    // In a real implementation, we would call Google to revoke the token
    // and then delete it from our database
    
    // Delete the token from the database
    const { error } = await supabase
      .from('google_ads_tokens')
      .delete()
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '');
      
    if (error) {
      console.error("Error revoking Google access:", error);
      throw error;
    }
    
    console.log("Successfully revoked Google access");
    return true;
  } catch (error) {
    console.error("Error in revokeGoogleAccess:", error);
    return false;
  }
};

// Accounts management functions
export const listGoogleAdsAccounts = async (): Promise<GoogleAdsAccount[]> => {
  try {
    console.log("Listing Google Ads accounts");
    
    // For demo purposes, return some mock accounts
    // In a real implementation, this would call the Google Ads API
    
    // Generate between 1 and 5 random accounts
    const accountCount = Math.floor(Math.random() * 5) + 1;
    const accounts = [];
    
    for (let i = 0; i < accountCount; i++) {
      accounts.push({
        id: `acc-${i+1}-${Date.now()}`,
        name: `Demo Account ${i+1}`,
        customerId: `${1000000000 + i}`,
        status: "ENABLED"
      });
    }
    
    console.log(`Generated ${accounts.length} demo accounts`);
    return accounts;
  } catch (error) {
    console.error("Error listing Google Ads accounts:", error);
    return [];
  }
};

export const cleanupAllAccounts = async (): Promise<boolean> => {
  try {
    console.log("Cleaning up all Google Ads accounts");
    
    // Call the edge function to delete all accounts
    const { data, error } = await supabase.functions.invoke('google-ads-manager', {
      body: { action: "delete-all-accounts" }
    });
    
    if (error) {
      console.error("Error cleaning up accounts:", error);
      throw error;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error in cleanupAllAccounts:", error);
    return false;
  }
};

// Metrics functions
export const fetchGoogleAdsMetrics = async (
  accountId: string,
  dateRange: DateRange
): Promise<GoogleAdsMetricsResponse[]> => {
  try {
    console.log(`Fetching Google Ads metrics for account ${accountId} from ${dateRange.startDate} to ${dateRange.endDate}`);
    
    // For demo purposes, return some mock metrics
    // In a real implementation, this would call the Google Ads API
    
    // Generate data for each day in the date range
    const metrics: GoogleAdsMetricsResponse[] = [];
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    
    // Ensure dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error("Invalid date range:", dateRange);
      return [];
    }
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      // Generate random metrics for this day
      const impressions = Math.floor(Math.random() * 1000) + 100;
      const clicks = Math.floor(Math.random() * 100) + 10;
      const adSpend = Math.random() * 100 + 10;
      const ctr = (clicks / impressions) * 100;
      const cpc = adSpend / clicks;
      
      // Add cpl to match the GoogleAdsMetrics type
      const conversions = Math.floor(Math.random() * clicks * 0.2) + 1; // Estimate conversions as ~20% of clicks
      const cpl = adSpend / conversions;
      
      metrics.push({
        impressions,
        clicks,
        adSpend,
        ctr,
        cpc,
        cpl,
        conversions,
        date: date.toISOString().split('T')[0]
      });
    }
    
    console.log(`Generated metrics for ${metrics.length} days`);
    return metrics;
  } catch (error) {
    console.error("Error fetching Google Ads metrics:", error);
    return [];
  }
};
