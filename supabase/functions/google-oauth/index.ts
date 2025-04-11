
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

// Make redirect URI configurable through environment variables
const REDIRECT_URI = Deno.env.get("SITE_URL") ? 
  `${Deno.env.get("SITE_URL")}/integrations` : 
  "https://app.tortshark.com/integrations";

// Google Ads API OAuth scopes - Updated to use valid scopes
const GOOGLE_ADS_API_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid", // Add openid scope which is often required
  "profile" // Add profile scope for basic info
];

// CORS headers for browser requests - expanded for better compatibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400" // 24 hours
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const requestData = await req.json();
    const action = requestData.action;
    
    // Initiate OAuth flow
    if (action === "authorize") {
      console.log("Initiating Google OAuth flow");
      
      try {
        // Use the redirect URI from the request or fall back to default
        const redirectUri = requestData.redirectUri || REDIRECT_URI;
        
        // Enhanced debugging for environment variables
        const envDebug = {
          SUPABASE_URL: SUPABASE_URL ? `${SUPABASE_URL.substring(0, 10)}...` : "MISSING",
          SUPABASE_ANON_KEY: SUPABASE_ANON_KEY ? "SET" : "MISSING",
          GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 5)}...` : "MISSING",
          GOOGLE_CLIENT_SECRET: GOOGLE_CLIENT_SECRET ? "SET" : "MISSING",
          REDIRECT_URI: redirectUri,
          SITE_URL: Deno.env.get("SITE_URL") || "NOT SET"
        };
        
        console.log("Environment configuration:", envDebug);
        
        if (!GOOGLE_CLIENT_ID) {
          throw new Error("GOOGLE_CLIENT_ID is not configured");
        }
        
        if (!GOOGLE_CLIENT_SECRET) {
          throw new Error("GOOGLE_CLIENT_SECRET is not configured");
        }
        
        // Construct Google OAuth URL with more explicit parameters
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.append("client_id", GOOGLE_CLIENT_ID);
        authUrl.searchParams.append("redirect_uri", redirectUri);
        authUrl.searchParams.append("response_type", "code");
        
        // Join scopes with a space as required by OAuth 2.0
        authUrl.searchParams.append("scope", GOOGLE_ADS_API_SCOPES.join(" "));
        
        authUrl.searchParams.append("access_type", "offline");
        authUrl.searchParams.append("prompt", "consent select_account");
        
        // Add state parameter for security
        const state = crypto.randomUUID();
        authUrl.searchParams.append("state", state);
        
        // Include login_hint if we have a user email from the request
        if (requestData.email) {
          authUrl.searchParams.append("login_hint", requestData.email);
        }
        
        console.log("Full OAuth URL:", authUrl.toString());
        
        return new Response(JSON.stringify({ 
          url: authUrl.toString(),
          debug: {
            client_id_length: GOOGLE_CLIENT_ID.length,
            redirect_uri: redirectUri,
            has_client_secret: GOOGLE_CLIENT_SECRET.length > 0,
            scopes: GOOGLE_ADS_API_SCOPES.join(" ")
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error generating OAuth URL:", error);
        return new Response(JSON.stringify({ 
          error: "Failed to generate OAuth URL", 
          details: error.message,
          env_vars_set: {
            GOOGLE_CLIENT_ID: !!GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: !!GOOGLE_CLIENT_SECRET,
            SUPABASE_URL: !!SUPABASE_URL,
            SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY,
            SITE_URL: !!Deno.env.get("SITE_URL")
          }
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    // Handle OAuth callback
    if (action === "callback") {
      const code = requestData.code || "";
      
      if (!code) {
        throw new Error("No authorization code provided");
      }
      
      console.log("Exchanging authorization code for tokens");
      
      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: requestData.redirectUri || REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        throw new Error(`Failed to exchange code: ${tokenResponse.status} ${errorText}`);
      }
      
      const tokens = await tokenResponse.json();
      
      // Get user info to get their Google ID
      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      });
      
      const userInfo = await userInfoResponse.json();
      
      // Get user ID from the auth header
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("User authentication error:", userError);
        throw new Error("Unauthorized");
      }
      
      // Store tokens in Supabase
      const { error: storeError } = await supabase
        .from("google_ads_tokens")
        .upsert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          scope: tokens.scope,
        }, { onConflict: "user_id" });
      
      if (storeError) {
        console.error("Error storing tokens:", storeError);
        throw new Error("Failed to store authentication tokens");
      }
      
      // In production, you would get this from the Google Ads API
      // But for this example, we're using a test customer ID
      const customerId = "1234567890";
      const developerToken = "Ngh3IukgQ3ovdkH3M0smUg";
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          customerId, 
          developerToken,
          accessToken: tokens.access_token,
          userEmail: userInfo.email
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Get stored tokens for a user
    if (action === "get-credentials") {
      // Get user ID from the auth header
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("User authentication error:", userError);
        throw new Error("Unauthorized");
      }
      
      // Get stored tokens
      const { data: tokens, error: tokensError } = await supabase
        .from("google_ads_tokens")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (tokensError) {
        console.error("Error fetching tokens:", tokensError);
        throw new Error("Failed to retrieve authentication tokens");
      }
      
      if (!tokens) {
        return new Response(
          JSON.stringify({ success: false, error: "No credentials found" }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Check if token is expired
      const isExpired = new Date(tokens.expires_at) <= new Date();
      
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
          throw new Error("Failed to refresh token");
        }
        
        const newTokens = await refreshResponse.json();
        
        // Update stored tokens
        await supabase
          .from("google_ads_tokens")
          .update({
            access_token: newTokens.access_token,
            expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
          })
          .eq("user_id", user.id);
        
        // Return refreshed credentials
        return new Response(
          JSON.stringify({ 
            success: true, 
            customerId: "1234567890", // Mock customer ID
            developerToken: "Ngh3IukgQ3ovdkH3M0smUg",
            accessToken: newTokens.access_token
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Return existing credentials
      return new Response(
        JSON.stringify({ 
          success: true, 
          customerId: "1234567890", // Mock customer ID
          developerToken: "Ngh3IukgQ3ovdkH3M0smUg",
          accessToken: tokens.access_token
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Explicitly refresh token
    if (action === "refresh-token") {
      // Get user ID from the auth header
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("User authentication error:", userError);
        throw new Error("Unauthorized");
      }
      
      // Get refresh token
      const { data: tokens, error: tokensError } = await supabase
        .from("google_ads_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .single();
      
      if (tokensError || !tokens || !tokens.refresh_token) {
        console.error("Error fetching refresh token:", tokensError);
        throw new Error("No refresh token found");
      }
      
      // Refresh the token
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
        throw new Error("Failed to refresh token");
      }
      
      const newTokens = await refreshResponse.json();
      
      // Update stored tokens
      await supabase
        .from("google_ads_tokens")
        .update({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
        })
        .eq("user_id", user.id);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          accessToken: newTokens.access_token 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Revoke access
    if (action === "revoke") {
      // Get user ID from the auth header
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error("User authentication error:", userError);
        throw new Error("Unauthorized");
      }
      
      // Get access token
      const { data: tokens, error: tokensError } = await supabase
        .from("google_ads_tokens")
        .select("access_token")
        .eq("user_id", user.id)
        .single();
      
      if (tokensError || !tokens) {
        console.error("Error fetching token for revocation:", tokensError);
      } else {
        // Call Google's revocation endpoint
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokens.access_token}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
      }
      
      // Delete stored tokens
      await supabase
        .from("google_ads_tokens")
        .delete()
        .eq("user_id", user.id);
      
      return new Response(
        JSON.stringify({ success: true }),
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
    console.error("Error in google-oauth function:", error);
    
    return new Response(
      JSON.stringify({ 
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
