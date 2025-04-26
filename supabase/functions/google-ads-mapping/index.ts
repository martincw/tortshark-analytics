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
      throw new Error("Failed to fetch Google Ads token");
    }
    
    if (!data?.access_token) {
      console.error("No token found for user:", userId);
      throw new Error("No Google Ads token found");
    }
    
    if (new Date(data.expires_at) < new Date()) {
      console.log("Token is expired, should refresh");
      // Token refresh logic would go here
    }
    
    console.log("Successfully retrieved Google token");
    return data.access_token;
  } catch (error) {
    console.error("Error in getGoogleToken:", error);
    throw error;
  }
}

async function listGoogleAdsCampaigns(accessToken: string, customerId: string) {
  console.log(`Listing campaigns for customer ID: ${customerId}`);
  
  if (!customerId) {
    throw new Error("Customer ID is required");
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
