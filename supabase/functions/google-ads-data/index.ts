
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generate mock metrics data
// In a real implementation, this would call the Google Ads API
const generateMockMetrics = (startDate: string, endDate: string) => {
  const metrics = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Loop through each day in the date range
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().split('T')[0];
    const impressions = Math.floor(Math.random() * 5000) + 1000;
    const clicks = Math.floor(Math.random() * 300) + 50;
    const ctr = clicks / impressions * 100;
    const cpc = (Math.random() * 1.5) + 0.5;
    const adSpend = clicks * cpc;
    const cpl = adSpend / (Math.floor(Math.random() * 10) + 1);
    
    metrics.push({
      impressions,
      clicks,
      ctr,
      cpc,
      cpl,
      adSpend,
      date
    });
  }
  
  return metrics;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Get user ID from the auth header
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("User authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Parse the request body
    const requestData = await req.json();
    const { action, customerId, startDate, endDate } = requestData;
    
    if (action === "get-metrics") {
      if (!customerId || !startDate || !endDate) {
        return new Response(
          JSON.stringify({ error: "Missing required parameters" }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Get stored tokens for the user
      const { data: tokens, error: tokensError } = await supabase
        .from("google_ads_tokens")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (tokensError || !tokens) {
        console.error("Error fetching tokens:", tokensError);
        return new Response(
          JSON.stringify({ success: false, error: "Tokens not found" }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Check if token is expired and refresh if needed
      const isExpired = new Date(tokens.expires_at) <= new Date();
      let accessToken = tokens.access_token;
      
      if (isExpired && tokens.refresh_token) {
        console.log("Token expired, refreshing...");
        
        // Refresh token
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: tokens.refresh_token,
          }),
        });
        
        if (!refreshResponse.ok) {
          console.error("Token refresh failed:", await refreshResponse.text());
          return new Response(
            JSON.stringify({ success: false, error: "Failed to refresh token" }),
            { 
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const newTokens = await refreshResponse.json();
        accessToken = newTokens.access_token;
        
        // Update stored tokens
        await supabase
          .from("google_ads_tokens")
          .update({
            access_token: newTokens.access_token,
            expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          })
          .eq("user_id", user.id);
      }
      
      // TODO: In a real implementation, use the access token to call the Google Ads API
      // For now, we're generating mock data
      const metrics = generateMockMetrics(startDate, endDate);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          metrics
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
      JSON.stringify({ error: error.message || "Internal server error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
