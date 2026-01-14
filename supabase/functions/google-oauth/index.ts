
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const textEncoder = new TextEncoder();

function base64UrlEncodeBytes(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeToBytes(b64url: string) {
  const padded = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacSignBase64Url(data: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, textEncoder.encode(data));
  return base64UrlEncodeBytes(new Uint8Array(sig));
}

async function hmacVerify(data: string, signatureB64Url: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecodeToBytes(signatureB64Url),
    textEncoder.encode(data),
  );
}

type OAuthStatePayload = {
  user_id: string;
  redirect_to: string;
  ts: number;
};

async function createSignedState(payload: OAuthStatePayload, secret: string) {
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncodeBytes(textEncoder.encode(payloadJson));
  const sigB64 = await hmacSignBase64Url(payloadB64, secret);
  return `${payloadB64}.${sigB64}`;
}

async function verifySignedState(state: string, secret: string): Promise<OAuthStatePayload | null> {
  const parts = state.split(".");
  if (parts.length !== 2) return null;

  const [payloadB64, sigB64] = parts;
  const ok = await hmacVerify(payloadB64, sigB64, secret);
  if (!ok) return null;

  try {
    const payloadJson = new TextDecoder().decode(base64UrlDecodeToBytes(payloadB64));
    const payload = JSON.parse(payloadJson) as OAuthStatePayload;
    if (!payload?.user_id || !payload?.redirect_to || !payload?.ts) return null;
    return payload;
  } catch {
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID") || "";
  const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") || "";

  // Stable redirect URI (register this in Google Cloud OAuth settings)
  const redirectUri = `${supabaseUrl}/functions/v1/google-oauth`;

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(
      JSON.stringify({ success: false, error: "Supabase env vars missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // Admin client (bypasses RLS)
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // ===== Google redirect callback (GET) =====
    // This makes the OAuth flow work from any frontend domain (Lovable preview, production, etc.)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const oauthError = url.searchParams.get("error");

      if (!state) {
        return new Response("Missing OAuth state", { status: 400 });
      }

      const payload = await verifySignedState(state, googleClientSecret);
      if (!payload) {
        return new Response("Invalid OAuth state", { status: 400 });
      }

      // Expire state after 10 minutes
      if (Date.now() - payload.ts > 10 * 60 * 1000) {
        return new Response("OAuth state expired", { status: 400 });
      }

      // If Google returned an error, bounce user back.
      if (oauthError) {
        const redirectBack = new URL(payload.redirect_to);
        redirectBack.searchParams.set("google_oauth_error", oauthError);
        return Response.redirect(redirectBack.toString(), 302);
      }

      if (!code) {
        const redirectBack = new URL(payload.redirect_to);
        redirectBack.searchParams.set("google_oauth_error", "missing_code");
        return Response.redirect(redirectBack.toString(), 302);
      }

      // Exchange code -> tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);

        const redirectBack = new URL(payload.redirect_to);
        redirectBack.searchParams.set("google_oauth_error", "token_exchange_failed");
        return Response.redirect(redirectBack.toString(), 302);
      }

      const tokens = await tokenResponse.json();

      const { error: dbError } = await supabaseAdmin
        .from("google_ads_tokens")
        .upsert({
          // Force one-row-per-user by using user_id as the row id
          id: payload.user_id,
          user_id: payload.user_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          scope: tokens.scope,
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error("Database error storing tokens:", dbError);
        const redirectBack = new URL(payload.redirect_to);
        redirectBack.searchParams.set("google_oauth_error", "db_write_failed");
        return Response.redirect(redirectBack.toString(), 302);
      }

      // Best-effort cleanup of any legacy duplicate rows
      const { error: cleanupError } = await supabaseAdmin
        .from("google_ads_tokens")
        .delete()
        .eq("user_id", payload.user_id)
        .neq("id", payload.user_id);

      if (cleanupError) {
        console.error("Token cleanup error (non-fatal):", cleanupError);
      }

      const redirectBack = new URL(payload.redirect_to);
      redirectBack.searchParams.set("google_connected", "1");
      return Response.redirect(redirectBack.toString(), 302);
    }

    // ===== Authenticated actions (POST) =====
    const supabaseClient = createClient(supabaseUrl, anonKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Authentication failed", details: userError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { action, code, redirectTo } = body;

    // Handle auth initiation
    if (action === "auth") {
      const safeRedirectTo = typeof redirectTo === "string" && redirectTo.startsWith("http")
        ? redirectTo
        : `${Deno.env.get("SITE_URL") || ""}/data-sources?source=googleads`;

      const state = await createSignedState(
        { user_id: user.id, redirect_to: safeRedirectTo, ts: Date.now() },
        googleClientSecret,
      );

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", googleClientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/adwords");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      authUrl.searchParams.set("state", state);

      return new Response(
        JSON.stringify({ success: true, url: authUrl.toString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Backwards-compatible callback endpoint (client-driven)
    if (action === "callback" && code) {
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: googleClientId,
          client_secret: googleClientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token exchange failed:", errorText);
        return new Response(
          JSON.stringify({ success: false, error: `Token exchange failed: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const tokens = await tokenResponse.json();

      const { error: dbError } = await supabaseAdmin
        .from("google_ads_tokens")
        .upsert({
          // Force one-row-per-user by using user_id as the row id
          id: user.id,
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          scope: tokens.scope,
          updated_at: new Date().toISOString(),
        });

      if (dbError) {
        console.error("Database error:", dbError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to store tokens: ${dbError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Best-effort cleanup of any legacy duplicate rows
      const { error: cleanupError } = await supabaseAdmin
        .from("google_ads_tokens")
        .delete()
        .eq("user_id", user.id)
        .neq("id", user.id);

      if (cleanupError) {
        console.error("Token cleanup error (non-fatal):", cleanupError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Handle token validation
    if (action === "validate") {
      const { data: tokens, error: tokensError } = await supabaseAdmin
        .from("google_ads_tokens")
        .select("expires_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokensError) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to get tokens: ${tokensError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!tokens?.expires_at) {
        return new Response(
          JSON.stringify({ valid: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const isExpired = new Date(tokens.expires_at) <= new Date();
      return new Response(
        JSON.stringify({ valid: !isExpired }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Handle token refresh
    if (action === "refresh") {
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from("google_ads_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenError || !tokenData?.refresh_token) {
        return new Response(
          JSON.stringify({ success: false, error: "No refresh token available" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: googleClientId,
          client_secret: googleClientSecret,
          refresh_token: tokenData.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("Token refresh failed:", errorText);
        return new Response(
          JSON.stringify({ success: false, error: `Token refresh failed: ${errorText}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const tokens = await tokenResponse.json();

      const { error: updateError } = await supabaseAdmin
        .from("google_ads_tokens")
        .update({
          access_token: tokens.access_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to update tokens: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Handle token revocation
    if (action === "revoke") {
      const { data: tokenData } = await supabaseAdmin
        .from("google_ads_tokens")
        .select("access_token")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tokenData?.access_token) {
        try {
          await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenData.access_token}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
          });
        } catch (revokeError) {
          console.error("Error revoking token at Google:", revokeError);
        }
      }

      const { error: deleteError } = await supabaseAdmin
        .from("google_ads_tokens")
        .delete()
        .eq("user_id", user.id);

      if (deleteError) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to delete token: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Invalid action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Unexpected error in google-oauth edge function:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Unexpected server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
