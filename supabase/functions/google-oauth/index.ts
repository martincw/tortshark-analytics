
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, code, state, userId } = await req.json();
    const requestId = Math.random().toString(36).substring(7);
    console.log(`Processing request (${requestId}):`, { action });

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")?.split(" ")[1];
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
    if (userError || !user) {
      throw new Error("Invalid authorization");
    }

    // Handle auth initiation
    if (action === "auth") {
      console.log("Generating OAuth URL");
      const redirectUri = `${Deno.env.get("SITE_URL")}/integrations`;
      
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", Deno.env.get("GOOGLE_CLIENT_ID") || "");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/adwords");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      
      if (state) {
        authUrl.searchParams.set("state", state);
      }

      return new Response(
        JSON.stringify({ success: true, url: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle callback
    if (action === "callback" && code) {
      console.log("Processing callback");
      
      const redirectUri = `${Deno.env.get("SITE_URL")}/integrations`;
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
          scope: tokens.scope
        });

      if (dbError) {
        throw new Error(`Failed to store tokens: ${dbError.message}`);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle validation
    if (action === "validate") {
      const { data: tokens, error: tokensError } = await supabase
        .from("google_ads_tokens")
        .select("access_token, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (tokensError) {
        throw new Error(`Failed to get tokens: ${tokensError.message}`);
      }

      if (!tokens) {
        return new Response(
          JSON.stringify({ valid: false, error: "No tokens found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isExpired = new Date(tokens.expires_at) <= new Date();
      return new Response(
        JSON.stringify({ valid: !isExpired }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Invalid action: ${action}`);
  } catch (error) {
    console.error("Error in edge function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
