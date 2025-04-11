
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_ADS_API_VERSION = "v15";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetches access token for Google Ads API
 */
async function getGoogleAdsToken(userId: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
  try {
    // Get stored tokens
    const { data: tokens, error: tokensError } = await supabase
      .from("google_ads_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .single();
    
    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      throw new Error("Failed to retrieve authentication tokens");
    }
    
    if (!tokens) {
      throw new Error("No tokens found");
    }
    
    // Check if token is expired
    const isExpired = new Date(tokens.expires_at) <= new Date();
    
    if (isExpired && tokens.refresh_token) {
      // Refresh token logic...
      const refreshedTokens = await refreshGoogleToken(tokens.refresh_token);
      
      // Update tokens in database
      await supabase
        .from("google_ads_tokens")
        .update({
          access_token: refreshedTokens.access_token,
          expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId);
      
      return { 
        accessToken: refreshedTokens.access_token, 
        refreshToken: tokens.refresh_token 
      };
    }
    
    return { 
      accessToken: tokens.access_token, 
      refreshToken: tokens.refresh_token 
    };
  } catch (error) {
    console.error("Error getting Google Ads token:", error);
    return null;
  }
}

/**
 * Refreshes Google OAuth token
 */
async function refreshGoogleToken(refreshToken: string): Promise<any> {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
  
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Token refresh failed:", errorText);
    throw new Error("Failed to refresh token");
  }
  
  return await response.json();
}

/**
 * Fetches campaign metrics from Google Ads API
 */
async function fetchCampaignMetrics(
  accessToken: string, 
  customerId: string, 
  developerToken: string,
  startDate: string,
  endDate: string
): Promise<any> {
  // Build the Google Ads API query
  const query = `
    SELECT 
      campaign.id, 
      campaign.name,
      metrics.impressions, 
      metrics.clicks, 
      metrics.cost_micros, 
      metrics.conversions, 
      metrics.ctr,
      metrics.average_cpc,
      segments.date
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
    ORDER BY segments.date
  `;
  
  // Make the API request
  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        pageSize: 10000,
      }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error("Google Ads API request failed:", errorText);
    throw new Error(`Google Ads API request failed: ${response.status} ${errorText}`);
  }
  
  const data = await response.json();
  return data;
}

/**
 * Transforms raw Google Ads API response into formatted metrics
 */
function transformCampaignMetrics(apiResponse: any): any[] {
  try {
    if (!apiResponse.results || !Array.isArray(apiResponse.results)) {
      return [];
    }
    
    // Process the results to match our GoogleAdsMetrics type
    return apiResponse.results.map((result: any) => {
      const campaign = result.campaign || {};
      const metrics = result.metrics || {};
      const segments = result.segments || {};
      
      // Convert cost from micros (millionths of the account currency) to actual currency
      const adSpend = parseFloat((metrics.cost_micros / 1000000).toFixed(2));
      const ctr = parseFloat((metrics.ctr * 100).toFixed(2)); // Convert to percentage
      const cpc = parseFloat((metrics.average_cpc / 1000000).toFixed(2)); // Convert from micros
      
      // Calculate cost per lead if conversions exist
      const conversions = metrics.conversions || 0;
      const cpl = conversions > 0 ? parseFloat((adSpend / conversions).toFixed(2)) : 0;
      
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        ctr, // Click-through rate as percentage
        cpc, // Cost per click
        cpl, // Cost per lead
        adSpend, // Total ad spend
        conversions, // Total conversions
        date: segments.date // Date in YYYY-MM-DD format
      };
    });
  } catch (error) {
    console.error("Error transforming campaign metrics:", error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, customerId, startDate, endDate } = await req.json();
    
    // Get user ID from the auth header
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("User authentication error:", userError);
      throw new Error("Unauthorized");
    }
    
    // Handle different actions
    if (action === "get-metrics") {
      // Get Google Ads token
      const tokensResult = await getGoogleAdsToken(user.id);
      
      if (!tokensResult) {
        throw new Error("Failed to get Google Ads authentication token");
      }
      
      // Mock developer token (would typically be stored securely)
      const developerToken = "Ngh3IukgQ3ovdkH3M0smUg";
      
      // Fetch metrics from Google Ads API
      try {
        const apiResponse = await fetchCampaignMetrics(
          tokensResult.accessToken,
          customerId,
          developerToken,
          startDate,
          endDate
        );
        
        // Transform the API response to match our expected format
        const metrics = transformCampaignMetrics(apiResponse);
        
        return new Response(
          JSON.stringify({ success: true, metrics }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (apiError) {
        console.error("Error fetching metrics from Google Ads API:", apiError);
        
        // If it's the first time and we get an authentication error, try refreshing the token
        if (tokensResult.refreshToken) {
          try {
            const refreshedTokens = await refreshGoogleToken(tokensResult.refreshToken);
            
            // Update tokens in database
            await supabase
              .from("google_ads_tokens")
              .update({
                access_token: refreshedTokens.access_token,
                expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
              })
              .eq("user_id", user.id);
            
            // Try the API call again with the new token
            const apiResponse = await fetchCampaignMetrics(
              refreshedTokens.access_token,
              customerId,
              developerToken,
              startDate,
              endDate
            );
            
            const metrics = transformCampaignMetrics(apiResponse);
            
            return new Response(
              JSON.stringify({ success: true, metrics }),
              { 
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } catch (refreshError) {
            throw new Error("Failed to refresh token and retry API call");
          }
        } else {
          throw apiError;
        }
      }
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in google-ads-data function:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal server error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
