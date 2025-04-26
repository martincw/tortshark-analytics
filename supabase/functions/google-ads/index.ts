import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const DEVELOPER_TOKEN = Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!;
const REDIRECT_URI = Deno.env.get("SITE_URL") + "/integrations";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    const authHeader = req.headers.get("Authorization")?.split(" ")[1] || "";
    const { data: udata, error: authErr } = await supabase.auth.getUser(authHeader);
    if (authErr) {
      console.error("Auth error:", authErr);
      return new Response(JSON.stringify({ success: false, error: authErr.message }), { 
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    const user = udata.user!;

    async function getRefreshToken() {
      const { data, error } = await supabase
        .from("google_ads_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .single();
      if (error || !data || !data.refresh_token) {
        throw new Error("OAuth not completed yet");
      }
      return data.refresh_token as string;
    }

    async function fetchToken(params: Record<string, string>) {
      try {
        console.log(`Fetching token with params: ${JSON.stringify(params)}`);
        const resp = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(params)
        });
        
        if (!resp.ok) {
          const errorText = await resp.text();
          console.error(`Token fetch failed: ${resp.status} ${errorText}`);
          throw new Error(`Token fetch failed: ${resp.status} ${errorText}`);
        }
        
        return resp.json() as Promise<{
          access_token?: string,
          refresh_token?: string,
          error?: string,
          expires_in?: number
        }>;
      } catch (err) {
        console.error("Error fetching token:", err);
        throw err;
      }
    }

    const path = url.pathname.split('/').pop() || '';
    const reqBody = req.method === 'POST' ? await req.json() : {};
    console.log(`Processing request: ${path}, action: ${reqBody.action}`);
    
    const action = reqBody.action || '';

    switch (action) {
      case "auth": {
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${CLIENT_ID}` +
          `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
          `&response_type=code` +
          `&scope=${encodeURIComponent("https://www.googleapis.com/auth/adwords")}` +
          `&access_type=offline&prompt=consent` +
          `&state=${encodeURIComponent(JSON.stringify({ userId: user.id }))}`;
        
        console.log("Generated auth URL:", authUrl);
        
        return new Response(JSON.stringify({ success: true, url: authUrl }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "callback": {
        const { code } = reqBody;
        if (!code) {
          throw new Error("Missing authorization code");
        }
        
        console.log("Exchanging code for token");
        const tok = await fetchToken({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: "authorization_code"
        });
        
        if (!tok.refresh_token) {
          throw new Error("No refresh_token returned; ensure offline access & prompt=consent");
        }
        
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (tok.expires_in || 3600) * 1000);
        
        let userEmail = null;
        if (tok.access_token) {
          try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${tok.access_token}` }
            });
            
            if (userInfoResponse.ok) {
              const userInfo = await userInfoResponse.json();
              userEmail = userInfo.email;
            }
          } catch (userInfoErr) {
            console.warn("Could not fetch user email:", userInfoErr);
          }
        }
        
        const { error: upsertError } = await supabase
          .from("google_ads_tokens")
          .upsert(
            { 
              user_id: user.id, 
              refresh_token: tok.refresh_token,
              access_token: tok.access_token,
              expires_at: expiresAt.toISOString(),
              scope: "https://www.googleapis.com/auth/adwords",
              email: userEmail
            },
            { onConflict: "user_id" }
          );
          
        if (upsertError) {
          console.error("Error saving token:", upsertError);
          throw new Error(`Failed to save refresh token: ${upsertError.message}`);
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Google Ads connected! Refresh token saved.",
          userEmail
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "accounts": {
        const rt = await getRefreshToken();
        const { access_token } = await fetchToken({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          refresh_token: rt,
          grant_type: "refresh_token"
        });
        
        if (!access_token) {
          throw new Error("Failed to get access token");
        }
        
        console.log("Fetching accessible Google Ads accounts...");
        
        const accountsResp = await fetch(
          "https://googleads.googleapis.com/v16/customers:listAccessibleCustomers",
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              "developer-token": DEVELOPER_TOKEN
            }
          }
        );
        
        if (!accountsResp.ok) {
          const errorText = await accountsResp.text();
          console.error("Failed to fetch accounts:", errorText);
          throw new Error(`Failed to fetch accounts: ${accountsResp.status} ${errorText}`);
        }
        
        const { resourceNames } = await accountsResp.json();
        
        if (!resourceNames || !Array.isArray(resourceNames) || resourceNames.length === 0) {
          console.log("No accessible accounts found");
          return new Response(JSON.stringify({ success: true, accounts: [] }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
        
        console.log(`Found ${resourceNames.length} accessible accounts`);
        
        const customerIds = resourceNames.map((name: string) => name.split('/')[1]);
        
        const accounts = await Promise.all(
          customerIds.map(async (customerId: string) => {
            try {
              const customerResp = await fetch(
                `https://googleads.googleapis.com/v16/customers/${customerId}`,
                {
                  headers: {
                    Authorization: `Bearer ${access_token}`,
                    "developer-token": DEVELOPER_TOKEN
                  }
                }
              );
              
              if (!customerResp.ok) {
                console.error(`Failed to fetch details for customer ${customerId}`);
                return {
                  id: customerId,
                  customerId: customerId,
                  name: `Account ${customerId}`,
                  status: "UNKNOWN"
                };
              }
              
              const customerData = await customerResp.json();
              
              return {
                id: customerId,
                customerId: customerId,
                name: customerData.customer?.descriptiveName || `Account ${customerId}`,
                status: customerData.customer?.status || "ENABLED"
              };
            } catch (error) {
              console.error(`Error fetching details for customer ${customerId}:`, error);
              return null;
            }
          })
        );
        
        const validAccounts = accounts.filter((account: any) => account !== null);
        
        for (const account of validAccounts) {
          try {
            await supabase.from("account_connections").upsert({
              id: account.id,
              user_id: user.id,
              platform: "google",
              name: account.name,
              customer_id: account.customerId,
              is_connected: true,
              last_synced: new Date().toISOString()
            });
          } catch (dbError) {
            console.error("Error saving account to database:", dbError);
          }
        }
        
        return new Response(JSON.stringify({ success: true, accounts: validAccounts }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "get-developer-token": {
        return new Response(JSON.stringify({ success: true, developerToken: DEVELOPER_TOKEN }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case "validate": {
        try {
          const rt = await getRefreshToken();
          const { access_token } = await fetchToken({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: rt,
            grant_type: "refresh_token"
          });
          
          if (!access_token) {
            return new Response(JSON.stringify({ success: false, valid: false }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          
          const validateResp = await fetch(
            "https://www.googleapis.com/oauth2/v3/tokeninfo",
            {
              method: "GET",
              headers: {
                Authorization: `Bearer ${access_token}`
              }
            }
          );
          
          const isValid = validateResp.ok;
          return new Response(JSON.stringify({ success: true, valid: isValid }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error("Token validation error:", error);
          return new Response(JSON.stringify({ success: false, valid: false, error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "refresh": {
        try {
          const rt = await getRefreshToken();
          const tokResponse = await fetchToken({
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: rt,
            grant_type: "refresh_token"
          });
          
          if (!tokResponse.access_token) {
            throw new Error("Failed to refresh token");
          }
          
          const expiresAt = new Date(Date.now() + (tokResponse.expires_in || 3600) * 1000);
          
          const { error: updateError } = await supabase
            .from("google_ads_tokens")
            .update({
              access_token: tokResponse.access_token,
              expires_at: expiresAt.toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("user_id", user.id);
            
          if (updateError) {
            console.error("Error updating token:", updateError);
            throw new Error(`Failed to update token: ${updateError.message}`);
          }
          
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error("Token refresh error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      case "revoke": {
        try {
          const { data, error } = await supabase
            .from("google_ads_tokens")
            .select("access_token")
            .eq("user_id", user.id)
            .single();
            
          if (error || !data || !data.access_token) {
            return new Response(JSON.stringify({ success: true, message: "No token to revoke" }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
          }
          
          const revokeResp = await fetch(
            `https://oauth2.googleapis.com/revoke?token=${data.access_token}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" }
            }
          );
          
          await supabase
            .from("google_ads_tokens")
            .delete()
            .eq("user_id", user.id);
            
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        } catch (error) {
          console.error("Token revocation error:", error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      }

      default:
        return new Response(JSON.stringify({ success: false, error: "Invalid action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
  } catch (error) {
    console.error("Error in edge function:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || "Internal server error",
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
