import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const LEADPROSPER_API_KEY = Deno.env.get("LEADPROSPER_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type Aggregated = {
  campaign_id: number;
  campaign_name: string;
  leads: number;
  accepted: number;
  duplicated: number;
  failed: number;
  revenue: number;
  cost: number;
  profit: number;
};

const MAX_RETRIES = 5;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, context: string): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res;

    const status = res.status;
    const retryable = status === 429 || status >= 500;
    if (!retryable) {
      const t = await res.text();
      throw new Error(`${context}: ${status} ${t}`);
    }

    const backoff = Math.min(2000, 300 * Math.pow(2, attempt)) + Math.floor(Math.random() * 100);
    await sleep(backoff);
  }
  throw new Error(`${context}: exceeded retry limit`);
}

async function fetchAllCampaigns(): Promise<{ id: number; name: string }[]> {
  const res = await fetchWithRetry("https://api.leadprosper.io/public/campaigns", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${LEADPROSPER_API_KEY}`,
    },
  }, "Campaigns fetch failed");
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((c: any) => ({ id: c.id, name: c.name || String(c.id) }));
}

async function fetchLeadsForCampaign(campaignId: number, startDate: string, endDate: string, timezone: string) {
  let searchAfter: string | undefined = undefined;
  const leads: any[] = [];

  while (true) {
    const url = new URL("https://api.leadprosper.io/public/leads");
    url.searchParams.set("timezone", timezone);
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    url.searchParams.set("campaign", String(campaignId));
    if (searchAfter) url.searchParams.set("search_after", searchAfter);

    const res = await fetchWithRetry(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${LEADPROSPER_API_KEY}` },
    }, `Leads fetch failed for ${campaignId}`);

    const data = await res.json();
    const batch = Array.isArray(data?.leads) ? data.leads : [];
    leads.push(...batch);

    if (data?.search_after) {
      searchAfter = String(data.search_after);
    } else {
      break;
    }

    // Safety: prevent excessive loops
    if (leads.length > 5000) break;

    // Be kind to the API between pages
    await sleep(150);
  }

  return leads;
}

function aggregateCampaign(campaignId: number, campaignName: string, leads: any[]): Aggregated {
  let accepted = 0, duplicated = 0, failed = 0, revenue = 0, cost = 0;
  for (const l of leads) {
    const status = String(l.status || "").toUpperCase();
    if (status === "ACCEPTED") accepted += 1;
    else if (status === "DUPLICATED") duplicated += 1;
    else failed += 1; // treat remaining as failed/rejected

    revenue += Number(l.revenue || 0);
    cost += Number(l.cost || 0);
  }

  const total = leads.length;
  return {
    campaign_id: campaignId,
    campaign_name: campaignName,
    leads: total,
    accepted,
    duplicated,
    failed,
    revenue: Number(revenue.toFixed(2)),
    cost: Number(cost.toFixed(2)),
    profit: Number((revenue - cost).toFixed(2)),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { startDate, endDate, timezone = "America/New_York", campaigns: onlyCampaignIds } = await req.json();

    if (!LEADPROSPER_API_KEY) {
      return new Response(JSON.stringify({ error: "LeadProsper API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ error: "Missing startDate or endDate" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get campaign list
    let campaigns = await fetchAllCampaigns();
    if (Array.isArray(onlyCampaignIds) && onlyCampaignIds.length > 0) {
      const set = new Set(onlyCampaignIds.map((v: any) => Number(v)));
      campaigns = campaigns.filter((c) => set.has(Number(c.id)));
    }

    // Fetch and aggregate serially to avoid rate-limits; simple and safe
    const aggregated: Aggregated[] = [];
    for (const c of campaigns) {
      try {
        const leads = await fetchLeadsForCampaign(c.id, startDate, endDate, timezone);
        if (leads.length > 0) {
          aggregated.push(aggregateCampaign(c.id, c.name, leads));
        }
      } catch (e) {
        console.error(`Failed for campaign ${c.id}:`, e);
      }
      // Small delay between campaigns to avoid hitting rate limits
      await sleep(200);
    }

    // Sort by total leads desc
    aggregated.sort((a, b) => b.leads - a.leads);

    return new Response(
      JSON.stringify({ campaigns: aggregated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("leadprosper-fetch-leads error:", err);
    return new Response(JSON.stringify({ error: err?.message || "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
