import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_ADS_API_VERSION = "v16";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function refreshGoogleToken(refreshToken: string): Promise<any> {
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
    throw new Error(`Failed to refresh token: ${errorText}`);
  }
  
  return await response.json();
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const { data: tokens, error } = await supabase
    .from("google_ads_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  
  if (error || !tokens) {
    console.error("No tokens found for user:", userId);
    return null;
  }
  
  const isExpired = new Date(tokens.expires_at) <= new Date();
  
  if (isExpired && tokens.refresh_token) {
    try {
      const refreshed = await refreshGoogleToken(tokens.refresh_token);
      
      await supabase
        .from("google_ads_tokens")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId);
      
      return refreshed.access_token;
    } catch (e) {
      console.error("Failed to refresh token:", e);
      return null;
    }
  }
  
  return tokens.access_token;
}

async function fetchGoogleAdsCampaigns(accessToken: string, customerId: string): Promise<any[]> {
  const query = `
    SELECT 
      campaign.id, 
      campaign.name,
      campaign.status,
      campaign_budget.amount_micros
    FROM campaign
    WHERE campaign.status != 'REMOVED'
  `;
  
  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, pageSize: 10000 }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Ads API error: ${errorText}`);
  }
  
  const data = await response.json();
  return (data.results || []).map((r: any) => ({
    id: r.campaign?.id,
    name: r.campaign?.name,
    status: r.campaign?.status,
    budgetMicros: r.campaignBudget?.amount_micros || 0,
  }));
}

async function fetchTodaysSpend(accessToken: string, customerId: string): Promise<any[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const query = `
    SELECT 
      campaign.id, 
      campaign.name,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      segments.date
    FROM campaign
    WHERE segments.date = '${today}'
  `;
  
  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, pageSize: 10000 }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Ads API error: ${errorText}`);
  }
  
  const data = await response.json();
  return (data.results || []).map((r: any) => ({
    campaignId: r.campaign?.id,
    campaignName: r.campaign?.name,
    adSpend: (r.metrics?.cost_micros || 0) / 1000000,
    clicks: r.metrics?.clicks || 0,
    impressions: r.metrics?.impressions || 0,
    conversions: r.metrics?.conversions || 0,
    date: r.segments?.date,
  }));
}

