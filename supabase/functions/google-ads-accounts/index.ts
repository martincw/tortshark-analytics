
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_ADS_API_VERSION = "v15";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchAccountsList(accessToken: string): Promise<any[]> {
  try {
    console.log("Fetching Google Ads accounts with provided access token");
    
    // Developer token for Google Ads API
    const developerToken = "Ngh3IukgQ3ovdkH3M0smUg";
    
    // First, fetch the accessible customers
    const managerResponse = await fetch(
      "https://googleads.googleapis.com/v15/customers:listAccessibleCustomers",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": developerToken,
        },
      }
    );
    
    if (!managerResponse.ok) {
      const errorText = await managerResponse.text();
      console.error("Failed to fetch accessible customers:", errorText);
      throw new Error(`Failed to fetch accessible customers: ${errorText}`);
    }
    
    const { resourceNames } = await managerResponse.json();
    
    if (!resourceNames || !Array.isArray(resourceNames) || resourceNames.length === 0) {
      console.log("No accessible accounts found");
      return [];
    }
    
    console.log(`Found ${resourceNames.length} accessible accounts:`, resourceNames);
    
    // Extract customer IDs from resource names (format: 'customers/1234567890')
    const customerIds = resourceNames.map((name) => name.split('/')[1]);
    
    // Now fetch details for each customer ID
    const accounts = await Promise.all(
      customerIds.map(async (customerId) => {
        try {
          const customerResponse = await fetch(
            `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}`,
            {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "developer-token": developerToken,
              },
            }
          );
          
          if (!customerResponse.ok) {
            console.error(`Failed to fetch details for customer ${customerId}: ${await customerResponse.text()}`);
            return {
              id: customerId,
              customerId: customerId,
              name: `Account ${customerId}`,
              currency: "USD",
              timeZone: "America/New_York",
              status: "UNKNOWN"
            };
          }
          
          const customerData = await customerResponse.json();
          
          return {
            id: customerId,
            customerId: customerId,
            name: customerData.customer?.descriptiveName || `Account ${customerId}`,
            currency: customerData.customer?.currencyCode || "USD",
            timeZone: customerData.customer?.timeZone || "America/New_York",
            status: customerData.customer?.status || "ENABLED",
            platform: "Google Ads",
            isConnected: true
          };
        } catch (error) {
          console.error(`Error fetching details for customer ${customerId}:`, error);
          return {
            id: customerId,
            customerId: customerId,
            name: `Account ${customerId}`,
            currency: "USD",
            timeZone: "America/New_York",
            status: "ENABLED",
            platform: "Google Ads",
            isConnected: true
          };
        }
      })
    );
    
    // Filter out null values (failed requests)
    return accounts.filter(account => account !== null);
  } catch (error) {
    console.error("Error fetching Google Ads accounts:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, accessToken } = await req.json();
    
    if (action === "list-accounts") {
      if (!accessToken) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Missing access token" 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        // Fetch real Google Ads accounts
        const accounts = await fetchAccountsList(accessToken);
        
        return new Response(
          JSON.stringify({ success: true, accounts }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error fetching Google Ads accounts:", error);
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Failed to fetch Google Ads accounts",
            stack: error.stack
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in google-ads-accounts function:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Internal server error",
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
