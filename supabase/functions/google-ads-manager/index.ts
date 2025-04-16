
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID") || "";
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";
const GOOGLE_ADS_DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") || "Ngh3IukgQ3ovdkH3M0smUg";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-user-id",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Exchange a refresh token for a new access token
 */
async function getAccessToken(refreshToken: string): Promise<string> {
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
    return tokens.access_token;
  } catch (error) {
    console.error("Error in getAccessToken:", error);
    throw error;
  }
}

/**
 * List Google Ads accounts using either v15 or v16 API version
 */
async function listGoogleAdsAccounts(accessToken: string, apiVersion = "v15"): Promise<any[]> {
  try {
    console.log(`Listing Google Ads accounts using API version ${apiVersion}`);
    
    // Try Google Ads API with specified version
    const listCustomersResponse = await fetch(
      `https://googleads.googleapis.com/${apiVersion}/customers:listAccessibleCustomers`,
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
      console.error(`Failed to list accessible customers with ${apiVersion}:`, errorText);
      throw new Error(`Google Ads API error: ${listCustomersResponse.status} ${errorText}`);
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
            `https://googleads.googleapis.com/${apiVersion}/customers/${customerId}`,
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
              status: "UNKNOWN"
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
            createdAt: new Date().toISOString()
          };
        } catch (error) {
          console.error(`Error fetching details for customer ${customerId}:`, error);
          return null;
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

/**
 * Save Google Ads accounts to the database
 */
async function saveAccountsToDatabase(userId: string, accounts: any[]): Promise<number> {
  if (!accounts || accounts.length === 0) {
    console.log("No accounts to store");
    return 0;
  }
  
  try {
    console.log(`Storing ${accounts.length} accounts for user ${userId}`);
    
    let savedCount = 0;
    
    // Upsert the accounts
    for (const account of accounts) {
      const { error } = await supabase
        .from('account_connections')
        .upsert({
          id: account.id,
          user_id: userId,
          name: account.name,
          platform: 'google',
          customer_id: account.customerId,
          is_connected: true,
          last_synced: new Date().toISOString()
        });
      
      if (error) {
        console.error(`Error upserting account ${account.id}:`, error);
      } else {
        savedCount++;
      }
    }
    
    console.log(`Successfully stored ${savedCount} accounts`);
    return savedCount;
  } catch (error) {
    console.error("Error storing accounts:", error);
    return 0;
  }
}

/**
 * Delete all Google Ads accounts for a user
 */
async function deleteAllAccounts(userId: string): Promise<{ success: boolean; removedCount: number; error?: string }> {
  try {
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

async function getUserFromToken(token: string): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      console.error("Error getting user from token:", error);
      return null;
    }
    return user.id;
  } catch (error) {
    console.error("Error in getUserFromToken:", error);
    return null;
  }
}

// Main serve function
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const userId = await getUserFromToken(token);
    
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { action, accessToken, refreshToken } = await req.json();
    
    // Handle listing accounts with direct access token
    if (action === "list-accounts" && accessToken) {
      try {
        // First try with v15 (most stable currently)
        try {
          const accounts = await listGoogleAdsAccounts(accessToken);
          
          // Store accounts in database
          await saveAccountsToDatabase(userId, accounts);
          
          return new Response(
            JSON.stringify({ success: true, accounts }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (v15Error) {
          console.log("Error with v15 API, trying v16...", v15Error);
          
          // Fallback to v16 if v15 fails
          const accounts = await listGoogleAdsAccounts(accessToken, "v16");
          
          // Store accounts in database
          await saveAccountsToDatabase(userId, accounts);
          
          return new Response(
            JSON.stringify({ success: true, accounts }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
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
    
    // Handle listing accounts with refresh token
    if (action === "list-accounts-with-refresh-token" && refreshToken) {
      try {
        const accessToken = await getAccessToken(refreshToken);
        
        // First try with v15 (most stable currently)
        try {
          const accounts = await listGoogleAdsAccounts(accessToken);
          
          // Store accounts in database
          await saveAccountsToDatabase(userId, accounts);
          
          return new Response(
            JSON.stringify({ success: true, accounts, accessToken }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (v15Error) {
          console.log("Error with v15 API, trying v16...", v15Error);
          
          // Fallback to v16 if v15 fails
          const accounts = await listGoogleAdsAccounts(accessToken, "v16");
          
          // Store accounts in database
          await saveAccountsToDatabase(userId, accounts);
          
          return new Response(
            JSON.stringify({ success: true, accounts, accessToken }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (error) {
        console.error("Error in list-accounts-with-refresh-token:", error);
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
    
    // Handle deleting all accounts
    if (action === "delete-all-accounts") {
      const result = await deleteAllAccounts(userId);
      
      return new Response(
        JSON.stringify({ 
          success: result.success, 
          removedCount: result.removedCount,
          error: result.error,
          message: result.success ? 
            `Successfully removed ${result.removedCount} accounts` : 
            `Failed to remove accounts: ${result.error}`
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        error: error.message || "Internal server error"
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