async function fetchYesterdaysSpend(accessToken: string, customerId: string): Promise<any[]> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const query = `
    SELECT 
      campaign.id, 
      campaign.name,
      metrics.cost_micros,
      metrics.clicks,
      metrics.impressions,
      metrics.conversions,
      segments.date
    FROM campaign
    WHERE segments.date = '${yesterdayStr}'
  `;
  
  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, pageSize: 10000 }),
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Ads API error: ${errorText}`);
  }
  
  const data = await response.json();
  return (data.results || []).map((r: any) => ({
    campaignId: r.campaign?.id,
    campaignName: r.campaign?.name,
    adSpend: (r.metrics?.cost_micros || 0) / 1000000,
    clicks: r.metrics?.clicks || 0,
    impressions: r.metrics?.impressions || 0,
    conversions: r.metrics?.conversions || 0,
    date: r.segments?.date,
  }));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, workspaceId, customerId } = await req.json();
    
    console.log(`Google Ads Sync - Action: ${action}, User: ${userId}, Workspace: ${workspaceId}`);

    // Get campaigns for a specific account (used by frontend)
    if (action === "get-campaigns") {
      if (!customerId) {
        return new Response(
          JSON.stringify({ success: false, error: "customerId required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user from the auth header
      const authHeader = req.headers.get("Authorization");
      let tokenUserId = userId;
      
      if (!tokenUserId && authHeader) {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        tokenUserId = user?.id;
      }

      if (!tokenUserId) {
        return new Response(
          JSON.stringify({ success: false, error: "User not authenticated" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const accessToken = await getValidAccessToken(tokenUserId);
      if (!accessToken) {
        return new Response(
          JSON.stringify({ success: false, error: "No valid Google Ads token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        // Fetch campaigns with metrics
        const query = `
          SELECT 
            campaign.id, 
            campaign.name,
            campaign.status,
            campaign_budget.amount_micros,
            metrics.clicks,
            metrics.impressions,
            metrics.cost_micros
          FROM campaign
          WHERE campaign.status != 'REMOVED'
        `;
        
        const cleanCustomerId = customerId.replace(/-/g, '');
        
        const response = await fetch(
          `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/googleAds:search`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, pageSize: 10000 }),
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Google Ads API error:", errorText);
          return new Response(
            JSON.stringify({ success: false, error: `Google Ads API error: ${response.status}` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const data = await response.json();
        const campaigns = (data.results || []).map((r: any) => ({
          id: r.campaign?.id,
          name: r.campaign?.name,
          status: r.campaign?.status,
          budget: r.campaignBudget?.amountMicros || 0,
          clicks: r.metrics?.clicks || 0,
          impressions: r.metrics?.impressions || 0,
          cost_micros: r.metrics?.costMicros || 0,
        }));

        return new Response(
          JSON.stringify({ success: true, campaigns }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("Error fetching campaigns:", e);
        return new Response(
          JSON.stringify({ success: false, error: e instanceof Error ? e.message : "Unknown error" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (action === "list-google-campaigns") {
      // List all Google Ads campaigns from connected accounts
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        return new Response(
          JSON.stringify({ success: false, error: "No valid Google Ads token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get connected Google Ads accounts
      const { data: connections } = await supabase
        .from("account_connections")
        .select("customer_id, name")
        .eq("user_id", userId)
        .eq("platform", "google")
        .eq("is_connected", true);

      if (!connections || connections.length === 0) {
        return new Response(
          JSON.stringify({ success: true, campaigns: [], message: "No connected Google Ads accounts" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const allCampaigns: any[] = [];
      
      for (const conn of connections) {
        if (!conn.customer_id) continue;
        
        try {
          const campaigns = await fetchGoogleAdsCampaigns(accessToken, conn.customer_id);
          campaigns.forEach(c => {
            allCampaigns.push({
              ...c,
              accountId: conn.customer_id,
              accountName: conn.name,
            });
          });
        } catch (e) {
          console.error(`Error fetching campaigns for account ${conn.customer_id}:`, e);
        }
      }

      // Get existing mappings
      const { data: mappings } = await supabase
        .from("campaign_ad_mappings")
        .select("google_campaign_id, tortshark_campaign_id, is_active")
        .in("google_account_id", connections.map(c => c.customer_id).filter(Boolean));

      // Mark campaigns as mapped or unmapped
      const campaignsWithMapping = allCampaigns.map(c => {
        const mapping = mappings?.find(m => m.google_campaign_id === c.id);
        return {
          ...c,
          isMapped: !!mapping,
          tortsharkCampaignId: mapping?.tortshark_campaign_id || null,
          mappingActive: mapping?.is_active || false,
        };
      });

      return new Response(
        JSON.stringify({ success: true, campaigns: campaignsWithMapping }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-unmapped-count") {
      // Quick count of unmapped active Google Ads campaigns
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        return new Response(
          JSON.stringify({ success: true, unmappedCount: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: connections } = await supabase
        .from("account_connections")
        .select("customer_id")
        .eq("user_id", userId)
        .eq("platform", "google")
        .eq("is_connected", true);

      if (!connections || connections.length === 0) {
        return new Response(
          JSON.stringify({ success: true, unmappedCount: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      let totalCampaigns = 0;
      let mappedCount = 0;

      for (const conn of connections) {
        if (!conn.customer_id) continue;
        
        try {
          const campaigns = await fetchGoogleAdsCampaigns(accessToken, conn.customer_id);
          const activeCampaigns = campaigns.filter(c => c.status === "ENABLED");
          totalCampaigns += activeCampaigns.length;
        } catch (e) {
          console.error(`Error fetching campaigns for count:`, e);
        }
      }

      const { count } = await supabase
        .from("campaign_ad_mappings")
        .select("id", { count: "exact", head: true })
        .in("google_account_id", connections.map(c => c.customer_id).filter(Boolean))
        .eq("is_active", true);

      mappedCount = count || 0;

      return new Response(
        JSON.stringify({ 
          success: true, 
          unmappedCount: Math.max(0, totalCampaigns - mappedCount),
          totalCampaigns,
          mappedCount
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "map-campaign") {
      const { googleCampaignId, googleCampaignName, googleAccountId, tortsharkCampaignId } = await req.json();
      
      // Upsert the mapping
      const { error } = await supabase
        .from("campaign_ad_mappings")
        .upsert({
          google_campaign_id: googleCampaignId,
          google_campaign_name: googleCampaignName,
          google_account_id: googleAccountId,
          tortshark_campaign_id: tortsharkCampaignId,
          is_active: true,
          last_synced: new Date().toISOString(),
        }, {
          onConflict: "google_campaign_id,google_account_id"
        });

      if (error) {
        console.error("Error mapping campaign:", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unmap-campaign") {
      const { googleCampaignId, googleAccountId } = await req.json();
      
      const { error } = await supabase
        .from("campaign_ad_mappings")
        .update({ is_active: false })
        .eq("google_campaign_id", googleCampaignId)
        .eq("google_account_id", googleAccountId);

      if (error) {
        console.error("Error unmapping campaign:", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync-realtime-spend") {
      // Sync today's spend for all mapped campaigns
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        return new Response(
          JSON.stringify({ success: false, error: "No valid Google Ads token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all active mappings for this workspace
      const { data: mappings } = await supabase
        .from("campaign_ad_mappings")
        .select(`
          google_campaign_id,
          google_account_id,
          tortshark_campaign_id,
          campaigns!inner(workspace_id)
        `)
        .eq("is_active", true);

      if (!mappings || mappings.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No mapped campaigns to sync" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Group by account
      const accountCampaigns = new Map<string, typeof mappings>();
      mappings.forEach(m => {
        const existing = accountCampaigns.get(m.google_account_id) || [];
        existing.push(m);
        accountCampaigns.set(m.google_account_id, existing);
      });

      const today = new Date().toISOString().split('T')[0];
      const syncResults: any[] = [];

      for (const [accountId, campaigns] of accountCampaigns) {
        try {
          const spendData = await fetchTodaysSpend(accessToken, accountId);
          
          for (const mapping of campaigns) {
            const spend = spendData.find(s => s.campaignId === mapping.google_campaign_id);
            if (spend) {
              // Update or insert today's stats
              const { error } = await supabase
                .from("campaign_stats_history")
                .upsert({
                  campaign_id: mapping.tortshark_campaign_id,
                  date: today,
                  ad_spend: spend.adSpend,
                  // Don't overwrite leads/cases/revenue - those come from other sources
                }, {
                  onConflict: "campaign_id,date",
                  ignoreDuplicates: false
                });

              if (!error) {
                syncResults.push({
                  campaignId: mapping.tortshark_campaign_id,
                  adSpend: spend.adSpend,
                  synced: true,
                });
              }
            }
          }
        } catch (e) {
          console.error(`Error syncing spend for account ${accountId}:`, e);
        }
      }

      // Update last_synced on mappings
      await supabase
        .from("campaign_ad_mappings")
        .update({ last_synced: new Date().toISOString() })
        .in("tortshark_campaign_id", mappings.map(m => m.tortshark_campaign_id));

      return new Response(
        JSON.stringify({ success: true, synced: syncResults.length, results: syncResults }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "save-daily-stats") {
      // Save yesterday's final stats (called after midnight)
      const accessToken = await getValidAccessToken(userId);
      if (!accessToken) {
        return new Response(
          JSON.stringify({ success: false, error: "No valid Google Ads token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: mappings } = await supabase
        .from("campaign_ad_mappings")
        .select("google_campaign_id, google_account_id, tortshark_campaign_id")
        .eq("is_active", true);

      if (!mappings || mappings.length === 0) {
        return new Response(
          JSON.stringify({ success: true, message: "No mapped campaigns" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const accountCampaigns = new Map<string, typeof mappings>();
      mappings.forEach(m => {
        const existing = accountCampaigns.get(m.google_account_id) || [];
        existing.push(m);
        accountCampaigns.set(m.google_account_id, existing);
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      let savedCount = 0;

      for (const [accountId, campaigns] of accountCampaigns) {
        try {
          const spendData = await fetchYesterdaysSpend(accessToken, accountId);
          
          for (const mapping of campaigns) {
            const spend = spendData.find(s => s.campaignId === mapping.google_campaign_id);
            if (spend) {
              // Upsert yesterday's final stats (only ad_spend from Google)
              const { error } = await supabase
                .from("campaign_stats_history")
                .upsert({
                  campaign_id: mapping.tortshark_campaign_id,
                  date: yesterdayStr,
                  ad_spend: spend.adSpend,
                }, {
                  onConflict: "campaign_id,date",
                  ignoreDuplicates: false
                });

              if (!error) savedCount++;
            }
          }
        } catch (e) {
          console.error(`Error saving daily stats for account ${accountId}:`, e);
        }
      }

      return new Response(
        JSON.stringify({ success: true, savedCount, date: yesterdayStr }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Unknown action" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Google Ads Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
