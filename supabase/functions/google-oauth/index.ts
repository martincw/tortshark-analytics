
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
    
    // Get user ID from the auth header
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Add detailed logging
    console.log("Auth header present:", Boolean(authHeader));
    console.log("Token length:", token.length);

    // Only require authentication for non-callback actions
    if (!token && action !== "callback" && action !== "authorize") {
      console.error("No authorization token provided");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unauthorized - No authorization token provided" 
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Only validate user if token is provided
    let user = null;
    if (token) {
      try {
        const { data, error: userError } = await supabase.auth.getUser(token);
        if (userError) {
          console.error("User authentication error:", userError);
          if (action !== "callback" && action !== "authorize") {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Unauthorized - Invalid user session",
                details: userError.message 
              }),
              { 
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } else {
          user = data.user;
          console.log(`User authenticated: ${user?.id || 'unknown'}`);
        }
      } catch (authError) {
        console.error("Error during authentication check:", authError);
        if (action !== "callback" && action !== "authorize") {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Unauthorized - Authentication error",
              details: authError.message 
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }
    
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
        console.error("No authorization code provided");
        return new Response(
          JSON.stringify({ success: false, error: "No authorization code provided" }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      console.log("Exchanging authorization code for tokens");
      
      try {
        // Use redirectUri from the request or fall back to default
        const redirectUri = requestData.redirectUri || REDIRECT_URI;
        console.log("Using redirect URI:", redirectUri);
        
        // Exchange code for tokens with comprehensive error handling
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });
        
        // Log detailed response info for debugging
        const responseStatus = tokenResponse.status;
        const responseTextRaw = await tokenResponse.text();
        
        console.log(`Token exchange response status: ${responseStatus}`);
        console.log(`Token exchange response headers: ${JSON.stringify([...tokenResponse.headers])}`);
        
        if (responseTextRaw.length < 200) {
          // If response is small, log it fully (it's likely an error)
          console.log(`Token exchange response body: ${responseTextRaw}`);
        } else {
          // If response is large, only log a portion (to avoid exposing sensitive data)
          console.log(`Token exchange response body (partial): ${responseTextRaw.substring(0, 100)}...`);
        }
        
        if (!tokenResponse.ok) {
          console.error(`Token exchange failed with status ${responseStatus} and message: ${responseTextRaw}`);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Token exchange failed: ${responseStatus}`,
              details: responseTextRaw.length < 200 ? responseTextRaw : responseTextRaw.substring(0, 200) + "..."
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        let tokens;
        try {
          tokens = JSON.parse(responseTextRaw);
        } catch (parseError) {
          console.error("Error parsing token response:", parseError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Error parsing token response",
              details: parseError.message,
              rawResponse: responseTextRaw.substring(0, 100) + "..."
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Get user info to get their Google ID
        console.log("Fetching user info with access token");
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`
          }
        });
        
        if (!userInfoResponse.ok) {
          console.error(`User info fetch failed: ${userInfoResponse.status}`);
          const userInfoError = await userInfoResponse.text();
          console.error("User info error:", userInfoError);
        }
        
        const userInfo = await userInfoResponse.json();
        console.log("Received user info:", JSON.stringify({
          email: userInfo.email,
          has_id: !!userInfo.id,
          has_name: !!userInfo.name
        }));
        
        // For callback, we'll proceed even without a valid user if there's no token
        if (!user && !token) {
          console.log("No authenticated user, but proceeding with callback");
          // For now, store the tokens directly in localStorage via the return value
          // Later when the user logs in properly, they can retrieve these tokens
          
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
              userEmail: userInfo.email,
              message: "Authentication successful, but no user session. Tokens returned for client storage."
            }),
            { 
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // If we do have a user, store the tokens properly
        if (user) {
          try {
            // Try to create the google_ads_tokens table if it doesn't exist via RPC
            console.log("Ensuring google_ads_tokens table exists");
            try {
              const { data: createTableResult, error: createTableError } = await supabase.rpc('create_google_ads_tokens_if_not_exists');
              
              if (createTableError) {
                console.error("Error creating tokens table via RPC:", createTableError);
              } else {
                console.log("Table creation result:", createTableResult);
              }
            } catch (rpcError) {
              console.error("Exception during table creation RPC:", rpcError);
            }
            
            // Now check if the user already has tokens stored
            console.log("Checking for existing tokens");
            const { data: existingTokens, error: checkError } = await supabase
              .from('google_ads_tokens')
              .select('*')
              .eq('user_id', user.id);
            
            if (checkError) {
              console.error("Error checking existing tokens:", checkError);
              return new Response(
                JSON.stringify({ 
                  success: false, 
                  error: "Database error while checking existing tokens",
                  details: checkError.message
                }),
                { 
                  status: 500,
                  headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
              );
            }
            
            // Define the tokens data
            const tokensData = {
              user_id: user.id,
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              scope: tokens.scope,
              email: userInfo.email,
            };
            
            console.log("Preparing to store tokens");
            let storeError;
            
            if (existingTokens && existingTokens.length > 0) {
              console.log("Updating existing tokens record");
              // Update existing record
              const { error } = await supabase
                .from('google_ads_tokens')
                .update(tokensData)
                .eq('user_id', user.id);
                
              storeError = error;
            } else {
              console.log("Inserting new tokens record");
              // Insert new record
              const { error } = await supabase
                .from('google_ads_tokens')
                .insert([tokensData]);
                
              storeError = error;
            }
            
            if (storeError) {
              console.error("Error storing tokens:", storeError);
              // If there's an error storing in the database, we'll still return the tokens
              // This allows the user to proceed even if the database storage fails
              console.log("Returning tokens directly to client despite storage error");
            } else {
              console.log("Tokens stored successfully");
            }
          } catch (dbError) {
            console.error("Database operation error:", dbError);
            // Continue to return tokens even if DB operations fail
          }
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
      } catch (error) {
        console.error("Exception in callback handling:", error);
        return new Response(
          JSON.stringify({ 
            success: false,
            error: error.message || "Unknown error during authentication",
            stack: error.stack
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Get stored tokens for a user
    if (action === "get-credentials") {
      if (!user) {
        console.error("No authenticated user for get-credentials");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized - No valid user session" }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        // Get stored tokens
        const { data: tokens, error: tokensError } = await supabase
          .from('google_ads_tokens')
          .select('*')
          .eq('user_id', user.id);
        
        if (tokensError) {
          console.error("Error fetching tokens:", tokensError);
          throw new Error("Failed to retrieve authentication tokens");
        }
        
        if (!tokens || tokens.length === 0) {
          return new Response(
            JSON.stringify({ success: false, error: "No credentials found" }),
            { 
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const tokenData = tokens[0]; // Use the first record
        
        // Check if token is expired
        const isExpired = new Date(tokenData.expires_at) <= new Date();
        
        if (isExpired && tokenData.refresh_token) {
          console.log("Token expired, refreshing...");
          
          try {
            // Refresh token
            const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams({
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: tokenData.refresh_token,
              }),
            });
            
            if (!refreshResponse.ok) {
              console.error("Token refresh failed:", await refreshResponse.text());
              throw new Error("Failed to refresh token");
            }
            
            const newTokens = await refreshResponse.json();
            
            // Update stored tokens
            await supabase
              .from('google_ads_tokens')
              .update({
                access_token: newTokens.access_token,
                expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
              })
              .eq('user_id', user.id);
            
            // Return refreshed credentials
            return new Response(
              JSON.stringify({ 
                success: true, 
                customerId: "1234567890", // Mock customer ID
                developerToken: "Ngh3IukgQ3ovdkH3M0smUg",
                accessToken: newTokens.access_token,
                userEmail: tokenData.email
              }),
              { 
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } catch (refreshError) {
            console.error("Error refreshing token:", refreshError);
            throw new Error("Failed to refresh authentication token");
          }
        }
        
        // Return existing credentials
        return new Response(
          JSON.stringify({ 
            success: true, 
            customerId: "1234567890", // Mock customer ID
            developerToken: "Ngh3IukgQ3ovdkH3M0smUg",
            accessToken: tokenData.access_token,
            userEmail: tokenData.email
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error getting credentials:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Failed to retrieve credentials" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Explicitly refresh token
    if (action === "refresh-token") {
      if (!user) {
        console.error("No authenticated user for refresh-token");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized - No valid user session" }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
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
      if (!user) {
        console.error("No authenticated user for revoke");
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized - No valid user session" }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
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
