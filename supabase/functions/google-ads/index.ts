
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      throw new Error("Invalid authorization token");
    }

    console.log("Processing request for user:", user.id);
    const requestData = await req.json();
    const { action } = requestData;

    // Action to get developer token
    if (action === "get-developer-token") {
      if (!GOOGLE_ADS_DEVELOPER_TOKEN) {
        console.error("Google Ads Developer Token not found in environment variables");
        return new Response(
          JSON.stringify({ 
            error: "Google Ads Developer Token not configured",
            developerToken: null
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }

      return new Response(
        JSON.stringify({ developerToken: GOOGLE_ADS_DEVELOPER_TOKEN }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Action to get credentials
    if (action === "get-credentials") {
      // Use the admin client to get tokens (bypassing RLS)
      const { data: tokenData, error: tokenError } = await adminClient
        .from("google_ads_tokens")
        .select("access_token, refresh_token, expires_at, email")
        .eq("user_id", user.id)
        .single();
      
      if (tokenError || !tokenData) {
        console.error("Error fetching token data:", tokenError);
        return new Response(
          JSON.stringify({ error: "Failed to retrieve credentials" }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      return new Response(
        JSON.stringify(tokenData),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Action to list Google Ads accounts
    if (action === "accounts") {
      console.log("Fetching Google Ads accounts for user:", user.id);
      
      try {
        // Get the user's Google Ads token from the database
        const { data: tokenData, error: tokenError } = await adminClient
          .from("google_ads_tokens")
          .select("access_token, refresh_token, expires_at")
          .eq("user_id", user.id)
          .single();

        if (tokenError || !tokenData) {
          console.error("Token error:", tokenError || "No token found");
          return new Response(
            JSON.stringify({ error: "Google Ads authentication not set up" }),
            { 
              status: 401, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }

        // Check if token is expired and needs refresh
        let accessToken = tokenData.access_token;
        const isExpired = new Date(tokenData.expires_at) < new Date();
        
        if (isExpired && tokenData.refresh_token) {
          console.log("Token expired, refreshing...");
          const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
          const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
          
          const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: GOOGLE_CLIENT_ID,
              client_secret: GOOGLE_CLIENT_SECRET,
              refresh_token: tokenData.refresh_token,
              grant_type: "refresh_token",
            }).toString(),
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            accessToken = refreshData.access_token;
            
            // Update the stored token
            const expiryDate = new Date(Date.now() + refreshData.expires_in * 1000);
            await adminClient
              .from("google_ads_tokens")
              .update({
                access_token: accessToken,
                expires_at: expiryDate.toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq("user_id", user.id);
            
            console.log("Token refreshed successfully");
          } else {
            const errorText = await refreshResponse.text();
            console.error("Token refresh failed:", errorText);
            return new Response(
              JSON.stringify({ error: "Failed to refresh authentication. Please reconnect your Google Ads account." }),
              { 
                status: 401, 
                headers: { ...corsHeaders, "Content-Type": "application/json" } 
              }
            );
          }
        }
        
        // Call the Google Ads API to list accessible customers
        console.log("Calling Google Ads API to list accessible customers...");
        const listCustomersResponse = await fetch(
          "https://googleads.googleapis.com/v18/customers:listAccessibleCustomers",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
            },
          }
        );
        
        if (!listCustomersResponse.ok) {
          const errorText = await listCustomersResponse.text();
          console.error("Failed to list accessible customers:", listCustomersResponse.status, errorText);
          
          // Check for specific error types
          if (listCustomersResponse.status === 401) {
            return new Response(
              JSON.stringify({ error: "Google Ads authentication expired. Please reconnect your account." }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          
          return new Response(
            JSON.stringify({ 
              error: `Google Ads API error: ${listCustomersResponse.status}`,
              details: errorText,
              accounts: []
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const { resourceNames } = await listCustomersResponse.json();
        
        if (!resourceNames || !Array.isArray(resourceNames) || resourceNames.length === 0) {
          console.log("No accessible accounts found for this user");
          return new Response(
            JSON.stringify({ 
              accounts: [],
              message: "No Google Ads accounts found. The Google account you connected may not have access to any Google Ads accounts."
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log(`Found ${resourceNames.length} accessible accounts`);
        
        // Extract customer IDs from resource names (format: 'customers/1234567890')
        const customerIds = resourceNames.map((name: string) => name.split('/')[1]);
        
        // Get details for each customer ID
        const accounts = await Promise.all(
          customerIds.map(async (customerId: string) => {
            try {
              const customerResponse = await fetch(
                `https://googleads.googleapis.com/v18/customers/${customerId}`,
                {
                  method: "GET",
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
                  },
                }
              );
              
              if (!customerResponse.ok) {
                console.log(`Could not fetch details for customer ${customerId}, using basic info`);
                return {
                  id: customerId,
                  customerId: customerId,
                  name: `Account ${customerId}`,
                  status: "ENABLED",
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
              };
            } catch (error) {
              console.error(`Error fetching details for customer ${customerId}:`, error);
              return {
                id: customerId,
                customerId: customerId,
                name: `Account ${customerId}`,
                status: "ENABLED",
              };
            }
          })
        );
        
        const validAccounts = accounts.filter(account => account !== null);
        console.log(`Returning ${validAccounts.length} valid accounts`);
        
        return new Response(
          JSON.stringify({ accounts: validAccounts }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error fetching Google Ads accounts:", error);
        return new Response(
          JSON.stringify({ error: `Failed to fetch accounts: ${error.message}` }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }
    
    // Handle refresh token action
    if (action === "refresh") {
      console.log("Manually refreshing token for user:", user.id);
      
      try {
        const { data: refreshData, error: refreshError } = await supabase.functions.invoke("google-oauth", {
          body: { action: "refresh" }
        });
        
        if (refreshError || !refreshData?.success) {
          console.error("Token refresh failed:", refreshError || refreshData?.error);
          return new Response(
            JSON.stringify({ error: "Failed to refresh authentication", success: false }),
            { 
              status: 401, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error refreshing token:", error);
        return new Response(
          JSON.stringify({ error: `Failed to refresh token: ${error.message}`, success: false }),
          { 
            status: 500, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }
    
    // Handle token validation action
    if (action === "validate") {
      console.log("Validating token for user:", user.id);
      
      try {
        const { data: tokenData, error: tokenError } = await adminClient
          .from("google_ads_tokens")
          .select("access_token, expires_at")
          .eq("user_id", user.id)
          .single();
          
        if (tokenError || !tokenData?.access_token) {
          console.error("Token validation error:", tokenError || "No token found");
          return new Response(
            JSON.stringify({ valid: false, error: "No Google Ads token found" }),
            { 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
            }
          );
        }
        
        const isExpired = new Date(tokenData.expires_at) < new Date();
        
        return new Response(
          JSON.stringify({ valid: !isExpired }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error validating token:", error);
        return new Response(
          JSON.stringify({ valid: false, error: `Token validation failed: ${error.message}` }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
    }

    // Default response for unrecognized action
    return new Response(
      JSON.stringify({ error: `Invalid action: ${action}` }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in google-ads edge function:", error);
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
