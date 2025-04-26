
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";

// Updated API version
const GOOGLE_ADS_API_VERSION = "v18";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getGoogleToken(userId: string) {
  const { data: tokens, error } = await supabase
    .from("google_ads_tokens")
    .select("access_token")
    .eq("user_id", userId)
    .single();

  if (error || !tokens?.access_token) {
    throw new Error("No valid Google token found");
  }

  return tokens.access_token;
}

async function fetchCampaignsForAccount(accessToken: string, customerId: string) {
  try {
    const response = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
            SELECT 
              campaign.id,
              campaign.name,
              campaign.status
            FROM campaign
            ORDER BY campaign.name
          `,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch campaigns: ${error}`);
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { action, tortsharkCampaignId, googleAccountId, googleCampaignId, googleCampaignName } = await req.json();

    switch (action) {
      case "list-available-campaigns": {
        const accessToken = await getGoogleToken(user.id);
        const campaigns = await fetchCampaignsForAccount(accessToken, googleAccountId);
        
        return new Response(JSON.stringify({ success: true, campaigns }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "create-mapping": {
        const { error: mappingError } = await supabase
          .from("campaign_ad_mappings")
          .insert({
            tortshark_campaign_id: tortsharkCampaignId,
            google_account_id: googleAccountId,
            google_campaign_id: googleCampaignId,
            google_campaign_name: googleCampaignName
          });

        if (mappingError) {
          throw new Error(`Failed to create mapping: ${mappingError.message}`);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "delete-mapping": {
        const { error: deleteError } = await supabase
          .from("campaign_ad_mappings")
          .delete()
          .match({ 
            tortshark_campaign_id: tortsharkCampaignId,
            google_account_id: googleAccountId,
            google_campaign_id: googleCampaignId
          });

        if (deleteError) {
          throw new Error(`Failed to delete mapping: ${deleteError.message}`);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        throw new Error("Invalid action");
    }
  } catch (error) {
    console.error("Error in google-ads-mapping function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
