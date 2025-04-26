
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Updated API version
const GOOGLE_ADS_API_VERSION = "v18";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create regular Supabase client for auth
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
    );

    // Get JWT token from request header and verify user
    const authHeader = req.headers.get('Authorization');
    console.log("Authorization Header:", authHeader);

    if (!authHeader) {
      console.error("No authorization header present");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No authorization header",
          details: "Authorization header is missing" 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user explicitly
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Authentication failed",
          details: userError?.message || "Unable to validate user" 
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { action } = requestData;
    
    // Handle various actions
    if (action === "auth") {
      try {
        const redirectUri = `${Deno.env.get("SITE_URL")}/integrations`;
        console.log("Starting auth process with redirect URI:", redirectUri);
        
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", Deno.env.get("GOOGLE_CLIENT_ID") || "");
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/adwords");
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", requestData.state || "");
        
        return new Response(
          JSON.stringify({ success: true, url: authUrl.toString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error creating auth URL:", error);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create authentication URL" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle callback (exchange code for tokens)
    if (action === "callback" && requestData.code) {
      try {
        const code = requestData.code;
        const redirectUri = `${Deno.env.get("SITE_URL")}/integrations`;
        console.log("Processing callback with redirect URI:", redirectUri);
        
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
            client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error("Token exchange failed:", errorText);
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokens = await tokenResponse.json();
        
        // Use admin client to store tokens
        const { error: dbError } = await supabaseAdmin
          .from("google_ads_tokens")
          .upsert({
            user_id: user.id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          });

        if (dbError) {
          console.error("Database error:", dbError);
          throw new Error(`Failed to store tokens: ${dbError.message}`);
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Callback processing error:", error);
        return new Response(
          JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Failed to process callback" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Handle token validation
    if (action === "validate") {
      try {
        const { data: tokens, error: tokensError } = await supabaseAdmin
          .from("google_ads_tokens")
          .select("expires_at")
          .eq("user_id", user.id)
          .maybeSingle();

        if (tokensError) {
          console.error("Token validation error:", tokensError);
          throw new Error(`Failed to get tokens: ${tokensError.message}`);
        }

        if (!tokens) {
          return new Response(
            JSON.stringify({ valid: false }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const isExpired = new Date(tokens.expires_at) <= new Date();
        return new Response(
          JSON.stringify({ valid: !isExpired }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Validation error:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to validate tokens"
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }
    
    // Handle fetching accounts
    if (action === "accounts") {
      try {
        // Get refresh token from database
        const { data: tokens, error: tokensError } = await supabaseAdmin
          .from("google_ads_tokens")
          .select("access_token, refresh_token, expires_at")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (tokensError || !tokens) {
          console.error("Error fetching tokens:", tokensError);
          throw new Error("No tokens found for user");
        }
        
        // Check if token is expired and refresh if needed
        let accessToken = tokens.access_token;
        if (new Date(tokens.expires_at) <= new Date() && tokens.refresh_token) {
          console.log("Access token expired, refreshing...");
          
          const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              client_id: Deno.env.get("GOOGLE_CLIENT_ID") || "",
              client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET") || "",
              refresh_token: tokens.refresh_token,
              grant_type: "refresh_token",
            }),
          });
          
          if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            throw new Error(`Failed to refresh token: ${errorText}`);
          }
          
          const newTokens = await tokenResponse.json();
          accessToken = newTokens.access_token;
          
          // Update token in database
          await supabaseAdmin
            .from("google_ads_tokens")
            .update({
              access_token: accessToken,
              expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            })
            .eq("user_id", user.id);
        }
        
        // Fetch accounts using the Google Ads API
        console.log("Fetching accessible Google Ads accounts...");
        const accountsResponse = await fetch(
          `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "developer-token": Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "",
            },
          }
        );
        
        if (!accountsResponse.ok) {
          const errorText = await accountsResponse.text();
          throw new Error(`Failed to fetch accounts: ${errorText}`);
        }
        
        const { resourceNames } = await accountsResponse.json();
        
        if (!resourceNames || !Array.isArray(resourceNames) || resourceNames.length === 0) {
          return new Response(
            JSON.stringify({ success: true, accounts: [] }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Extract customer IDs and get details
        const customerIds = resourceNames.map(name => name.split('/')[1]);
        const accounts = await Promise.all(
          customerIds.map(async customerId => {
            try {
              // Fetch customer details
              const customerResponse = await fetch(
                `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "developer-token": Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "",
                  },
                }
              );
              
              if (!customerResponse.ok) {
                console.warn(`Error fetching details for customer ${customerId}`);
                return {
                  id: customerId,
                  name: `Account ${customerId}`,
                  customerId: customerId,
                  status: "UNKNOWN",
                  platform: "google"
                };
              }
              
              const customerData = await customerResponse.json();
              return {
                id: customerId,
                name: customerData.customer?.descriptiveName || `Account ${customerId}`,
                customerId: customerId,
                status: customerData.customer?.status || "ENABLED",
                platform: "google"
              };
            } catch (error) {
              console.error(`Error processing account ${customerId}:`, error);
              return null;
            }
          })
        );
        
        // Filter out null values and store accounts
        const validAccounts = accounts.filter(account => account !== null);
        
        // Store accounts in database
        for (const account of validAccounts) {
          await supabaseAdmin
            .from('account_connections')
            .upsert({
              id: account.id,
              user_id: user.id,
              name: account.name,
              platform: 'google',
              customer_id: account.customerId,
              is_connected: true,
              last_synced: new Date().toISOString()
            });
        }
        
        return new Response(
          JSON.stringify({ success: true, accounts: validAccounts }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error in accounts action:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to fetch Google Ads accounts"
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    console.error("Invalid action requested:", action);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Invalid action: ${action}` 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Unexpected error in edge function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Unexpected server error",
        details: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
