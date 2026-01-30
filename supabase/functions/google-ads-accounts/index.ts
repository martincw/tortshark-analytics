import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "";
const GOOGLE_ADS_MANAGER_CUSTOMER_ID = Deno.env.get("GOOGLE_ADS_MANAGER_CUSTOMER_ID") || "";
const GOOGLE_ADS_API_VERSION = "v20";
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

async function listGoogleAdsAccounts(accessToken: string, cleanupDummyAccounts: boolean = false) {
  try {
    console.log("Listing real Google Ads accounts");
    console.log("Using developer token:", GOOGLE_ADS_DEVELOPER_TOKEN ? "present" : "missing");
    console.log("Using manager customer ID:", GOOGLE_ADS_MANAGER_CUSTOMER_ID || "not set");
    console.log("Using API version:", GOOGLE_ADS_API_VERSION);
    
    // Build headers - include login-customer-id for MCC/Manager account access
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
    };
    
    // Add login-customer-id if we have a manager account configured
    if (GOOGLE_ADS_MANAGER_CUSTOMER_ID) {
      // Remove dashes from customer ID if present
      headers["login-customer-id"] = GOOGLE_ADS_MANAGER_CUSTOMER_ID.replace(/-/g, "");
    }
    
    // Google Ads API - use v20 endpoint
    const listCustomersResponse = await fetch(
      `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`,
      {
        method: "GET",
        headers,
      }
    );
    
    if (!listCustomersResponse.ok) {
      const errorText = await listCustomersResponse.text();
      console.error("Failed to list accessible customers:", errorText);
      console.error("Response status:", listCustomersResponse.status);
      throw new Error(`Google Ads API error: ${listCustomersResponse.status} - ${errorText}`);
    }
    
    const { resourceNames } = await listCustomersResponse.json();
    
    if (!resourceNames || !Array.isArray(resourceNames) || resourceNames.length === 0) {
      console.log("No accessible accounts found");
      return [];
    }
    
    console.log(`Found ${resourceNames.length} accessible accounts`);
    
    // Extract customer IDs from resource names (format: 'customers/1234567890')
    const customerIds = resourceNames.map((name: string) => name.split('/')[1]);
    
    // Get details for each customer ID
    const accounts = await Promise.all(
      customerIds.map(async (customerId: string) => {
        try {
          // Build headers for customer details - need login-customer-id for MCC access
          const detailHeaders: Record<string, string> = {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": GOOGLE_ADS_DEVELOPER_TOKEN,
          };
          if (GOOGLE_ADS_MANAGER_CUSTOMER_ID) {
            detailHeaders["login-customer-id"] = GOOGLE_ADS_MANAGER_CUSTOMER_ID.replace(/-/g, "");
          }
          
          const customerResponse = await fetch(
            `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}`,
            {
              method: "GET",
              headers: detailHeaders,
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
              status: "ENABLED",
            };
          }
          
          const customerData = await customerResponse.json();
          
          return {
            id: customerId,
            customerId: customerId,
            name: customerData.customer?.descriptiveName || `Account ${customerId}`,
            currency: customerData.customer?.currencyCode || "USD",
            timeZone: customerData.customer?.timeZone || "America/New_York",
            status: customerData.customer?.status || "ENABLED",
          };
        } catch (error) {
          console.error(`Error fetching details for customer ${customerId}:`, error);
          return {
            id: customerId,
            customerId: customerId,
            name: `Account ${customerId}`,
            currency: "USD",
            timeZone: "America/New_York",
            status: "ENABLED",
          };
        }
      })
    );
    
    // Filter out null values (failed requests)
    const validAccounts = accounts.filter(account => account !== null);
    
    console.log(`Returning ${validAccounts.length} valid accounts`);
    return validAccounts;
  } catch (error) {
    console.error("Error listing Google Ads accounts:", error);
    throw error;
  }
}

async function deleteAllAccounts(userId: string): Promise<{ success: boolean; removedCount: number; error?: string }> {
  try {
    if (!userId) {
      console.error("No user ID provided for deleting all accounts");
      return { success: false, removedCount: 0, error: "No user ID provided" };
    }
    
    console.log(`Deleting ALL accounts for user ${userId}`);
    
    // First, count the accounts before deletion
    const { data: accounts, error: countError } = await supabase
      .from('account_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('platform', 'google');
    
    if (countError) {
      console.error("Error counting accounts:", countError);
      return { success: false, removedCount: 0, error: countError.message };
    }
    
    const accountCount = accounts?.length || 0;
    
    // Delete all Google Ads accounts for this user
    const { error } = await supabase
      .from('account_connections')
      .delete()
      .eq('user_id', userId)
      .eq('platform', 'google');
    
    if (error) {
      console.error("Error deleting all accounts:", error);
      return { success: false, removedCount: 0, error: error.message };
    }
    
    console.log(`Successfully deleted ${accountCount} accounts for user ${userId}`);
    return { success: true, removedCount: accountCount };
  } catch (error) {
    console.error("Error in deleteAllAccounts:", error);
    return { success: false, removedCount: 0, error: error.message || "Unknown error" };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { action, code, accessToken, refreshToken, cleanupDummyAccounts } = await req.json();
    
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
    
    // Handle the list-accounts action (legacy with accessToken)
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
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }
    
    // Handle the list action (uses stored token)
    if (action === "list") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication failed" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Get stored access token
      const supabaseServiceRole = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "");
      const { data: tokenData, error: tokenError } = await supabaseServiceRole
        .from("google_ads_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (tokenError || !tokenData?.access_token) {
        return new Response(
          JSON.stringify({ success: false, error: "No Google Ads token found. Please reconnect.", accounts: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Check if token is expired and refresh if needed
      let currentAccessToken = tokenData.access_token;
      const isExpired = new Date(tokenData.expires_at) <= new Date();
      
      if (isExpired && tokenData.refresh_token) {
        try {
          const refreshResult = await refreshAccessToken(tokenData.refresh_token);
          if (refreshResult.success) {
            currentAccessToken = refreshResult.tokens.access_token;
            
            // Update the stored token
            await supabaseServiceRole
              .from("google_ads_tokens")
              .update({
                access_token: currentAccessToken,
                expires_at: new Date(refreshResult.tokens.expiry_date).toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq("user_id", user.id);
          }
        } catch (refreshError) {
          console.error("Error refreshing token:", refreshError);
        }
      }
      
      try {
        const accounts = await listGoogleAdsAccounts(currentAccessToken);
        
        return new Response(
          JSON.stringify({ success: true, accounts }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error listing accounts:", error);
        // Return 502 with actual error message for the UI to display
        return new Response(
          JSON.stringify({ success: false, error: error.message || "Failed to list accounts", accounts: [] }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    
    // Handle the cleanup-dummy-accounts action (now uses deleteAllAccounts since we no longer have dummy logic)
    if (action === "cleanup-dummy-accounts") {
      const authHeader = req.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      
      if (!token) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Authentication required for cleanup operation" 
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Authentication failed" 
          }),
          { 
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      // Use deleteAllAccounts since dummy account logic is removed
      const result = await deleteAllAccounts(user.id);
      
      return new Response(
        JSON.stringify({ 
          success: result.success, 
          removedCount: result.removedCount,
          message: result.success ? 
            `Successfully removed ${result.removedCount} accounts` : 
            `Failed: ${result.error}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Default response for unrecognized action
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
        error: error.message || "Internal server error"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
