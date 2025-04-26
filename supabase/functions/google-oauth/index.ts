import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
    );

    // Get JWT token from request header and verify user
    const authHeader = req.headers.get('Authorization');
    console.log("Authorization Header:", authHeader); // Detailed logging

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

    // Validate required environment variables
    const requiredEnvVars = ['SITE_URL', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
    const missingEnvVars = requiredEnvVars.filter(envVar => !Deno.env.get(envVar));
    
    if (missingEnvVars.length > 0) {
      console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Configuration error: Missing ${missingEnvVars.join(', ')}` 
        }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Verify user explicitly
    const { data: { user }, error: userError } = await supabase.auth.getUser(
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
    const { action, code, state } = await req.json();
    
    // Handle auth initiation
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
        authUrl.searchParams.set("state", state || "");
        
        return new Response(
          JSON.stringify({ success: true, url: authUrl.toString() }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error creating auth URL:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to create authentication URL" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // Handle callback
    if (action === "callback" && code) {
      try {
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
        
        // Store tokens in database
        const { error: dbError } = await supabase
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
          JSON.stringify({ 
            success: false, 
            error: error instanceof Error ? error.message : "Failed to process callback" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }
    }

    // Handle validation
    if (action === "validate") {
      try {
        const { data: tokens, error: tokensError } = await supabase
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
