
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// This function calls the Google Ads API to fetch campaigns for an account
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Verify authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accessToken = authHeader.split(" ")[1];
    
    // Parse request body
    const { accountId, dateRange } = await req.json();

    if (!accountId) {
      return new Response(
        JSON.stringify({ error: "Missing account ID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // This would be a real call to the Google Ads API
    // For now, we'll return some sample campaigns to demonstrate the flow
    
    // Sample response data
    const campaignsData = [
      {
        id: "camp-" + accountId + "-1",
        name: "Law Firm Lead Generation",
        platform: "google",
        accountId: accountId,
        accountName: "Main Google Ads Account",
        stats: {
          adSpend: 1250.34,
          impressions: 15420,
          clicks: 523,
          cpc: 2.39,
          date: new Date().toISOString()
        },
        manualStats: {
          leads: 48,
          cases: 12,
          retainers: 8,
          revenue: 24000,
          date: new Date().toISOString()
        }
      },
      {
        id: "camp-" + accountId + "-2",
        name: "Personal Injury Awareness",
        platform: "google",
        accountId: accountId,
        accountName: "Main Google Ads Account",
        stats: {
          adSpend: 980.15,
          impressions: 12840,
          clicks: 412,
          cpc: 2.38,
          date: new Date().toISOString()
        },
        manualStats: {
          leads: 35,
          cases: 9,
          retainers: 6,
          revenue: 18000,
          date: new Date().toISOString()
        }
      }
    ];

    return new Response(JSON.stringify(campaignsData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in google-campaigns function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
