
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
const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
];

// Developer token for Google Ads API
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "Ngh3IukgQ3ovdkH3M0smUg";

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
    
    // Get user ID from the auth header if available
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    // Log auth state for debugging (not user data)
    console.log("Auth header present:", Boolean(authHeader));
    console.log("Token length:", token.length);

    // Validate token when needed, but don't block authorize and callback actions
    let user = null;
    if (token) {
      try {
        // Only attempt to get user if there's a token
        const { data, error: userError } = await supabase.auth.getUser(token);
        
        if (userError) {
          console.error("User authentication error:", userError);
          
          // Only require auth for non-callback actions
          if (action !== "callback" && action !== "authorize" && action !== "refresh-direct" && action !== "validate-token") {
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
        
        // Only require auth for non-callback actions
        if (action !== "callback" && action !== "authorize" && action !== "refresh-direct" && action !== "validate-token") {
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
        authUrl.searchParams.append("scope", OAUTH_SCOPES.join(" "));
        
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
            scopes: OAUTH_SCOPES.join(" ")
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
    
    // Handle OAuth callback - Updated with improved error handling
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
        
        // Log the parameters for debugging
        console.log("OAuth parameters:", {
          code_length: code.length,
          redirect_uri: redirectUri,
          client_id_exists: Boolean(GOOGLE_CLIENT_ID),
          client_secret_exists: Boolean(GOOGLE_CLIENT_SECRET)
        });
        
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
        const responseHeaders = Object.fromEntries(tokenResponse.headers.entries());
        const responseTextRaw = await tokenResponse.text();
        
        console.log(`Token exchange response status: ${responseStatus}`);
        console.log(`Token exchange response headers: ${JSON.stringify(responseHeaders)}`);
        
        if (responseTextRaw.length < 500) {
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
        
        let userInfo = {};
        try {
          userInfo = await userInfoResponse.json();
          console.log("Received user info:", JSON.stringify({
            email: userInfo.email,
            has_id: !!userInfo.id,
            has_name: !!userInfo.name
          }));
        } catch (userInfoError) {
          console.error("Error parsing user info:", userInfoError);
          // Continue with empty user info rather than failing
          userInfo = { email: "unknown@example.com" };
        }
        
        // List accessible Google Ads accounts
        const accounts = [];
        let accountsError = null;
        
        try {
          console.log("Fetching Google Ads accounts");
          const accessibleCustomersResponse = await fetch(
            "https://googleads.googleapis.com/v14/customers:listAccessibleCustomers",
            {
              headers: {
                Authorization: `Bearer ${tokens.access_token}`,
                "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN
              },
            }
          );
          
          // Log full response for debugging
          console.log(`Account list response status: ${accessibleCustomersResponse.status}`);
          
          if (!accessibleCustomersResponse.ok) {
            const errorText = await accessibleCustomersResponse.text();
            console.error("Failed to list accessible customers:", errorText);
            accountsError = `Failed to list Google Ads accounts: ${errorText}`;
          } else {
            const accountsList = await accessibleCustomersResponse.json();
            console.log("Accessible customers:", JSON.stringify(accountsList));
            
            // Extract accounts if any were found
            if (accountsList.resourceNames && accountsList.resourceNames.length > 0) {
              for (const resourceName of accountsList.resourceNames) {
                const customerId = resourceName.split('/')[1];
                accounts.push({
                  id: customerId,
                  name: `Google Ads Account ${customerId}`
                });
              }
            }
          }
        } catch (error) {
          console.error("Error fetching Google Ads accounts:", error);
          accountsError = error.message || "Unknown error fetching Google Ads accounts";
        }
        
        // For callback, we'll proceed even without a valid user if there's no token
        if (!user && !token) {
          console.log("No authenticated user, but proceeding with callback");
          // For now, store the tokens directly in localStorage via the return value
          
          return new Response(
            JSON.stringify({ 
              success: true, 
              accessToken: tokens.access_token,
              refreshToken: tokens.refresh_token,
              expiry_date: Date.now() + tokens.expires_in * 1000,
              userEmail: userInfo.email,
              accounts: accounts,
              developerToken: GOOGLE_ADS_DEVELOPER_TOKEN,
              warning: accountsError,
              tokens: tokens, // Include full tokens for client storage
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
            // Store tokens in the new user_oauth_tokens table
            console.log("Storing tokens in user_oauth_tokens table");
            
            const tokensData = {
              user_id: user.id,
              provider: "google_ads",
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
              scope: tokens.scope,
              email: userInfo.email,
            };
            
            // Upsert to handle both insert and update cases
            const { error: storeError } = await supabase
              .from('user_oauth_tokens')
              .upsert(tokensData, { onConflict: "user_id,provider" });
            
            if (storeError) {
              console.error("Error storing tokens:", storeError);
              // If there's an error storing in the database, we'll still return the tokens
              // This allows the user to proceed even if the database storage fails
              console.log("Returning tokens directly to client despite storage error");
            } else {
              console.log("Tokens stored successfully in user_oauth_tokens table");
            }
          } catch (dbError) {
            console.error("Database operation error:", dbError);
            // Continue to return tokens even if DB operations fail
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiry_date: Date.now() + tokens.expires_in * 1000,
            userEmail: userInfo.email,
            accounts: accounts,
            developerToken: GOOGLE_ADS_DEVELOPER_TOKEN,
            warning: accountsError,
            tokens: tokens // Include full tokens object
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
          JSON.stringify({ 
            success: false, 
            error: "Unauthorized - No valid user session" 
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        // Get stored tokens from new table
        const { data: tokens, error: tokensError } = await supabase
          .from('user_oauth_tokens')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google_ads')
          .maybeSingle();
        
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
          
          try {
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
              const refreshErrorText = await refreshResponse.text();
              console.error("Token refresh failed:", refreshErrorText);
              throw new Error(`Failed to refresh token: ${refreshErrorText}`);
            }
            
            const newTokens = await refreshResponse.json();
            
            // Update stored tokens in new table
            await supabase
              .from('user_oauth_tokens')
              .update({
                access_token: newTokens.access_token,
                expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('provider', 'google_ads');
            
            // Return refreshed credentials
            return new Response(
              JSON.stringify({ 
                success: true, 
                customerId: "1234567890", // Default customer ID
                developerToken: GOOGLE_ADS_DEVELOPER_TOKEN,
                accessToken: newTokens.access_token,
                userEmail: tokens.email
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
            customerId: "1234567890", // Default customer ID
            developerToken: GOOGLE_ADS_DEVELOPER_TOKEN,
            accessToken: tokens.access_token,
            userEmail: tokens.email
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
    
    // New direct refresh token endpoint - matches your Next.js API route
    if (action === "refresh-direct") {
      console.log("Processing direct refresh token request");
      const { refreshToken } = requestData;
      
      if (!refreshToken) {
        console.error("No refresh token provided");
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "No refresh token provided" 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        // Refresh the token directly using Google OAuth API
        console.log("Refreshing token using Google OAuth API");
        const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: refreshToken,
          }),
        });
        
        if (!refreshResponse.ok) {
          const errorText = await refreshResponse.text();
          console.error("Token refresh failed:", refreshResponse.status, errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to refresh token: ${errorText}` 
            }),
            { 
              status: refreshResponse.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const tokens = await refreshResponse.json();
        console.log("Token refreshed successfully");
        
        // If we have a user, update the stored token in the new table
        if (user) {
          try {
            const { error: updateError } = await supabase
              .from("user_oauth_tokens")
              .update({
                access_token: tokens.access_token,
                expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq("user_id", user.id)
              .eq("provider", "google_ads");
            
            if (updateError) {
              console.error("Error updating token in database:", updateError);
            } else {
              console.log("Updated token in database");
            }
          } catch (dbError) {
            console.error("Database error while updating token:", dbError);
            // Continue anyway to return the new token
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            accessToken: tokens.access_token,
            expiryDate: Date.now() + tokens.expires_in * 1000,
            tokens: {
              access_token: tokens.access_token,
              expires_in: tokens.expires_in,
              expiry_date: Date.now() + tokens.expires_in * 1000
            }
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error refreshing token:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Unknown error refreshing token" 
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
      
      // Get refresh token from new table
      const { data: tokens, error: tokensError } = await supabase
        .from("user_oauth_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .eq("provider", "google_ads")
        .maybeSingle();
      
      if (tokensError || !tokens || !tokens.refresh_token) {
        console.error("Error fetching refresh token:", tokensError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "No refresh token found" 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
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
          const errorText = await refreshResponse.text();
          console.error("Token refresh failed:", errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to refresh token: ${errorText}` 
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const newTokens = await refreshResponse.json();
        
        // Update stored tokens in new table
        const { error: updateError } = await supabase
          .from("user_oauth_tokens")
          .update({
            access_token: newTokens.access_token,
            expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .eq("provider", "google_ads");
        
        if (updateError) {
          console.error("Error updating token in database:", updateError);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            accessToken: newTokens.access_token 
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error refreshing token:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Unknown error refreshing token" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Enhanced revoke access action - direct token revocation
    if (action === "revoke") {
      if (!user && !requestData.accessToken) {
        console.error("No authenticated user or access token for revoke");
        return new Response(
          JSON.stringify({ success: false, error: "No access token provided" }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Get access token - either from request or from database
      let accessToken = requestData.accessToken;
      
      if (!accessToken && user) {
        // Get access token from new table
        const { data: tokens, error: tokensError } = await supabase
          .from("user_oauth_tokens")
          .select("access_token")
          .eq("user_id", user.id)
          .eq("provider", "google_ads")
          .maybeSingle();
        
        if (tokensError) {
          console.error("Error fetching token for revocation:", tokensError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Failed to retrieve token for revocation",
              details: tokensError.message
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        if (!tokens || !tokens.access_token) {
          console.error("No token found for revocation");
          // We'll still delete from DB even if no token found
        } else {
          accessToken = tokens.access_token;
        }
      }
      
      // Revoke token if we have one
      if (accessToken) {
        try {
          // Call Google's revocation endpoint directly
          console.log("Calling Google token revocation endpoint");
          const revokeResponse = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
          
          if (!revokeResponse.ok) {
            const errorText = await revokeResponse.text();
            console.error("Token revocation failed:", revokeResponse.status, errorText);
            // Continue anyway to clean up local data
          } else {
            console.log("Token revoked successfully");
          }
        } catch (revokeError) {
          console.error("Error revoking token:", revokeError);
          // Continue anyway to clean up local data
        }
      }
      
      // If we have a user, delete stored tokens from new table
      if (user) {
        const { error: deleteError } = await supabase
          .from("user_oauth_tokens")
          .delete()
          .eq("user_id", user.id)
          .eq("provider", "google_ads");
        
        if (deleteError) {
          console.error("Error deleting tokens from database:", deleteError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Failed to delete stored tokens",
              details: deleteError.message
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log("Deleted tokens from database");
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Token successfully revoked" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // New token validation action
    if (action === "validate-token") {
      const accessToken = requestData.accessToken;
      
      if (!accessToken) {
        console.error("No access token provided for validation");
        return new Response(
          JSON.stringify({ 
            success: false, 
            valid: false,
            error: "No access token provided" 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        // Validate the token by making a request to Google's userinfo endpoint
        console.log("Validating Google access token");
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        if (!userInfoResponse.ok) {
          console.error(`Token validation failed: ${userInfoResponse.status}`);
          const errorText = await userInfoResponse.text();
          return new Response(
            JSON.stringify({ 
              success: false, 
              valid: false,
              error: `Invalid token: ${errorText}`
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Token is valid
        console.log("Token validated successfully");
        const userInfo = await userInfoResponse.json();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            valid: true,
            userInfo: {
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture
            }
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error validating token:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            valid: false,
            error: error.message || "Unknown error validating token" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // If we reached here, the requested action was not found
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unknown action: ${action}` 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // Handle any unexpected errors
    console.error("Unexpected error in edge function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Internal server error",
        details: error.message,
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
