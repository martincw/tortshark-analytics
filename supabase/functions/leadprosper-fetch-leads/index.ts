
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

// Utilities for timezone-aware date handling and daily aggregation
function formatYmdInTz(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function todayInTz(timezone: string): string {
  return formatYmdInTz(new Date(), timezone);
}

function listDates(start: string, end: string): string[] {
  const out: string[] = [];
  const s = new Date(start + 'T00:00:00Z');
  const e = new Date(end + 'T00:00:00Z');
  for (let d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    out.push(`${y}-${m}-${da}`);
  }
  return out;
}

function getLeadDateInTz(lead: any, timezone: string): string | null {
  // Try multiple fields to derive the timestamp
  const candidates = [
    lead.created_at_ms, lead.created_at, lead.timestamp, lead.lead_date_ms,
    lead.lead_date, lead.date, lead.datetime, lead.received_at
  ];
  let ts: number | null = null;
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === 'number') { ts = c; break; }
    const parsed = Date.parse(String(c));
    if (!isNaN(parsed)) { ts = parsed; break; }
  }
  if (ts == null) return null;
  return formatYmdInTz(new Date(ts), timezone);
}

function aggregateDailyByDate(campaignId: number, campaignName: string, leads: any[], timezone: string) {
  const daily: Record<string, Aggregated> = {};
  for (const l of leads) {
    const dateStr = getLeadDateInTz(l, timezone);
    if (!dateStr) continue;
    if (!daily[dateStr]) {
      daily[dateStr] = {
        campaign_id: campaignId,
        campaign_name: campaignName,
        leads: 0,
        accepted: 0,
        duplicated: 0,
        failed: 0,
        revenue: 0,
        cost: 0,
        profit: 0,
      };
    }
    const row = daily[dateStr];
    const status = String(l.status || '').toUpperCase();
    if (status === 'ACCEPTED') row.accepted += 1;
    else if (status === 'DUPLICATED') row.duplicated += 1;
    else row.failed += 1;
    row.leads += 1;
    row.revenue += Number(l.revenue || 0);
    row.cost += Number(l.cost || 0);
    row.profit = Number((row.revenue - row.cost).toFixed(2));
  }
  return daily; // key: yyyy-MM-dd
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

    const userId = userRes.user.id;
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

    // Filter campaigns by selection and DQ flag
    if (Array.isArray(onlyCampaignIds) && onlyCampaignIds.length > 0) {
      const set = new Set(onlyCampaignIds.map((v: any) => Number(v)));
      campaigns = campaigns.filter((c) => set.has(Number(c.id)));
    }
    if (!includeDQ) {
      campaigns = campaigns.filter((c) => !/dq/i.test(c.name));
    }

    // Limit number of campaigns to prevent timeout (still honored after cache)
    campaigns = campaigns.slice(0, MAX_CAMPAIGNS_PER_BATCH);

    const dates = listDates(startDate, endDate);
    const todayStr = todayInTz(timezone);

    // Load cached daily aggregates for user in range
    const { data: cachedRows, error: cacheErr } = await supabase
      .from('lp_campaign_daily_aggregates')
      .select('lp_campaign_id, lp_campaign_name, date, leads, accepted, duplicated, failed, revenue, cost, profit, last_fetched_at')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (cacheErr) {
      console.error('Cache read error:', cacheErr);
    }

    const cacheMap = new Map<string, any>();
    (cachedRows || []).forEach(r => {
      cacheMap.set(`${r.lp_campaign_id}:${r.date}`, r);
    });

    // Determine which campaigns require a refresh (missing any past day OR today's cache is stale >5min)
    const toFetch: { id: number; name: string }[] = [];
    for (const c of campaigns) {
      let needsFetch = false;
      for (const d of dates) {
        const key = `${c.id}:${d}`;
        const cached = cacheMap.get(key);
        if (!cached) { needsFetch = true; break; }
        const isToday = d === todayStr;
        if (isToday) {
          const last = new Date(cached.last_fetched_at).getTime();
          if (Date.now() - last > 5 * 60 * 1000) { // 5 minutes
            needsFetch = true; break;
          }
        }
      }
      if (needsFetch) toFetch.push(c);
    }

    console.log(`Campaigns needing refresh: ${toFetch.length}/${campaigns.length}`);

    // Fetch and upsert daily aggregates for campaigns that need it
    for (let i = 0; i < toFetch.length; i++) {
      const c = toFetch[i];
      console.log(`Refreshing campaign ${i + 1}/${toFetch.length}: ${c.name} (${c.id})`);
      try {
        const leads = await fetchLeadsForCampaign(c.id, startDate, endDate, timezone);
        const daily = aggregateDailyByDate(c.id, c.name, leads, timezone);
        const upsertPayload = Object.entries(daily).map(([date, agg]) => ({
          user_id: userId,
          lp_campaign_id: agg.campaign_id,
          lp_campaign_name: agg.campaign_name,
          date,
          leads: agg.leads,
          accepted: agg.accepted,
          duplicated: agg.duplicated,
          failed: agg.failed,
          revenue: agg.revenue,
          cost: agg.cost,
          profit: agg.profit,
          last_fetched_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        if (upsertPayload.length > 0) {
          const { error: upsertErr } = await supabase
            .from('lp_campaign_daily_aggregates')
            .upsert(upsertPayload, { onConflict: 'user_id,lp_campaign_id,date' });
          if (upsertErr) console.error('Upsert error:', upsertErr);
        }
      } catch (e) {
        console.error(`Failed refresh for campaign ${c.id} (${c.name}):`, e);
      }
      if (i < toFetch.length - 1) {
        await sleep(RATE_LIMIT_DELAY);
      }
    }

    // Re-read all rows to build response
    const { data: finalRows, error: finalErr } = await supabase
      .from('lp_campaign_daily_aggregates')
      .select('lp_campaign_id, lp_campaign_name, date, leads, accepted, duplicated, failed, revenue, cost, profit, last_fetched_at')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (finalErr) {
      console.error('Final cache read error:', finalErr);
      return new Response(JSON.stringify({ error: 'Failed to read cached data' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Aggregate by campaign
    const byCampaign = new Map<number, Aggregated & { last_times: number[] }>();
    for (const r of finalRows || []) {
      const id = Number(r.lp_campaign_id);
      const curr = byCampaign.get(id) || {
        campaign_id: id,
        campaign_name: r.lp_campaign_name,
        leads: 0, accepted: 0, duplicated: 0, failed: 0,
        revenue: 0, cost: 0, profit: 0,
        last_times: [] as number[],
      };
      curr.campaign_name = r.lp_campaign_name; // keep latest name
      curr.leads += Number(r.leads || 0);
      curr.accepted += Number(r.accepted || 0);
      curr.duplicated += Number(r.duplicated || 0);
      curr.failed += Number(r.failed || 0);
      curr.revenue += Number(r.revenue || 0);
      curr.cost += Number(r.cost || 0);
      curr.profit = Number((curr.revenue - curr.cost).toFixed(2));
      if (r.last_fetched_at) curr.last_times.push(new Date(r.last_fetched_at).getTime());
      byCampaign.set(id, curr);
    }

    let aggregated = Array.from(byCampaign.values()).map(({ last_times, ...rest }) => rest);

    // Apply DQ filter post-aggregation as well (safety)
    if (!includeDQ) {
      aggregated = aggregated.filter(a => !/dq/i.test(a.campaign_name || ''));
    }

    // Sort and limit
    aggregated.sort((a, b) => b.leads - a.leads);
    aggregated = aggregated.slice(0, MAX_CAMPAIGNS_PER_BATCH);

    // Compute last updated from rows
    let lastUpdated: number = 0;
    for (const r of finalRows || []) {
      if (r.last_fetched_at) {
        const t = new Date(r.last_fetched_at).getTime();
        if (t > lastUpdated) lastUpdated = t;
      }
    }

    const response = {
      campaigns: aggregated,
      last_updated: lastUpdated ? new Date(lastUpdated).toISOString() : new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response),
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
