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
          }
        );
      }

      try {
        // Mock campaigns for testing purposes
        const mockCampaigns = [
          { id: "campaign-1", name: "Campaign 1", status: "RUNNING" },
          { id: "campaign-2", name: "Campaign 2", status: "PAUSED" },
        ];

        console.log(`Successfully listed available campaigns for account ${googleAccountId}`);
        return new Response(
          JSON.stringify({ campaigns: mockCampaigns }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error listing available campaigns:", error);
        return new Response(
          JSON.stringify({ error: `Failed to list campaigns: ${error.message}` }),
          {
            status: 500,
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
