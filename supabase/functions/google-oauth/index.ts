import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";

// Make redirect URI configurable through environment variables
const REDIRECT_URI = Deno.env.get("SITE_URL") ? 
  `${Deno.env.get("SITE_URL")}/integrations` : 
  "https://app.tortshark.com/integrations";

// Google Ads API OAuth scopes
const OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
];

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400" // 24 hours
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Add a simple memory cache for tracking processed codes
const processedCodes = new Set();

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per window
const requestLogs = new Map(); // IP -> { count, timestamp }

// Implement a simple rate limiter function
const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  let clientLog = requestLogs.get(ip);
  
  if (!clientLog) {
    // First request from this client
    requestLogs.set(ip, { count: 1, timestamp: now });
    return true;
  }
  
  // Check if we need to reset the window
  if (now - clientLog.timestamp > RATE_LIMIT_WINDOW) {
    requestLogs.set(ip, { count: 1, timestamp: now });
    return true;
  }
  
  // Increment the counter
  clientLog.count++;
  
  // Check if exceeded limit
  if (clientLog.count > RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  return true;
};

// Clean up old entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, log] of requestLogs.entries()) {
    if (now - log.timestamp > RATE_LIMIT_WINDOW * 2) {
      requestLogs.delete(ip);
    }
  }
  
  // Also clean up the processedCodes set after a while
  if (processedCodes.size > 1000) { // Arbitrary limit, adjust as needed
    processedCodes.clear();
  }
}, 60000); // Run every minute

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Get client IP for rate limiting
  const clientIp = req.headers.get("x-forwarded-for") || "unknown-ip";
  
  // Apply rate limiting
  if (!checkRateLimit(clientIp)) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Rate limit exceeded. Please try again later."
      }),
      { 
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
  
  try {
    const requestData = await req.json();
    const action = requestData.action;
    const requestId = requestData.requestId || Math.random().toString(36).substring(7);
    
    console.log(`Processing request (${requestId}):`, { action, hasCode: !!requestData.code });
    
    // Get user ID from the auth header if available
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    // Validate token when needed, but don't block authorize and callback actions
    let user = null;
    if (token) {
      try {
        const { data, error: userError } = await supabase.auth.getUser(token);
        
        if (userError) {
          console.error(`User authentication error (${requestId}):`, userError);
          
          if (action !== "callback" && action !== "authorize" && action !== "refresh-direct" && action !== "validate-token") {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: "Unauthorized - Invalid user session",
                details: userError.message,
                requestId
              }),
              { 
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        } else {
          user = data.user;
          console.log(`User authenticated (${requestId}): ${user?.id || 'unknown'}`);
        }
      } catch (authError) {
        console.error(`Error during authentication check (${requestId}):`, authError);
        
        if (action !== "callback" && action !== "authorize" && action !== "refresh-direct" && action !== "validate-token") {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Unauthorized - Authentication error",
              details: authError.message,
              requestId
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }
    }
    
    // Handle callback code deduplication
    if (action === "callback" && requestData.code) {
      // Check if we've already processed this code
      if (processedCodes.has(requestData.code)) {
        console.log(`Duplicate code detected (${requestId})`);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Authorization code already used",
            requestId
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          }
        );
      }

      // Add code to processed set
      processedCodes.add(requestData.code);

      // Clean up old codes (optional)
      setTimeout(() => processedCodes.delete(requestData.code), 5 * 60 * 1000); // Clean up after 5 minutes
    }
    
    // Initiate OAuth flow
    if (action === "authorize") {
      try {
        const redirectUri = requestData.redirectUri || REDIRECT_URI;
        
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
          throw new Error("Missing required OAuth credentials");
        }
        
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.append("client_id", GOOGLE_CLIENT_ID);
        authUrl.searchParams.append("redirect_uri", redirectUri);
        authUrl.searchParams.append("response_type", "code");
        authUrl.searchParams.append("scope", OAUTH_SCOPES.join(" "));
        authUrl.searchParams.append("access_type", "offline");
        authUrl.searchParams.append("prompt", "consent select_account");
        
        const state = crypto.randomUUID();
        authUrl.searchParams.append("state", state);
        
        if (requestData.email) {
          authUrl.searchParams.append("login_hint", requestData.email);
        }
        
        return new Response(JSON.stringify({ 
          url: authUrl.toString(),
          debug: {
            client_id_length: GOOGLE_CLIENT_ID.length,
            redirect_uri: redirectUri,
            has_client_secret: GOOGLE_CLIENT_SECRET.length > 0,
            scopes: OAUTH_SCOPES.join(" "),
            requestId
          }
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error(`Error generating OAuth URL (${requestId}):`, error);
        return new Response(JSON.stringify({ 
          error: "Failed to generate OAuth URL", 
          details: error.message,
          env_vars_set: {
            GOOGLE_CLIENT_ID: !!GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET: !!GOOGLE_CLIENT_SECRET,
            SUPABASE_URL: !!SUPABASE_URL,
            SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY,
            SITE_URL: !!Deno.env.get("SITE_URL")
          },
          requestId
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
    
    // Handle OAuth callback
    if (action === "callback") {
      console.log(`Starting callback process (${requestId})`);
      const code = requestData.code || "";
      
      if (!code) {
        console.log(`No authorization code provided in request (${requestId})`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "No authorization code provided",
            requestId 
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        const redirectUri = requestData.redirectUri || REDIRECT_URI;
        console.log(`Using redirect URI (${requestId}):`, redirectUri);
        
        if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
          console.error(`OAuth credentials missing (${requestId}):`, {
            hasClientId: !!GOOGLE_CLIENT_ID,
            hasClientSecret: !!GOOGLE_CLIENT_SECRET
          });
          throw new Error("Missing required OAuth credentials");
        }
        
        console.log(`Attempting to exchange code for tokens (${requestId})`);
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { 
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json"
          },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
          }),
        });
        
        console.log(`Token response status (${requestId}):`, tokenResponse.status);
        
        let responseData;
        try {
          const rawResponse = await tokenResponse.text();
          console.log(`Raw token response (${requestId}):`, rawResponse);
          responseData = JSON.parse(rawResponse);
        } catch (e) {
          console.error(`Failed to parse token response (${requestId}):`, e);
          throw new Error(`Failed to parse token response: ${e.message}`);
        }
        
        if (!tokenResponse.ok) {
          console.error(`Token exchange failed (${requestId}):`, responseData);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Token exchange failed",
              details: responseData.error_description || responseData.error || "Unknown error",
              debug: {
                status: tokenResponse.status,
                redirectUri,
                hasClientId: !!GOOGLE_CLIENT_ID,
                hasClientSecret: !!GOOGLE_CLIENT_SECRET,
                requestId
              }
            }),
            { 
              status: tokenResponse.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        if (!responseData.access_token) {
          throw new Error("No access token in response");
        }
        
        console.log(`Successfully obtained access token (${requestId})`);
        
        // Get user info using the access token
        console.log(`Fetching user info with access token (${requestId})`);
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${responseData.access_token}` }
        });
        
        if (!userInfoResponse.ok) {
          console.error(`Failed to fetch user info (${requestId}):`, userInfoResponse.status);
          throw new Error(`Failed to fetch user info: ${userInfoResponse.status}`);
        }
        
        const userInfo = await userInfoResponse.json();
        console.log(`Got user info for email (${requestId}):`, userInfo.email);
        
        // Try to fetch Google Ads accounts
        let accounts = [];
        let accountsError = null;
        
        try {
          console.log(`Attempting to fetch Google Ads accounts (${requestId})`);
          const accountsResponse = await fetch(
            "https://googleads.googleapis.com/v16/customers:listAccessibleCustomers",
            {
              headers: {
                Authorization: `Bearer ${responseData.access_token}`,
                "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN
              },
            }
          );
          
          if (!accountsResponse.ok) {
            const errorText = await accountsResponse.text();
            console.error(`Failed to list accessible customers (${requestId}):`, errorText);
            accountsError = `Failed to list Google Ads accounts: ${errorText}`;
          } else {
            const accountsList = await accountsResponse.json();
            console.log(`Google Ads accounts response (${requestId}):`, JSON.stringify(accountsList));
            
            if (accountsList.resourceNames && accountsList.resourceNames.length > 0) {
              accounts = accountsList.resourceNames.map(resourceName => {
                const customerId = resourceName.split('/')[1];
                return {
                  id: customerId,
                  name: `Google Ads Account ${customerId}`
                };
              });
              console.log(`Found ${accounts.length} Google Ads accounts (${requestId})`);
            } else {
              console.log(`No Google Ads accounts found in response (${requestId})`);
            }
          }
        } catch (error) {
          console.error(`Error fetching Google Ads accounts (${requestId}):`, error);
          accountsError = error.message || "Unknown error fetching Google Ads accounts";
        }
        
        // Store tokens in database if we have a user
        if (user) {
          console.log(`Storing tokens for user (${requestId}): ${user.id}`);
          const { error: dbError } = await supabase
            .from("user_oauth_tokens")
            .upsert({
              user_id: user.id,
              provider: "google",
              access_token: responseData.access_token,
              refresh_token: responseData.refresh_token,
              expires_at: new Date(Date.now() + (responseData.expires_in * 1000)).toISOString(),
              scope: OAUTH_SCOPES.join(" "),
              email: userInfo.email
            });
          
          if (dbError) {
            console.error(`Error storing tokens (${requestId}):`, dbError);
          } else {
            console.log(`Successfully stored tokens in database (${requestId})`);
          }
        } else {
          console.log(`No authenticated user, skipping token storage (${requestId})`);
        }
        
        return new Response(JSON.stringify({
          success: true,
          accessToken: responseData.access_token,
          refreshToken: responseData.refresh_token,
          expiry_date: Date.now() + (responseData.expires_in * 1000),
          userEmail: userInfo.email,
          accounts: accounts,
          developerToken: GOOGLE_ADS_DEVELOPER_TOKEN,
          warning: accountsError,
          tokens: responseData, // Include full tokens object
          requestId
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
        
      } catch (error) {
        console.error(`Error in OAuth callback (${requestId}):`, error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "OAuth callback failed",
            details: error.message,
            stack: error.stack,
            requestId
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
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Unauthorized - No valid user session",
            requestId 
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        // Get stored tokens
        const { data: tokens, error: tokensError } = await supabase
          .from('user_oauth_tokens')
          .select('*')
          .eq('user_id', user.id)
          .eq('provider', 'google')
          .maybeSingle();
        
        if (tokensError) {
          console.error(`Error fetching tokens (${requestId}):`, tokensError);
          throw new Error("Failed to retrieve authentication tokens");
        }
        
        if (!tokens) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "No credentials found",
              requestId 
            }),
            { 
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Check if token is expired
        const isExpired = new Date(tokens.expires_at) <= new Date();
        
        if (isExpired && tokens.refresh_token) {
          console.log(`Token expired, refreshing... (${requestId})`);
          
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
              console.error(`Token refresh failed (${requestId}):`, refreshErrorText);
              throw new Error(`Failed to refresh token: ${refreshErrorText}`);
            }
            
            const newTokens = await refreshResponse.json();
            
            // Update stored tokens
            await supabase
              .from('user_oauth_tokens')
              .update({
                access_token: newTokens.access_token,
                expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('provider', 'google');
            
            // Return refreshed credentials
            return new Response(
              JSON.stringify({ 
                success: true, 
                developerToken: GOOGLE_ADS_DEVELOPER_TOKEN,
                accessToken: newTokens.access_token,
                userEmail: tokens.email,
                requestId
              }),
              { 
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } catch (refreshError) {
            console.error(`Error refreshing token (${requestId}):`, refreshError);
            throw new Error("Failed to refresh authentication token");
          }
        }
        
        // Return existing credentials
        return new Response(
          JSON.stringify({ 
            success: true, 
            developerToken: GOOGLE_ADS_DEVELOPER_TOKEN,
            accessToken: tokens.access_token,
            userEmail: tokens.email,
            requestId
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error(`Error getting credentials (${requestId}):`, error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Failed to retrieve credentials",
            requestId
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Direct refresh token endpoint
    if (action === "refresh-direct") {
      console.log(`Processing direct refresh token request (${requestId})`);
      const { refreshToken } = requestData;
      
      if (!refreshToken) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "No refresh token provided",
            requestId
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        // Refresh the token directly using Google OAuth API
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
          console.error(`Token refresh failed (${requestId}):`, refreshResponse.status, errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to refresh token: ${errorText}`,
              requestId
            }),
            { 
              status: refreshResponse.status,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const tokens = await refreshResponse.json();
        console.log(`Token refreshed successfully (${requestId})`);
        
        // If we have a user, update the stored token
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
              .eq("provider", "google");
            
            if (updateError) {
              console.error(`Error updating token in database (${requestId}):`, updateError);
            } else {
              console.log(`Updated token in database (${requestId})`);
            }
          } catch (dbError) {
            console.error(`Database error while updating token (${requestId}):`, dbError);
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
            },
            requestId
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error(`Error refreshing token (${requestId}):`, error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Unknown error refreshing token",
            requestId
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Explicitly refresh token for a user
    if (action === "refresh-token") {
      if (!user) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Unauthorized - No valid user session",
            requestId
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Get refresh token from database
      const { data: tokens, error: tokensError } = await supabase
        .from("user_oauth_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .eq("provider", "google")
        .maybeSingle();
      
      if (tokensError || !tokens || !tokens.refresh_token) {
        console.error(`Error fetching refresh token (${requestId}):`, tokensError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "No refresh token found",
            requestId
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
          console.error(`Token refresh failed (${requestId}):`, errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to refresh token: ${errorText}`,
              requestId
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        const newTokens = await refreshResponse.json();
        
        // Update stored tokens
        const { error: updateError } = await supabase
          .from("user_oauth_tokens")
          .update({
            access_token: newTokens.access_token,
            expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .eq("provider", "google");
        
        if (updateError) {
          console.error(`Error updating token in database (${requestId}):`, updateError);
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            accessToken: newTokens.access_token,
            requestId
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error(`Error refreshing token (${requestId}):`, error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Unknown error refreshing token",
            requestId
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Revoke access
    if (action === "revoke") {
      if (!user && !requestData.accessToken) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "No access token provided",
            requestId
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Get access token - either from request or from database
      let accessToken = requestData.accessToken;
      
      if (!accessToken && user) {
        // Get access token from database
        const { data: tokens, error: tokensError } = await supabase
          .from("user_oauth_tokens")
          .select("access_token")
          .eq("user_id", user.id)
          .eq("provider", "google")
          .maybeSingle();
        
        if (tokensError) {
          console.error(`Error fetching token for revocation (${requestId}):`, tokensError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Failed to retrieve token for revocation",
              details: tokensError.message,
              requestId
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        if (!tokens || !tokens.access_token) {
          console.error(`No token found for revocation (${requestId})`);
          // We'll still delete from DB even if no token found
        } else {
          accessToken = tokens.access_token;
        }
      }
      
      // Revoke token if we have one
      if (accessToken) {
        try {
          // Call Google's revocation endpoint
          const revokeResponse = await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
          
          if (!revokeResponse.ok) {
            const errorText = await revokeResponse.text();
            console.error(`Token revocation failed (${requestId}):`, revokeResponse.status, errorText);
            // Continue anyway to clean up local data
          } else {
            console.log(`Token revoked successfully (${requestId})`);
          }
        } catch (revokeError) {
          console.error(`Error revoking token (${requestId}):`, revokeError);
          // Continue anyway to clean up local data
        }
      }
      
      // If we have a user, delete stored tokens
      if (user) {
        const { error: deleteError } = await supabase
          .from("user_oauth_tokens")
          .delete()
          .eq("user_id", user.id)
          .eq("provider", "google");
        
        if (deleteError) {
          console.error(`Error deleting tokens from database (${requestId}):`, deleteError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Failed to delete stored tokens",
              details: deleteError.message,
              requestId
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        console.log(`Deleted tokens from database (${requestId})`);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Token successfully revoked",
          requestId
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // Token validation
    if (action === "validate-token") {
      const accessToken = requestData.accessToken;
      
      if (!accessToken) {
        console.log(`No access token provided for validation (${requestId})`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            valid: false,
            error: "No access token provided",
            requestId
          }),
          { 
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      try {
        // Validate the token by making a request to Google's userinfo endpoint
        console.log(`Validating Google access token (${requestId})`);
        const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
        
        if (!userInfoResponse.ok) {
          console.error(`Token validation failed (${requestId}): ${userInfoResponse.status}`);
          const errorText = await userInfoResponse.text();
          return new Response(
            JSON.stringify({ 
              success: false, 
              valid: false,
              error: `Invalid token: ${errorText}`,
              requestId
            }),
            { 
              status: 401,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        
        // Token is valid
        console.log(`Token validated successfully (${requestId})`);
        const userInfo = await userInfoResponse.json();
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            valid: true,
            userInfo: {
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture
            },
            requestId
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error(`Error validating token (${requestId}):`, error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            valid: false,
            error: error.message || "Unknown error validating token",
            requestId
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
        error: `Unknown action: ${action}`,
        requestId
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
