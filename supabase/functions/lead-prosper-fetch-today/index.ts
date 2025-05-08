import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";
import { format } from "https://esm.sh/date-fns@2.30.0";

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

// Fetch leads from the Lead Prosper API for today with retries
async function fetchTodayLeads(
  apiKey: string,
  campaignId: number,
  timezone: string = 'America/Denver',
  maxRetries: number = 3
): Promise<any> {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  console.log(`Fetching today's leads (${today}) for campaign ${campaignId}`);
  
  const url = `https://api.leadprosper.io/public/leads?campaign=${campaignId}&start_date=${today}&end_date=${today}&timezone=${timezone}`;
  
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to fetch leads for campaign ${campaignId} (attempt ${attempt}/${maxRetries}): ${error}`);
        
        // If this is our last retry, throw the error
        if (attempt === maxRetries) {
          throw new Error(`Failed to fetch leads: ${error}`);
        }
        
        // Otherwise wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
        continue;
      }

      const data = await response.json();
      console.log(`Received ${data.data?.length || 0} leads for campaign ${campaignId}`);
      return data;
    } catch (error) {
      lastError = error;
      
      // If this is our last retry, we'll throw the error after the loop
      if (attempt < maxRetries) {
        console.log(`Retry attempt ${attempt} failed, trying again...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError || new Error(`Failed to fetch leads for campaign ${campaignId} after ${maxRetries} attempts`);
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
    let apiKey;
    try {
      const body = await req.json();
      apiKey = body.apiKey;
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse request body',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Missing API key' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active campaign mappings
    const { data: mappings, error: mappingsError } = await supabaseClient
      .from('lp_to_ts_map')
      .select(`
        ts_campaign_id,
        lp_campaign:external_lp_campaigns(id, lp_campaign_id, name)
      `)
      .eq('active', true);

    if (mappingsError) {
      console.error('Error fetching campaign mappings:', mappingsError);
      return new Response(
        JSON.stringify({ error: mappingsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mappings || mappings.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active campaign mappings found', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${mappings.length} active campaign mappings`);
    
    let totalLeads = 0;
    let successCount = 0;
    let errorCount = 0;
    const results = [];

    // Process each campaign mapping
    for (const mapping of mappings) {
      if (!mapping.lp_campaign || !mapping.lp_campaign.lp_campaign_id) {
        console.warn(`Missing LP campaign ID for mapping to ${mapping.ts_campaign_id}`);
        results.push({
          ts_campaign_id: mapping.ts_campaign_id,
          error: 'Missing Lead Prosper campaign ID',
          status: 'skipped'
        });
        errorCount++;
        continue;
      }

      const lpCampaignId = mapping.lp_campaign.lp_campaign_id;
      
      try {
        // Fetch today's leads for this campaign
        const leadsData = await fetchTodayLeads(apiKey, lpCampaignId);
        
        if (leadsData.data && leadsData.data.length > 0) {
          // Process the leads
          await processLeadsAndUpdateMetrics(supabaseClient, leadsData.data, {
            ts_campaign_id: mapping.ts_campaign_id
          });
          
          totalLeads += leadsData.data.length;
          successCount++;
          
          results.push({
            campaign_id: lpCampaignId,
            ts_campaign_id: mapping.ts_campaign_id,
            campaign_name: mapping.lp_campaign.name,
            leads_count: leadsData.data.length,
            status: 'success'
          });
        } else {
          results.push({
            campaign_id: lpCampaignId,
            ts_campaign_id: mapping.ts_campaign_id,
            campaign_name: mapping.lp_campaign.name,
            leads_count: 0,
            status: 'success'
          });
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing campaign ${lpCampaignId}:`, error);
        errorCount++;
        results.push({
          campaign_id: lpCampaignId,
          ts_campaign_id: mapping.ts_campaign_id,
          campaign_name: mapping.lp_campaign?.name || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        });
      }
    }

    // Return success with summary
    return new Response(
      JSON.stringify({ 
        success: errorCount === 0,
        total_leads: totalLeads,
        campaigns_processed: mappings.length,
        success_count: successCount,
        error_count: errorCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Unexpected error occurred', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
