
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// This function calls the Google Ads API to fetch accounts
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    // This would be a real call to the Google Ads API
    // For now, we'll return some sample accounts to demonstrate the flow
    // In a production environment, you should implement the real API call
    
    // Sample response data
    const accountsData = [
      {
        id: "1234567890",
        name: "Main Google Ads Account",
        status: "ENABLED",
        customerId: "123-456-7890",
      },
      {
        id: "0987654321",
        name: "Secondary Marketing Account",
        status: "ENABLED",
        customerId: "098-765-4321",
      }
    ];

    return new Response(JSON.stringify(accountsData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in google-accounts function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
