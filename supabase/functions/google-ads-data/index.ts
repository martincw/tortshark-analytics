
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_ADS_API_VERSION = "v17";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getGoogleAdsToken(userId: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
  try {
    const { data: tokens, error: tokensError } = await supabase
      .from("google_ads_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      throw new Error("Failed to retrieve authentication tokens");
    }
    
    if (!tokens) {
      throw new Error("No tokens found");
    }
    
    const isExpired = new Date(tokens.expires_at) <= new Date();
    
    if (isExpired && tokens.refresh_token) {
      const refreshedTokens = await refreshGoogleToken(tokens.refresh_token);
      
      await supabase
        .from("google_ads_tokens")
        .update({
          access_token: refreshedTokens.access_token,
          expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId)
        .eq("provider", "google");
      
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

async function refreshGoogleToken(refreshToken: string): Promise<any> {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials not configured");
  }
  
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
    throw new Error(`Failed to refresh token: ${errorText}`);
  }
  
  return await response.json();
}

async function fetchCampaignMetrics(
  accessToken: string, 
  customerId: string, 
  developerToken: string,
  startDate: string,
  endDate: string
): Promise<any> {
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

function transformCampaignMetrics(apiResponse: any): any[] {
  try {
    if (!apiResponse || !apiResponse.results || !Array.isArray(apiResponse.results)) {
      return [];
    }
    
    return apiResponse.results.map((result: any) => {
      const campaign = result.campaign || {};
      const metrics = result.metrics || {};
      const segments = result.segments || {};
      
      const adSpend = parseFloat((metrics.cost_micros / 1000000).toFixed(2));
      const ctr = parseFloat((metrics.ctr * 100).toFixed(2));
      const cpc = parseFloat((metrics.average_cpc / 1000000).toFixed(2));
      
      const conversions = metrics.conversions || 0;
      const cpl = conversions > 0 ? parseFloat((adSpend / conversions).toFixed(2)) : 0;
      
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        impressions: metrics.impressions || 0,
        clicks: metrics.clicks || 0,
        ctr,
        cpc,
        cpl,
        adSpend,
        conversions,
        date: segments.date
      };
    });
  } catch (error) {
    console.error("Error transforming campaign metrics:", error);
    return [];
  }
}

async function fetchAccountsList(accessToken: string, developerToken: string): Promise<any[]> {
  try {
    console.log("Fetching Google Ads accounts...");
    
    // First, fetch the accessible customers
    const managerResponse = await fetch(
      "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
        },
      }
    );
    
    if (!managerResponse.ok) {
      const errorText = await managerResponse.text();
      console.error("Failed to fetch accessible customers:", errorText);
      throw new Error(`Failed to fetch accessible customers: ${errorText}`);
    }
    
    const { resourceNames } = await managerResponse.json();
    
    if (!resourceNames || !Array.isArray(resourceNames) || resourceNames.length === 0) {
      console.log("No accessible accounts found");
      return [];
    }
    
    console.log(`Found ${resourceNames.length} accessible accounts`);
    
    // Extract customer IDs from resource names (format: 'customers/1234567890')
    const customerIds = resourceNames.map((name) => name.split('/')[1]);
    
    // Now fetch details for each customer ID
    const accounts = await Promise.all(
      customerIds.map(async (customerId) => {
        try {
          const customerResponse = await fetch(
            `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}`,
            {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "developer-token": developerToken,
              },
            }
          );
          
          if (!customerResponse.ok) {
            console.error(`Failed to fetch details for customer ${customerId}`);
            return {
              id: customerId,
              customerId: customerId,
              name: `Account ${customerId}`,
              currency: "USD",
              timeZone: "America/New_York",
              status: "ENABLED",
              platform: "google",
              isConnected: true,
              lastSynced: new Date().toISOString()
            };
          }
          
          const customerData = await customerResponse.json();
          
          return {
            id: customerId,
            customerId: customerId,
            name: customerData.customer?.descriptiveName || `Account ${customerId}`,
            currency: customerData.customer?.currencyCode || "USD",
            timeZone: customerData.customer?.timeZone || "America/New_York",
            status: customerData.customer?.status || "ENABLED",
            platform: "google",
            isConnected: true,
            lastSynced: new Date().toISOString()
          };
        } catch (error) {
          console.error(`Error fetching details for customer ${customerId}:`, error);
          return {
            id: customerId,
            customerId: customerId,
            name: `Account ${customerId}`,
            currency: "USD",
            timeZone: "America/New_York",
            status: "ENABLED",
            platform: "google",
            isConnected: true,
            lastSynced: new Date().toISOString()
          };
        }
      })
    );
    
    // Filter out null values (failed requests)
    return accounts.filter(account => account !== null);
  } catch (error) {
    console.error("Error fetching Google Ads accounts:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const { action, customerId, startDate, endDate, accessToken } = requestData;
    
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized - No token provided" }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("User authentication error:", userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unauthorized", 
          details: userError?.message 
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    if (action === "list-accounts") {
      if (!accessToken) {
        return new Response(
          JSON.stringify({ success: false, error: "No access token provided" }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        console.log("Access token length:", accessToken.length);
        
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        if (!userInfoResponse.ok) {
          const errorText = await userInfoResponse.text();
          console.error("Auth verification failed:", errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Authentication verification failed",
              details: errorText
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const userInfo = await userInfoResponse.json();
        console.log("User info:", userInfo);
        
        console.log("Attempting to access Google Ads API");
        
        // Fetch real accounts from Google Ads API
        const accounts = await fetchAccountsList(accessToken, GOOGLE_ADS_DEVELOPER_TOKEN);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            accounts,
            userEmail: userInfo.email
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error in list-accounts:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Error in account listing",
            details: error.message
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    if (action === "get-metrics") {
      if (!customerId || !startDate || !endDate) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing required parameters" }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const tokensResult = await getGoogleAdsToken(user.id);
      
      if (!tokensResult) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to get Google Ads authentication token" 
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        const apiResponse = await fetchCampaignMetrics(
          tokensResult.accessToken,
          customerId,
          GOOGLE_ADS_DEVELOPER_TOKEN,
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
      } catch (apiError) {
        console.error("Error fetching metrics from Google Ads API:", apiError);
        
        if (tokensResult.refreshToken) {
          try {
            const refreshedTokens = await refreshGoogleToken(tokensResult.refreshToken);
            
            await supabase
              .from("user_oauth_tokens")
              .update({
                access_token: refreshedTokens.access_token,
                expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
              })
              .eq("user_id", user.id)
              .eq("provider", "google");
            
            const apiResponse = await fetchCampaignMetrics(
              refreshedTokens.access_token,
              customerId,
              GOOGLE_ADS_DEVELOPER_TOKEN,
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
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Failed to refresh token and retry API call",
                details: refreshError.message
              }),
              { 
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: apiError.message || "API request failed" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    if (action === "get-accounts") {
      const tokensResult = await getGoogleAdsToken(user.id);
      
      if (!tokensResult) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to get Google Ads authentication token" 
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        const accounts = await fetchAccountsList(tokensResult.accessToken, GOOGLE_ADS_DEVELOPER_TOKEN);
        
        return new Response(
          JSON.stringify({ success: true, accounts }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error fetching Google Ads accounts:", error);
        
        if (tokensResult.refreshToken) {
          try {
            const refreshedTokens = await refreshGoogleToken(tokensResult.refreshToken);
            
            await supabase
              .from("user_oauth_tokens")
              .update({
                access_token: refreshedTokens.access_token,
                expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
              })
              .eq("user_id", user.id)
              .eq("provider", "google");
            
            const accounts = await fetchAccountsList(refreshedTokens.access_token, GOOGLE_ADS_DEVELOPER_TOKEN);
            
            return new Response(
              JSON.stringify({ success: true, accounts }),
              { 
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } catch (refreshError) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Failed to refresh token and retry fetching accounts",
                details: refreshError.message
              }),
              { 
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Failed to fetch Google Ads accounts"
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in google-ads-data function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
