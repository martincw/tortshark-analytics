import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_ADS_API_VERSION = "v20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// User-scoped client for RLS operations
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Service-role client for token reads
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
  // Use admin client to bypass RLS for token reads
  const { data: tokens, error } = await adminClient
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
      
      await adminClient
        .from("google_ads_tokens")
        .update({
          access_token: refreshed.access_token,
          expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString()
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

async function fetchRealGoogleAdsCampaigns(accessToken: string, customerId: string): Promise<any[]> {
  const cleanCustomerId = customerId.replace(/-/g, '');
  
  const query = `
    SELECT 
      campaign.id, 
      campaign.name,
      campaign.status
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.name
  `;
  
  console.log(`Fetching campaigns for customer ${cleanCustomerId} using API version ${GOOGLE_ADS_API_VERSION}`);
  
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
    throw new Error(`Google Ads API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  return (data.results || []).map((r: any) => ({
    id: r.campaign?.id,
    name: r.campaign?.name,
    status: r.campaign?.status,
  }));
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Invalid authorization token");
    }

    console.log("Processing request for user:", user.id);
    const requestData = await req.json();
    const { action } = requestData;

    if (action === "create-mapping") {
      const { tortsharkCampaignId, googleAccountId, googleCampaignId, googleCampaignName } = requestData;

      if (!tortsharkCampaignId || !googleAccountId || !googleCampaignId || !googleCampaignName) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        // Use upsert with the correct table: campaign_ad_mappings
        const { data, error } = await adminClient
          .from("campaign_ad_mappings")
          .upsert({
            tortshark_campaign_id: tortsharkCampaignId,
            google_account_id: googleAccountId,
            google_campaign_id: googleCampaignId,
            google_campaign_name: googleCampaignName,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: "tortshark_campaign_id,google_account_id,google_campaign_id"
          });

        if (error) {
          console.error("Error creating mapping:", error);
          return new Response(
            JSON.stringify({ error: `Failed to create mapping: ${error.message}` }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log("Campaign mapping created successfully");
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error creating campaign mapping:", error);
        return new Response(
          JSON.stringify({ error: `Failed to create mapping: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (action === "list-available-campaigns") {
      const { googleAccountId } = requestData;

      if (!googleAccountId) {
        return new Response(
          JSON.stringify({ error: "Missing googleAccountId parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        // Get valid access token for the user
        const accessToken = await getValidAccessToken(user.id);
        
        if (!accessToken) {
          return new Response(
            JSON.stringify({ error: "No valid Google Ads authentication. Please reconnect your account." }),
            {
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Fetch REAL campaigns from Google Ads API
        const campaigns = await fetchRealGoogleAdsCampaigns(accessToken, googleAccountId);

        console.log(`Successfully listed ${campaigns.length} real campaigns for account ${googleAccountId}`);
        return new Response(
          JSON.stringify({ campaigns }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error listing available campaigns:", error);
        return new Response(
          JSON.stringify({ error: `Failed to list campaigns: ${error.message}` }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (action === "get-mappings-for-campaign") {
      const { tortsharkCampaignId } = requestData;

      if (!tortsharkCampaignId) {
        return new Response(
          JSON.stringify({ error: "Missing tortsharkCampaignId parameter" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        // Use the correct table: campaign_ad_mappings
        const { data, error } = await adminClient
          .from("campaign_ad_mappings")
          .select("*")
          .eq("tortshark_campaign_id", tortsharkCampaignId);

        if (error) {
          console.error("Error fetching mappings:", error);
          return new Response(
            JSON.stringify({ error: `Failed to fetch mappings: ${error.message}` }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log(`Successfully retrieved ${data?.length || 0} mappings for campaign ${tortsharkCampaignId}`);
        return new Response(
          JSON.stringify({ mappings: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error fetching campaign mappings:", error);
        return new Response(
          JSON.stringify({ error: `Failed to fetch mappings: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (action === "delete-mapping") {
      const { tortsharkCampaignId, googleAccountId, googleCampaignId } = requestData;

      if (!tortsharkCampaignId || !googleAccountId || !googleCampaignId) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      try {
        // Use the correct table: campaign_ad_mappings
        const { data, error } = await adminClient
          .from("campaign_ad_mappings")
          .delete()
          .eq("tortshark_campaign_id", tortsharkCampaignId)
          .eq("google_account_id", googleAccountId)
          .eq("google_campaign_id", googleCampaignId);

        if (error) {
          console.error("Error deleting mapping:", error);
          return new Response(
            JSON.stringify({ error: `Failed to delete mapping: ${error.message}` }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        console.log("Campaign mapping deleted successfully");
        return new Response(
          JSON.stringify({ success: true, data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error deleting campaign mapping:", error);
        return new Response(
          JSON.stringify({ error: `Failed to delete mapping: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Default response for unrecognized action
    return new Response(
      JSON.stringify({ error: `Invalid action: ${action}` }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in google-ads-mapping edge function:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
