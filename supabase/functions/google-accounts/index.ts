
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Google Ads API endpoint for accessible customer accounts
const GOOGLE_ADS_ENDPOINT = "https://googleads.googleapis.com/v14/customers:listAccessibleCustomers";

// This function calls the Google Ads API to fetch actual accounts
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
    
    // Retrieve developer token from environment
    const developerToken = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN");
    if (!developerToken) {
      console.error("GOOGLE_ADS_DEVELOPER_TOKEN is not set in environment variables");
      return new Response(
        JSON.stringify({ 
          error: "Configuration error", 
          message: "Google Ads Developer Token is not configured" 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    console.log("Making request to Google Ads API to fetch real accounts");
    console.log(`Developer token available: ${developerToken ? "Yes" : "No"}`);
    
    // Make an actual API call to Google Ads API
    const response = await fetch(GOOGLE_ADS_ENDPOINT, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "developer-token": developerToken
      }
    });
    
    // Detailed logging of response status
    console.log(`Google Ads API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Ads API Error:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch Google Ads accounts", 
          details: errorText,
          status: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const googleAdsData = await response.json();
    console.log("Google Ads API response:", JSON.stringify(googleAdsData).substring(0, 200) + "...");
    
    // Format the Google Ads response into the structure our frontend expects
    const accountsData = [];
    
    if (googleAdsData && googleAdsData.resourceNames) {
      // The response contains customer IDs in format "customers/1234567890"
      for (const resourceName of googleAdsData.resourceNames) {
        const customerId = resourceName.split("/")[1];
        
        // Fetch additional details for each account if needed
        // For now we'll use basic info from the resource name
        accountsData.push({
          id: customerId, // Use the actual customer ID
          name: `Google Ads Account ${customerId}`,
          status: "ENABLED",
          customerId: customerId
        });
      }
    }
    
    console.log(`Found ${accountsData.length} real Google Ads accounts`);
    
    // If we didn't find any accounts, provide a helpful message
    if (accountsData.length === 0) {
      console.log("No accounts found in Google Ads API response");
      return new Response(
        JSON.stringify({ 
          error: "No Google Ads accounts found", 
          message: "Your Google account doesn't have access to any Google Ads accounts. You may need to create one first in the Google Ads platform."
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    return new Response(JSON.stringify(accountsData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in google-accounts function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        message: "Error fetching Google Ads accounts. Check the Edge Function logs for details."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
