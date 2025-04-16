
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;
const MANAGER_CUSTOMER_ID = Deno.env.get("GOOGLE_ADS_MANAGER_CUSTOMER_ID") || "";
const REDIRECT_URI = Deno.env.get("SITE_URL") + "/integrations";

// Supabase client (service role) to store/retrieve tokens
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  // 0. Authenticate user via Supabase JWT in Authorization header
  const authHeader = req.headers.get("Authorization")?.split(" ")[1] || "";
  const { data: udata, error: authErr } = await supabase.auth.getUser(authHeader);
  if (authErr) {
    return new Response(JSON.stringify({ success: false, error: authErr.message }), { 
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  const user = udata.user!;

  // Helper: load this user's refresh token
  async function getRefreshToken() {
    const { data, error } = await supabase
      .from("google_ads_tokens")
      .select("refresh_token")
      .eq("user_id", user.id)
      .single();
    if (error || !data || !data.refresh_token) {
      throw new Error("OAuth not completed yet");
    }
    return data.refresh_token as string;
  }

  // Helper: exchange code ↔ tokens
  async function fetchToken(params: Record<string, string>) {
    try {
      console.log(`Fetching token with params: ${JSON.stringify(params)}`);
      const resp = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(params)
      });
      
      if (!resp.ok) {
        const errorText = await resp.text();
        console.error(`Token fetch failed: ${resp.status} ${errorText}`);
        throw new Error(`Token fetch failed: ${resp.status} ${errorText}`);
      }
      
      return resp.json() as Promise<{
        access_token?: string,
        refresh_token?: string,
        error?: string,
        expires_in?: number
      }>;
    } catch (err) {
      console.error("Error fetching token:", err);
      throw err;
    }
  }

  try {
    const path = url.pathname.split('/').pop() || '';
    console.log(`Processing request: ${path}`);

    switch (path) {
      // ────────────── Step 1: Redirect to Google OAuth ──────────────
      case "auth": {
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent("https://www.googleapis.com/auth/adwords")}` +
          `&access_type=offline&prompt=consent` +
          `&state=${encodeURIComponent(JSON.stringify({ userId: user.id }))}`;
        
        return new Response(JSON.stringify({ success: true, url: authUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // ───────── Step 2: OAuth callback → save refresh_token ────────
      case "callback": {
        const { code } = await req.json();
        if (!code) {
          throw new Error("Missing authorization code");
        }
        
        console.log("Exchanging code for token");
        const tok = await fetchToken({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code"
        });
        
        if (!tok.refresh_token) {
          throw new Error("No refresh_token returned; ensure offline access & prompt=consent");
        }
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (tok.expires_in || 3600) * 1000);
        
        // Upsert into your table (user_id PK, refresh_token)
        const { error: upsertError } = await supabase
          .from("google_ads_tokens")
          .upsert(
            { 
              user_id: user.id, 
              refresh_token: tok.refresh_token,
              access_token: tok.access_token,
              expires_at: expiresAt.toISOString(),
              scope: "https://www.googleapis.com/auth/adwords"
            },
            { onConflict: "user_id" }
          );
          
        if (upsertError) {
          console.error("Error saving token:", upsertError);
          throw new Error(`Failed to save refresh token: ${upsertError.message}`);
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Google Ads connected! Refresh token saved." 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // ───────── Step 3: List manager's child accounts ─────────────
      case "accounts": {
        if (!MANAGER_CUSTOMER_ID) {
          throw new Error("GOOGLE_ADS_MANAGER_CUSTOMER_ID environment variable not set");
        }
        
        const rt = await getRefreshToken();
        const { access_token } = await fetchToken({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: rt,
          grant_type: "refresh_token"
        });
        
        // Query via REST
        const q = encodeURIComponent(`
          SELECT
            client.client_customer,
            client.descriptive_name,
            client.manager,
            client.level
          FROM customer_client AS client
        `);
        
        const resp = await fetch(
          `https://googleads.googleapis.com/v14/customers/${MANAGER_CUSTOMER_ID}/googleAds:search?query=${q}`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "developer-token": DEVELOPER_TOKEN
            }
          }
        );
        
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Failed to fetch accounts: ${resp.status} ${errorText}`);
        }
        
        const data = await resp.json();
        const results = data.results || [];
        
        const accounts = results.map((r: any) => ({
          id: r.client_customer.replace("customers/", ""),
          name: r.descriptive_name,
          manager: r.manager,
          level: r.level
        }));
        
        return new Response(JSON.stringify({ success: true, accounts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // ───────── Step 4: Assign/Pause/Resume a campaign ────────────
      case "assign": {
        const { customer_id, campaign_id, status } = await req.json();
        if (!customer_id || !campaign_id) {
          return new Response(JSON.stringify({
            success: false,
            error: "customer_id & campaign_id required"
          }), { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        const rt = await getRefreshToken();
        const { access_token } = await fetchToken({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: rt,
          grant_type: "refresh_token"
        });
        
        const body = {
          operations: [{
            updateMask: "status",
            update: {
              resourceName: `customers/${customer_id}/campaigns/${campaign_id}`,
              status
            }
          }]
        };
        
        const resp = await fetch(
          `https://googleads.googleapis.com/v14/customers/${customer_id}/campaigns:mutate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "developer-token": DEVELOPER_TOKEN,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
          }
        );
        
        const respData = await resp.text();
        
        return new Response(JSON.stringify({
          success: resp.ok,
          data: respData,
          status: resp.status
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // ──────── Step 5: Pull today's ad performance ──────────────
      case "metrics": {
        const url = new URL(req.url);
        const customer_id = url.searchParams.get("customer_id");
        const startDate = url.searchParams.get("start_date");
        const endDate = url.searchParams.get("end_date");
        
        if (!customer_id) {
          return new Response(JSON.stringify({
            success: false,
            error: "customer_id query param required"
          }), { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        const rt = await getRefreshToken();
        const { access_token } = await fetchToken({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: rt,
          grant_type: "refresh_token"
        });
        
        // Determine date condition based on provided params or default to current date
        let dateCondition = `segments.date = CURRENT_DATE`;
        if (startDate && endDate) {
          dateCondition = `segments.date BETWEEN '${startDate}' AND '${endDate}'`;
        }
        
        const queryBody = {
          query: `
            SELECT
              segments.date,
              campaign.id,
              campaign.name,
              metrics.impressions,
              metrics.clicks,
              metrics.cost_micros,
              metrics.ctr
            FROM campaign
            WHERE ${dateCondition}
            ORDER BY segments.date ASC
          `
        };
        
        const resp = await fetch(
          `https://googleads.googleapis.com/v14/customers/${customer_id}/googleAds:search`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${access_token}`,
              "developer-token": DEVELOPER_TOKEN,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(queryBody)
          }
        );
        
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Failed to fetch metrics: ${resp.status} ${errorText}`);
        }
        
        const data = await resp.json();
        const results = data.results || [];
        
        // Format the results to match the expected format in our application
        const metrics = results.map((item: any) => ({
          date: item.segments?.date || '',
          campaignId: item.campaign?.id || '',
          campaignName: item.campaign?.name || '',
          impressions: parseInt(item.metrics?.impressions || '0', 10),
          clicks: parseInt(item.metrics?.clicks || '0', 10),
          adSpend: parseInt(item.metrics?.cost_micros || '0', 10) / 1000000, // Convert micros to dollars
          ctr: parseFloat(item.metrics?.ctr || '0') * 100, // Convert to percentage
        }));
        
        return new Response(JSON.stringify({ 
          success: true, 
          metrics 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        return new Response(JSON.stringify({
          success: false,
          error: "Not found",
          availableEndpoints: [
            "/auth", 
            "/callback", 
            "/accounts", 
            "/assign", 
            "/metrics"
          ]
        }), { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

  } catch (err) {
    console.error("Error processing request:", err);
    return new Response(JSON.stringify({
      success: false,
      error: err.message || String(err)
    }), { 
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
