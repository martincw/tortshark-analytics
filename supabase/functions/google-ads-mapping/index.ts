import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function getGoogleToken(userId: string) {
  try {
    const { data, error } = await supabase
      .from("google_ads_tokens")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error || !data || !data.access_token) {
      console.error("Error getting Google token:", error);
      throw new Error("No Google Ads token found");
    }
    
    // Check if token is expired and refresh if needed
    if (new Date(data.expires_at) < new Date() && data.refresh_token) {
      // Refresh token logic would go here
      console.log("Token is expired, should refresh");
    }
    
    return data.access_token;
  } catch (error) {
    console.error("Error in getGoogleToken:", error);
    throw error;
  }
}

async function getActualCustomerId(userId: string, accountId: string): Promise<string> {
  try {
    // Check if this is already a valid customer ID (numeric string)
    if (/^\d+$/.test(accountId)) {
      return accountId;
    }
    
    // Otherwise, look up the customer_id from account_connections
    const { data, error } = await supabase
      .from("account_connections")
      .select("customer_id")
      .eq("id", accountId)
      .eq("user_id", userId)
      .maybeSingle();
    
    if (error) {
      console.error("Error getting customer ID:", error);
      throw new Error("Error fetching account data");
    }
    
    if (!data || !data.customer_id) {
      throw new Error(`No customer ID found for account ${accountId}`);
    }
    
    return data.customer_id;
  } catch (error) {
    console.error("Error in getActualCustomerId:", error);
    throw error;
  }
}

async function listGoogleCampaigns(accessToken: string, customerId: string) {
  try {
    console.log(`Listing Google Ads campaigns for customer ID: ${customerId}`);
    
    const apiVersion = "v16"; // Use appropriate version
    const endpoint = `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}/googleAds:search`;
    
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status
      FROM campaign
      ORDER BY campaign.name
    `;
    
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
      throw new Error(`Google Ads API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results) {
      console.log("No campaign results returned");
      return [];
    }
    
    return data.results.map((result: any) => ({
      id: result.campaign.id,
      name: result.campaign.name,
      status: result.campaign.status
    }));
  } catch (error) {
    console.error("Error listing Google campaigns:", error);
    throw error;
  }
}

async function createMapping(userId: string, data: any) {
  try {
    const { tortsharkCampaignId, googleAccountId, googleCampaignId, googleCampaignName } = data;
    
    // Validate all required data is present
    if (!tortsharkCampaignId || !googleAccountId || !googleCampaignId || !googleCampaignName) {
      throw new Error("Missing required mapping data");
    }
    
    // Check if campaign belongs to user
    const { data: campaignData, error: campaignError } = await supabase
      .from("campaigns")
      .select("id")
      .eq("id", tortsharkCampaignId)
      .eq("user_id", userId)
      .maybeSingle();
    
    if (campaignError || !campaignData) {
      throw new Error("Campaign not found or access denied");
    }
    
    // Check if mapping already exists
    const { data: existingMapping, error: existingMappingError } = await supabase
      .from("campaign_ad_mappings")
      .select("id")
      .eq("tortshark_campaign_id", tortsharkCampaignId)
      .eq("google_account_id", googleAccountId)
      .eq("google_campaign_id", googleCampaignId)
      .maybeSingle();
    
    if (existingMappingError) {
      console.error("Error checking existing mapping:", existingMappingError);
    }
    
    if (existingMapping) {
      console.log("Mapping already exists");
      return { success: true, message: "Mapping already exists" };
    }
    
    // Create new mapping
    const { error: insertError } = await supabase
      .from("campaign_ad_mappings")
      .insert({
        tortshark_campaign_id: tortsharkCampaignId,
        google_account_id: googleAccountId,
        google_campaign_id: googleCampaignId,
        google_campaign_name: googleCampaignName,
        is_active: true
      });
    
    if (insertError) {
      throw new Error(`Failed to create mapping: ${insertError.message}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error creating mapping:", error);
    throw error;
  }
}

// Main serve function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get bearer token from authorization header
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Get user ID from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = user.id;
    
    // Get request data
    const requestData = await req.json();
    const { action } = requestData;
    
    // List available Google campaigns for account
    if (action === "list-available-campaigns") {
      try {
        const { googleAccountId } = requestData;
        
        if (!googleAccountId) {
          return new Response(
            JSON.stringify({ error: "Account ID is required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Get access token from database
        const accessToken = await getGoogleToken(userId);
        
        // Get the actual customer ID (which might be different from the account ID)
        const customerId = await getActualCustomerId(userId, googleAccountId);
        
        console.log(`Using customer ID: ${customerId} for account ID: ${googleAccountId}`);
        
        // List campaigns
        const campaigns = await listGoogleCampaigns(accessToken, customerId);
        
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
    }
    
    // Create mapping between Tortshark campaign and Google Ads campaign
    if (action === "create-mapping") {
      try {
        const result = await createMapping(userId, requestData);
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error creating mapping:", error);
        
        return new Response(
          JSON.stringify({ 
            error: error instanceof Error ? error.message : "Failed to create mapping" 
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
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
