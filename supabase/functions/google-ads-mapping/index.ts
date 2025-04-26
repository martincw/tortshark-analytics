
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getGoogleToken(userId: string) {
  console.log("Getting Google token for user:", userId);
  
  try {
    const { data, error } = await supabase
      .from("google_ads_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("Database error getting token:", error);
      throw new Error(`Failed to fetch Google Ads token: ${error.message}`);
    }
    
    if (!data?.access_token) {
      console.error("No token found for user:", userId);
      throw new Error("No Google Ads token found");
    }
    
    // Check if token is expired and refresh it if needed
    if (new Date(data.expires_at) < new Date() && data.refresh_token) {
      console.log("Token is expired, refreshing token");
      const newToken = await refreshGoogleToken(data.refresh_token);
      
      // Update the token in the database
      const { error: updateError } = await supabase
        .from("google_ads_tokens")
        .update({
          access_token: newToken.access_token,
          expires_at: new Date(Date.now() + newToken.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId);
        
      if (updateError) {
        console.error("Error updating token:", updateError);
      }
      
      console.log("Successfully refreshed and updated token");
      return newToken.access_token;
    }
    
    console.log("Successfully retrieved valid Google token");
    return data.access_token;
  } catch (error) {
    console.error("Error in getGoogleToken:", error);
    throw error;
  }
}

async function refreshGoogleToken(refreshToken: string) {
  const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth credentials not configured");
  }
  
  try {
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
      throw new Error(`Failed to refresh token: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error refreshing Google token:", error);
    throw error;
  }
}

async function listGoogleAdsCampaigns(accessToken: string, customerId: string) {
  console.log(`Listing campaigns for customer ID: ${customerId}`);
  
  if (!customerId) {
    throw new Error("Customer ID is required");
  }
  
  if (!GOOGLE_ADS_DEVELOPER_TOKEN) {
    console.error("Google Ads Developer Token is not configured");
    throw new Error("Google Ads Developer Token is missing");
  }
  
  try {
    const endpoint = `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:search`;
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign
      ORDER BY campaign.name
    `;
    
    console.log(`Making Google Ads API request to ${endpoint}`);
    console.log(`Using developer token: ${GOOGLE_ADS_DEVELOPER_TOKEN.substring(0, 5)}...`);
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google Ads API error (${response.status}):`, errorText);
      throw new Error(`Google Ads API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    if (!data.results) {
      console.log("No campaign results returned");
      return [];
    }
    
    const campaigns = data.results.map((result: any) => ({
      id: result.campaign.id,
      name: result.campaign.name,
      status: result.campaign.status
    }));
    
    console.log(`Successfully fetched ${campaigns.length} campaigns`);
    return campaigns;
  } catch (error) {
    console.error("Error listing Google campaigns:", error);
    throw error;
  }
}

async function createCampaignMapping(tortsharkCampaignId: string, googleAccountId: string, googleCampaignId: string, googleCampaignName: string) {
  try {
    console.log(`Creating mapping for campaign ${googleCampaignId} to Tortshark campaign ${tortsharkCampaignId}`);
    
    const { data, error } = await supabase
      .from("campaign_ad_mappings")
      .upsert({
        tortshark_campaign_id: tortsharkCampaignId,
        google_account_id: googleAccountId,
        google_campaign_id: googleCampaignId,
        google_campaign_name: googleCampaignName,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
      
    if (error) {
      console.error("Error creating campaign mapping:", error);
      throw new Error(`Failed to create campaign mapping: ${error.message}`);
    }
    
    console.log("Campaign mapping created successfully:", data);
    return data;
  } catch (error) {
    console.error("Error in createCampaignMapping:", error);
    throw error;
  }
}

async function deleteCampaignMapping(tortsharkCampaignId: string, googleAccountId: string, googleCampaignId: string) {
  try {
    console.log(`Deleting mapping for campaign ${googleCampaignId}`);
    
    const { error } = await supabase
      .from("campaign_ad_mappings")
      .delete()
      .eq("tortshark_campaign_id", tortsharkCampaignId)
      .eq("google_account_id", googleAccountId)
      .eq("google_campaign_id", googleCampaignId);
      
    if (error) {
      console.error("Error deleting campaign mapping:", error);
      throw new Error(`Failed to delete campaign mapping: ${error.message}`);
    }
    
    console.log("Campaign mapping deleted successfully");
    return true;
  } catch (error) {
    console.error("Error in deleteCampaignMapping:", error);
    throw error;
  }
}

// Main serve function
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Invalid authorization token");
    }
    
    console.log("Processing request for user:", user.id);
    
    const requestData = await req.json();
    const { action } = requestData;
    
    if (action === "list-available-campaigns") {
      try {
        const { googleAccountId } = requestData;
        
        if (!googleAccountId) {
          throw new Error("Account ID is required");
        }
        
        // Get access token from database
        const accessToken = await getGoogleToken(user.id);
        
        // Check developer token
        if (!GOOGLE_ADS_DEVELOPER_TOKEN) {
          return new Response(
            JSON.stringify({ 
              error: "Google Ads Developer Token is not configured",
              campaigns: [] 
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        // List campaigns
        const campaigns = await listGoogleAdsCampaigns(accessToken, googleAccountId);
        
        return new Response(
          JSON.stringify({ campaigns }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error listing available campaigns:", error);
        return new Response(
          JSON.stringify({ 
            error: error instanceof Error ? error.message : "Failed to list campaigns",
            campaigns: [] 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } else if (action === "create-mapping") {
      try {
        const { tortsharkCampaignId, googleAccountId, googleCampaignId, googleCampaignName } = requestData;
        
        if (!tortsharkCampaignId || !googleAccountId || !googleCampaignId || !googleCampaignName) {
          throw new Error("Missing required mapping parameters");
        }
        
        const result = await createCampaignMapping(
          tortsharkCampaignId, 
          googleAccountId, 
          googleCampaignId, 
          googleCampaignName
        );
        
        return new Response(
          JSON.stringify({ success: true, data: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error creating mapping:", error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: error instanceof Error ? error.message : "Failed to create mapping" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    } else if (action === "delete-mapping") {
      try {
        const { tortsharkCampaignId, googleAccountId, googleCampaignId } = requestData;
        
        if (!tortsharkCampaignId || !googleAccountId || !googleCampaignId) {
          throw new Error("Missing required mapping parameters");
        }
        
        await deleteCampaignMapping(tortsharkCampaignId, googleAccountId, googleCampaignId);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error deleting mapping:", error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: error instanceof Error ? error.message : "Failed to delete mapping" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }
    
    // If action is not recognized
    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Internal server error" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
