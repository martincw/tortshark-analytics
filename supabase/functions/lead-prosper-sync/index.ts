
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
const handleCors = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

// Fetch leads from the Lead Prosper API
async function fetchLeadProsperLeads(
  apiKey: string,
  campaignId: number,
  startDate: string,
  endDate: string,
  searchAfter?: string,
  timezone: string = 'America/Denver'
): Promise<any> {
  let url = `https://api.leadprosper.io/public/leads?campaign=${campaignId}&start_date=${startDate}&end_date=${endDate}&timezone=${timezone}`;
  
  if (searchAfter) {
    url += `&search_after=${searchAfter}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch leads: ${error}`);
  }

  return await response.json();
}

// Process leads and update metrics
async function processLeadsAndUpdateMetrics(
  supabaseClient: any,
  leads: any[],
  campaignMapping: any
): Promise<void> {
  // Store raw leads
  for (const lead of leads) {
    await supabaseClient.from('lp_leads_raw').upsert({
      id: lead.id,
      lp_campaign_id: lead.campaign_id,
      ts_campaign_id: campaignMapping.ts_campaign_id,
      status: lead.status,
      cost: lead.cost || 0,
      revenue: lead.revenue || 0,
      lead_date_ms: lead.created_at,
      json_payload: lead,
    }, {
      onConflict: 'id',
    });

    // Get the date from the lead timestamp
    const leadDate = new Date(lead.created_at);
    const dateString = leadDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Update daily metrics
    let status = lead.status?.toUpperCase() || 'UNKNOWN';
    let accepted = status === 'ACCEPTED' ? 1 : 0;
    let duplicated = status === 'DUPLICATE' ? 1 : 0;
    let failed = status === 'FAILED' || status === 'REJECTED' ? 1 : 0;

    // Upsert into daily metrics
    await supabaseClient.rpc('upsert_daily_lead_metrics', {
      p_ts_campaign_id: campaignMapping.ts_campaign_id,
      p_date: dateString,
      p_lead_count: 1,
      p_accepted: accepted,
      p_duplicated: duplicated,
      p_failed: failed,
      p_cost: lead.cost || 0,
      p_revenue: lead.revenue || 0
    });
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get parameters from the request
    const { apiKey, lp_campaign_id, ts_campaign_id, startDate, endDate, mode } = await req.json();

    if (!apiKey || !lp_campaign_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the campaign mapping
    const { data: mapping, error: mappingError } = await supabaseClient
      .from('lp_to_ts_map')
      .select('*')
      .eq('lp_campaign_id', lp_campaign_id)
      .eq('active', true)
      .single();

    if (mappingError && mappingError.code !== 'PGRST116') {
      return new Response(
        JSON.stringify({ error: mappingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no mapping exists and we're not in backfill mode, return an error
    if (!mapping && mode !== 'backfill') {
      return new Response(
        JSON.stringify({ error: 'No active mapping found for this campaign' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we're in backfill mode, use the provided ts_campaign_id
    const campaignMapping = mode === 'backfill' ? { ts_campaign_id } : mapping;

    // Fetch leads from the Lead Prosper API
    let allLeads = [];
    let searchAfter = null;
    let hasMore = true;

    while (hasMore) {
      const leadsResponse = await fetchLeadProsperLeads(
        apiKey,
        lp_campaign_id,
        startDate,
        endDate,
        searchAfter
      );

      if (leadsResponse.data && leadsResponse.data.length > 0) {
        allLeads = [...allLeads, ...leadsResponse.data];
        
        // Check if there's a search_after cursor for pagination
        if (leadsResponse.search_after) {
          searchAfter = leadsResponse.search_after;
        } else {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }

      // Process leads in batches to avoid overwhelming the database
      if (allLeads.length > 0) {
        await processLeadsAndUpdateMetrics(supabaseClient, allLeads, campaignMapping);
        allLeads = []; // Clear processed leads
      }
    }

    // Return success
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
