import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_ADS_API_VERSION = "v15";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getGoogleAdsToken(userId: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
  try {
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
    
    const isExpired = new Date(tokens.expires_at) <= new Date();
    
    if (isExpired && tokens.refresh_token) {
      const refreshedTokens = await refreshGoogleToken(tokens.refresh_token);
      
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
    if (!apiResponse.results || !Array.isArray(apiResponse.results)) {
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, customerId, startDate, endDate } = await req.json();
    
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("User authentication error:", userError);
      throw new Error("Unauthorized");
    }
    
    if (action === "get-metrics") {
      const tokensResult = await getGoogleAdsToken(user.id);
      
      if (!tokensResult) {
        throw new Error("Failed to get Google Ads authentication token");
      }
      
      const developerToken = "Ngh3IukgQ3ovdkH3M0smUg";
      
      try {
        const apiResponse = await fetchCampaignMetrics(
          tokensResult.accessToken,
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
      } catch (apiError) {
        console.error("Error fetching metrics from Google Ads API:", apiError);
        
        if (tokensResult.refreshToken) {
          try {
            const refreshedTokens = await refreshGoogleToken(tokensResult.refreshToken);
            
            await supabase
              .from("google_ads_tokens")
              .update({
                access_token: refreshedTokens.access_token,
                expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
              })
              .eq("user_id", user.id);
            
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
    
    if (action === "get-accounts") {
      const tokensResult = await getGoogleAdsToken(user.id);
      
      if (!tokensResult) {
        throw new Error("Failed to get Google Ads authentication token");
      }
      
      const developerToken = "Ngh3IukgQ3ovdkH3M0smUg";
      
      try {
        const mockAccounts = [
          {
            id: "1234567890",
            name: "Main Marketing Account",
            customerId: "1234567890",
            currency: "USD",
            timeZone: "America/Los_Angeles",
            status: "ENABLED"
          },
          {
            id: "2345678901",
            name: "E-commerce Campaign",
            customerId: "2345678901",
            currency: "USD",
            timeZone: "America/Chicago",
            status: "ENABLED"
          },
          {
            id: "3456789012",
            name: "Brand Awareness",
            customerId: "3456789012",
            currency: "USD",
            timeZone: "America/New_York",
            status: "ENABLED"
          }
        ];
        
        return new Response(
          JSON.stringify({ success: true, accounts: mockAccounts }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (apiError) {
        console.error("Error fetching accounts from Google Ads API:", apiError);
        
        if (tokensResult.refreshToken) {
          try {
            const refreshedTokens = await refreshGoogleToken(tokensResult.refreshToken);
            
            await supabase
              .from("google_ads_tokens")
              .update({
                access_token: refreshedTokens.access_token,
                expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
              })
              .eq("user_id", user.id);
            
            return new Response(
              JSON.stringify({ 
                success: true, 
                accounts: [
                  {
                    id: "1234567890",
                    name: "Main Marketing Account (Refreshed)",
                    customerId: "1234567890",
                    currency: "USD",
                    timeZone: "America/Los_Angeles"
                  }
                ],
                message: "Used refreshed token"
              }),
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
