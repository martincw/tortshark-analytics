
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "Ngh3IukgQ3ovdkH3M0smUg";
const REDIRECT_URI = Deno.env.get("SITE_URL") ? 
  `${Deno.env.get("SITE_URL")}/integrations` : 
  "https://app.tortshark.com/integrations";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function exchangeCodeForTokens(code: string) {
  try {
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
      throw new Error(`Failed to exchange code for tokens: ${errorText}`);
    }

    return await tokenResponse.json();
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    throw error;
  }
}

async function getUserInfo(accessToken: string) {
  try {
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error("Failed to fetch user info:", errorText);
      throw new Error(`Failed to fetch user info: ${errorText}`);
    }

    return await userInfoResponse.json();
  } catch (error) {
    console.error("Error fetching user info:", error);
    throw error;
  }
}

async function listGoogleAdsAccounts(accessToken: string) {
  try {
    // First, fetch the accessible customers using the Customer List API
    const customerListResponse = await fetch(
      "https://googleads.googleapis.com/v15/customers:listAccessibleCustomers",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
        },
      }
    );
    
    if (!customerListResponse.ok) {
      const errorText = await customerListResponse.text();
      console.error("Failed to list accessible customers:", errorText);
      throw new Error(`Failed to list accessible customers: ${errorText}`);
    }
    
    const { resourceNames } = await customerListResponse.json();
    
    if (!resourceNames || !Array.isArray(resourceNames) || resourceNames.length === 0) {
      console.log("No accessible accounts found");
      return [];
    }
    
    // Extract customer IDs from resource names (format: 'customers/1234567890')
    const customerIds = resourceNames.map((name) => name.split('/')[1]);
    
    // Now fetch details for each customer ID
    const accountsPromises = customerIds.map(async (customerId) => {
      try {
        const customerResponse = await fetch(
          `https://googleads.googleapis.com/v15/customers/${customerId}`,
          {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
            },
          }
        );
        
        if (!customerResponse.ok) {
          console.error(`Failed to fetch details for customer ${customerId}`);
          return {
            id: customerId,
            name: `Account ${customerId}`,
            timeZone: "America/New_York",
            currencyCode: "USD"
          };
        }
        
        const customerData = await customerResponse.json();
        
        return {
          id: customerId,
          name: customerData.customer?.descriptiveName || `Account ${customerId}`,
          timeZone: customerData.customer?.timeZone || "America/New_York",
          currencyCode: customerData.customer?.currencyCode || "USD"
        };
      } catch (error) {
        console.error(`Error fetching details for customer ${customerId}:`, error);
        return {
          id: customerId,
          name: `Account ${customerId}`,
          timeZone: "America/New_York",
          currencyCode: "USD"
        };
      }
    });
    
    const accounts = await Promise.all(accountsPromises);
    return accounts.filter(account => account !== null);
  } catch (error) {
    console.error("Error listing Google Ads accounts:", error);
    // Return empty array rather than throwing an error so the rest of the flow can continue
    return [];
  }
}

async function refreshAccessToken(refreshToken: string) {
  try {
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
      console.error("Token refresh failed:", errorText);
      throw new Error(`Failed to refresh token: ${errorText}`);
    }

    return await refreshResponse.json();
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, code, accessToken, refreshToken } = await req.json();
    
    // Exchange authorization code for tokens
    if (action === "exchange-code") {
      try {
        if (!code) {
          return new Response(
            JSON.stringify({ success: false, error: "No authorization code provided" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const tokens = await exchangeCodeForTokens(code);
        const userInfo = await getUserInfo(tokens.access_token);
        
        // Try to fetch Google Ads accounts
        let accounts = [];
        try {
          accounts = await listGoogleAdsAccounts(tokens.access_token);
        } catch (accountsError) {
          console.error("Error fetching Google Ads accounts:", accountsError);
          // Continue with empty accounts array
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            tokens: {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expiry_date: tokens.expiry_date || new Date(Date.now() + tokens.expires_in * 1000).getTime(),
            },
            userEmail: userInfo.email,
            accounts
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error exchanging code for tokens:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Error exchanging code for tokens", 
            details: error.message 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // List Google Ads accounts
    if (action === "list-accounts") {
      try {
        if (!accessToken) {
          return new Response(
            JSON.stringify({ success: false, error: "No access token provided" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const accounts = await listGoogleAdsAccounts(accessToken);
        
        return new Response(
          JSON.stringify({ success: true, accounts }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error listing Google Ads accounts:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Error listing Google Ads accounts", 
            details: error.message 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Refresh token
    if (action === "refresh-token") {
      try {
        if (!refreshToken) {
          return new Response(
            JSON.stringify({ success: false, error: "No refresh token provided" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const tokens = await refreshAccessToken(refreshToken);
        
        return new Response(
          JSON.stringify({
            success: true,
            tokens: {
              access_token: tokens.access_token,
              expiry_date: tokens.expiry_date || new Date(Date.now() + tokens.expires_in * 1000).getTime(),
            }
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error refreshing token:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Error refreshing token", 
            details: error.message 
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
