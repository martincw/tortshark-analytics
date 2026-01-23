import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GOOGLE_ADS_API_VERSION = "v16";
const GOOGLE_ADS_DEVELOPER_TOKEN =
  Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

async function refreshGoogleToken(refreshToken: string): Promise<any> {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to refresh token: ${errorText}`);
  }

  return await response.json();
}

async function getGoogleAdsToken(userId: string): Promise<{
  accessToken: string;
  refreshToken?: string;
} | null> {
  const { data, error } = await supabase
    .from("google_ads_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    console.error("Error fetching token:", error);
    return null;
  }

  const isExpired = new Date(data.expires_at) <= new Date();

  if (isExpired && data.refresh_token) {
    const refreshed = await refreshGoogleToken(data.refresh_token);

    await supabase
      .from("google_ads_tokens")
      .update({
        access_token: refreshed.access_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq("user_id", userId)
      .eq("provider", "google");

    return { accessToken: refreshed.access_token, refreshToken: data.refresh_token };
  }

  return { accessToken: data.access_token, refreshToken: data.refresh_token };
}

async function listCampaigns(
  accessToken: string,
  customerId: string,
  developerToken: string,
): Promise<any[]> {
  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status
    FROM campaign
    WHERE campaign.status != 'REMOVED'
    ORDER BY campaign.id
  `;

  const response = await fetch(
    `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": developerToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch campaigns: ${text}`);
  }

  const data = await response.json();
  return (data.results || []).map((r: any) => ({
    id: r.campaign.id,
    name: r.campaign.name,
    status: r.campaign.status,
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
        const { data, error } = await supabase
          .from("campaign_mappings")
          .insert({
            tortshark_campaign_id: tortsharkCampaignId,
            google_account_id: googleAccountId,
            google_campaign_id: googleCampaignId,
            google_campaign_name: googleCampaignName,
            user_id: user.id,
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
          },
        );
      }

      try {
        const tokens = await getGoogleAdsToken(user.id);

        if (!tokens) {
          return new Response(
            JSON.stringify({ error: "Google Ads authentication not found" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        let campaigns = await listCampaigns(
          tokens.accessToken,
          googleAccountId,
          GOOGLE_ADS_DEVELOPER_TOKEN,
        );

        if (campaigns.length === 0 && tokens.refreshToken) {
          const refreshed = await refreshGoogleToken(tokens.refreshToken);

          await supabase
            .from("google_ads_tokens")
            .update({
              access_token: refreshed.access_token,
              expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
            })
            .eq("user_id", user.id)
            .eq("provider", "google");

          campaigns = await listCampaigns(
            refreshed.access_token,
            googleAccountId,
            GOOGLE_ADS_DEVELOPER_TOKEN,
          );
        }

        return new Response(
          JSON.stringify({ campaigns }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      } catch (error) {
        console.error("Error listing available campaigns:", error);
        return new Response(
          JSON.stringify({ error: `Failed to list campaigns: ${error.message}` }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
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
        const { data, error } = await supabase
          .from("campaign_mappings")
          .select("*")
          .eq("tortshark_campaign_id", tortsharkCampaignId)
          .eq("user_id", user.id);

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

        console.log(`Successfully retrieved mappings for campaign ${tortsharkCampaignId}`);
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
        const { data, error } = await supabase
          .from("campaign_mappings")
          .delete()
          .eq("tortshark_campaign_id", tortsharkCampaignId)
          .eq("google_account_id", googleAccountId)
          .eq("google_campaign_id", googleCampaignId)
          .eq("user_id", user.id);

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
