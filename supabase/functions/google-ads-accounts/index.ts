
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleAuth } from "https://esm.sh/google-auth-library@8.8.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "Ngh3IukgQ3ovdkH3M0smUg";
const REDIRECT_URI = "https://app.tortshark.com/integrations";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function exchangeCodeForTokens(code: string) {
  try {
    console.log("Exchanging code for tokens");
    
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    });
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Token exchange error:", errorData);
      throw new Error(`Failed to exchange code: ${response.status} ${errorData}`);
    }
    
    const tokens = await response.json();
    
    // Get user info
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      throw new Error("Failed to get user info");
    }
    
    const userInfo = await userInfoResponse.json();
    
    // Calculate expiry date (tokens.expires_in is in seconds)
    const expiryDate = Date.now() + tokens.expires_in * 1000;
    
    return {
      success: true,
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: expiryDate,
      },
      userEmail: userInfo.email,
    };
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    throw error;
  }
}

async function refreshAccessToken(refreshToken: string) {
  try {
    console.log("Refreshing access token");
    
    const tokenUrl = "https://oauth2.googleapis.com/token";
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error("Token refresh error:", errorData);
      throw new Error(`Failed to refresh token: ${response.status} ${errorData}`);
    }
    
    const tokens = await response.json();
    
    // Calculate expiry date (tokens.expires_in is in seconds)
    const expiryDate = Date.now() + tokens.expires_in * 1000;
    
    return {
      success: true,
      tokens: {
        access_token: tokens.access_token,
        expiry_date: expiryDate,
      },
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
}

async function listGoogleAdsAccounts(accessToken: string) {
  try {
    console.log("Listing real Google Ads accounts");
    
    // For simplicity and since we can't directly use the Google Ads API in Deno Edge Functions,
    // we'll use a REST call to the Google Ads API
    const listCustomersResponse = await fetch(
      "https://googleads.googleapis.com/v15/customers:listAccessibleCustomers",
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
      console.error("Failed to list accessible customers:", errorText);
      throw new Error(`Failed to list accessible customers: ${errorText}`);
    }
    
    const { resourceNames } = await listCustomersResponse.json();
    
    if (!resourceNames || !Array.isArray(resourceNames) || resourceNames.length === 0) {
      console.log("No accessible accounts found");
      return [];
    }
    
    console.log(`Found ${resourceNames.length} accessible accounts`);
    
    // Extract customer IDs from resource names (format: 'customers/1234567890')
    const customerIds = resourceNames.map((name) => name.split('/')[1]);
    
    // Get details for each customer ID
    const accounts = await Promise.all(
      customerIds.map(async (customerId) => {
        try {
          const customerResponse = await fetch(
            `https://googleads.googleapis.com/v15/customers/${customerId}`,
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
              },
            }
          );
          
          if (!customerResponse.ok) {
            console.error(`Failed to fetch details for customer ${customerId}`);
            return {
              id: customerId,
              customerId: customerId,
              name: `Account ${customerId}`,
              currency: "USD",
              timeZone: "America/New_York",
              status: "ENABLED"
            };
          }
          
          const customerData = await customerResponse.json();
          
          return {
            id: customerId,
            customerId: customerId,
            name: customerData.customer?.descriptiveName || `Account ${customerId}`,
            currency: customerData.customer?.currencyCode || "USD",
            timeZone: customerData.customer?.timeZone || "America/New_York",
            status: customerData.customer?.status || "ENABLED"
          };
        } catch (error) {
          console.error(`Error fetching details for customer ${customerId}:`, error);
          return {
            id: customerId,
            customerId: customerId,
            name: `Account ${customerId}`,
            currency: "USD",
            timeZone: "America/New_York",
            status: "ENABLED"
          };
        }
      })
    );
    
    // Filter out null values (failed requests)
    return accounts.filter(account => account !== null);
  } catch (error) {
    console.error("Error listing Google Ads accounts:", error);
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
    
    // Handle the exchange-code action
    if (action === "exchange-code" && code) {
      try {
        const result = await exchangeCodeForTokens(code);
        
        // Try to get accounts if we have a token
        let accounts = [];
        try {
          accounts = await listGoogleAdsAccounts(result.tokens.access_token);
        } catch (accountsError) {
          console.error("Error fetching accounts during auth:", accountsError);
          // Continue with the flow even if fetching accounts fails
        }
        
        // Add accounts to the result
        result.accounts = accounts;
        
        return new Response(
          JSON.stringify(result),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error in exchange-code:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Failed to exchange code for tokens" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Handle the list-accounts action
    if (action === "list-accounts" && accessToken) {
      try {
        const accounts = await listGoogleAdsAccounts(accessToken);
        
        return new Response(
          JSON.stringify({ success: true, accounts }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error in list-accounts:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Failed to list Google Ads accounts" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Handle the refresh-token action
    if (action === "refresh-token" && refreshToken) {
      try {
        const result = await refreshAccessToken(refreshToken);
        
        return new Response(
          JSON.stringify(result),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (error) {
        console.error("Error in refresh-token:", error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: error.message || "Failed to refresh token" 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ success: false, error: "Invalid action or missing parameters" }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in edge function:", error);
    
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
