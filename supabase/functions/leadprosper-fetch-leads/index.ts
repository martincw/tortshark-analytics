
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

const MAX_RETRIES = 3; // Reduced from 5
const BASE_DELAY = 1000; // Increased base delay
const MAX_CAMPAIGNS_PER_BATCH = 10; // Limit campaigns per request
const RATE_LIMIT_DELAY = 2000; // Delay between campaign requests

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, context: string): Promise<Response> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(`${context} - Attempt ${attempt + 1}/${MAX_RETRIES}`);
    
    const res = await fetch(url, init);
    
    if (res.ok) {
      console.log(`${context} - Success`);
      return res;
    }

    const status = res.status;
    const responseText = await res.text();
    console.log(`${context} - Error ${status}: ${responseText}`);
    
    // Don't retry on client errors (except 429)
    if (status >= 400 && status < 500 && status !== 429) {
      throw new Error(`${context}: ${status} ${responseText}`);
    }

    // For rate limits or server errors, wait longer
    if (attempt < MAX_RETRIES - 1) {
      const delay = status === 429 
        ? BASE_DELAY * Math.pow(2, attempt) + Math.random() * 1000
        : BASE_DELAY * Math.pow(1.5, attempt);
      
      console.log(`${context} - Waiting ${delay}ms before retry`);
      await sleep(delay);
    }
  }
  
  throw new Error(`${context}: exceeded retry limit after ${MAX_RETRIES} attempts`);
}

async function fetchAllCampaigns(): Promise<{ id: number; name: string }[]> {
  try {
    const res = await fetchWithRetry("https://api.leadprosper.io/public/campaigns", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${LEADPROSPER_API_KEY}`,
      },
    }, "Campaigns fetch");
    
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    
    const campaigns = data.map((c: any) => ({ id: c.id, name: c.name || String(c.id) }));
    console.log(`Fetched ${campaigns.length} campaigns`);
    return campaigns;
  } catch (error) {
    console.error("Failed to fetch campaigns:", error);
    return [];
  }
}

async function fetchLeadsForCampaign(campaignId: number, startDate: string, endDate: string, timezone: string) {
  let searchAfter: string | undefined = undefined;
  const leads: any[] = [];
  let pageCount = 0;
  const maxPages = 10; // Limit pages to prevent timeout

  while (pageCount < maxPages) {
    try {
      const url = new URL("https://api.leadprosper.io/public/leads");
      url.searchParams.set("timezone", timezone);
      url.searchParams.set("start_date", startDate);
      url.searchParams.set("end_date", endDate);
      url.searchParams.set("campaign", String(campaignId));
      if (searchAfter) url.searchParams.set("search_after", searchAfter);

      const res = await fetchWithRetry(url.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${LEADPROSPER_API_KEY}` },
      }, `Leads fetch for campaign ${campaignId} page ${pageCount + 1}`);

      const data = await res.json();
      const batch = Array.isArray(data?.leads) ? data.leads : [];
      leads.push(...batch);

      if (data?.search_after) {
        searchAfter = String(data.search_after);
        pageCount++;
        
        // Small delay between pages
        await sleep(200);
      } else {
        break;
      }

      // Safety: prevent excessive data
      if (leads.length > 2000) break;
    } catch (error) {
      console.error(`Error fetching leads for campaign ${campaignId}, page ${pageCount + 1}:`, error);
      break; // Don't fail the entire request for one campaign
    }
  }

  console.log(`Campaign ${campaignId}: ${leads.length} leads`);
  return leads;
}

function aggregateCampaign(campaignId: number, campaignName: string, leads: any[]): Aggregated {
  let accepted = 0, duplicated = 0, failed = 0, revenue = 0, cost = 0;
  
  for (const l of leads) {
    const status = String(l.status || "").toUpperCase();
    if (status === "ACCEPTED") accepted += 1;
    else if (status === "DUPLICATED") duplicated += 1;
    else failed += 1;

    revenue += Number(l.revenue || 0);
    cost += Number(l.cost || 0);
  }

  return {
    campaign_id: campaignId,
    campaign_name: campaignName,
    leads: leads.length,
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

    const { startDate, endDate, timezone = "America/New_York", campaigns: onlyCampaignIds, includeDQ = true } = await req.json();

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

    console.log(`Fetching data for ${startDate} to ${endDate}, includeDQ: ${includeDQ}`);

    // Get campaign list
    let campaigns = await fetchAllCampaigns();
    if (campaigns.length === 0) {
      return new Response(JSON.stringify({ error: "No campaigns found or API unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Filter campaigns
    if (Array.isArray(onlyCampaignIds) && onlyCampaignIds.length > 0) {
      const set = new Set(onlyCampaignIds.map((v: any) => Number(v)));
      campaigns = campaigns.filter((c) => set.has(Number(c.id)));
    }

    if (!includeDQ) {
      campaigns = campaigns.filter((c) => !/dq/i.test(c.name));
    }

    // Limit number of campaigns to prevent timeout
    campaigns = campaigns.slice(0, MAX_CAMPAIGNS_PER_BATCH);
    console.log(`Processing ${campaigns.length} campaigns`);

    const aggregated: Aggregated[] = [];
    
    // Process campaigns with rate limiting
    for (let i = 0; i < campaigns.length; i++) {
      const c = campaigns[i];
      console.log(`Processing campaign ${i + 1}/${campaigns.length}: ${c.name} (${c.id})`);
      
      try {
        const leads = await fetchLeadsForCampaign(c.id, startDate, endDate, timezone);
        if (leads.length > 0) {
          aggregated.push(aggregateCampaign(c.id, c.name, leads));
        }
      } catch (e) {
        console.error(`Failed for campaign ${c.id} (${c.name}):`, e);
        // Continue with other campaigns instead of failing entirely
      }
      
      // Rate limiting delay between campaigns
      if (i < campaigns.length - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    // Sort by total leads desc
    aggregated.sort((a, b) => b.leads - a.leads);

    console.log(`Successfully processed ${aggregated.length} campaigns with leads`);

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
