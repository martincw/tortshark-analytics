
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const REDIRECT_URI = Deno.env.get("SITE_URL") ? 
  `${Deno.env.get("SITE_URL")}/integrations` : 
  "http://localhost:3000/integrations";

// Google Ads API OAuth scope
const GOOGLE_ADS_API_SCOPE = "https://www.googleapis.com/auth/adwords";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  
  try {
    // Initiate OAuth flow
    if (action === "authorize") {
      console.log("Initiating Google OAuth flow");
      
      // Construct Google OAuth URL
      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.append("client_id", GOOGLE_CLIENT_ID);
      authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.append("response_type", "code");
      authUrl.searchParams.append("scope", GOOGLE_ADS_API_SCOPE);
      authUrl.searchParams.append("access_type", "offline");
      authUrl.searchParams.append("prompt", "consent");
      
      console.log("Redirect URL:", authUrl.toString());
      
      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Handle OAuth callback
    if (action === "callback") {
      const code = url.searchParams.get("code") || "";
      
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
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code",
        }),
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        throw new Error(`Failed to exchange code: ${tokenResponse.status} ${errorText}`);
      }
      
      const tokens = await tokenResponse.json();
      
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
      
      // Get or create mock customer ID for demo purposes
      // In a real implementation, this would come from the Google Ads API
      const customerId = "123-456-7890";
      const developerToken = "Ngh3IukgQ3ovdkH3M0smUg";
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          customerId, 
          developerToken,
          accessToken: tokens.access_token
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
            customerId: "123-456-7890", // Mock customer ID
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
          customerId: "123-456-7890", // Mock customer ID
          developerToken: "Ngh3IukgQ3ovdkH3M0smUg",
          accessToken: tokens.access_token
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
      JSON.stringify({ error: error.message || "Internal server error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
