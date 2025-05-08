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

// Try different timezone formats to find one that works
async function fetchTodayLeadsWithTimezoneOptions(
  apiKey: string,
  campaignId: number,
  requestedTimezone: string = 'America/Denver',
  maxRetries: number = 2
): Promise<any> {
  // Format today's date
  const today = format(new Date(), 'yyyy-MM-dd');
  console.log(`Attempting to fetch leads for campaign ${campaignId} for date ${today}`);
  
  // Define different timezone formats to try
  const timezoneFormats = [
    { format: null, description: "No timezone parameter (using campaign default)" },
    { format: requestedTimezone, description: `IANA timezone name (${requestedTimezone})` },
    { format: "UTC", description: "UTC timezone" },
    { format: "US/Mountain", description: "US/Mountain timezone" },
    { format: "-07:00", description: "UTC offset format" },
    { format: "MST", description: "Mountain Standard Time abbreviation" },
  ];
  
  // Try each timezone format
  const errors = [];
  
  for (const { format, description } of timezoneFormats) {
    try {
      console.log(`Trying ${description}`);
      
      // Build URL - only include timezone if format is provided
      let url = `https://api.leadprosper.io/public/leads?campaign=${campaignId}&start_date=${today}&end_date=${today}`;
      if (format !== null) {
        url += `&timezone=${encodeURIComponent(format)}`;
      }
      
      // Make the API call
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      // Check if successful
      if (response.ok) {
        const data = await response.json();
        console.log(`Success using ${description}! Received ${data.data?.length || 0} leads`);
        return data;
      }
      
      // If not successful, capture the error
      const errorText = await response.text();
      const statusCode = response.status;
      console.error(`Failed with ${description}: ${statusCode} - ${errorText}`);
      errors.push({ format: description, error: errorText, status: statusCode });
      
      // If this isn't a timezone error, we should stop and report the actual error
      if (!errorText.includes("timezone") && 
          !errorText.toLowerCase().includes("cannot assign null")) {
        throw new Error(`API returned status ${statusCode}: ${errorText}`);
      }
      
      // Otherwise continue trying other formats
    } catch (error) {
      console.error(`Error with ${description}:`, error);
      errors.push({ format: description, error: error instanceof Error ? error.message : String(error) });
    }
  }
  
  // If we've tried all formats and none worked, report detailed error
  const errorDetails = JSON.stringify(errors, null, 2);
  throw new Error(`Failed to fetch leads using any timezone format. Details: ${errorDetails}`);
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
    console.log("Lead Prosper fetch-today function called");
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
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
    let requestedTimezone = 'America/Denver'; // Default timezone
    
    try {
      const body = await req.json();
      apiKey = body.apiKey;
      
      // Extract timezone from the request body if provided
      if (body.timezone && typeof body.timezone === 'string') {
        requestedTimezone = body.timezone;
      }
      
      if (!apiKey) {
        console.error("Missing API key in request body");
        return new Response(
          JSON.stringify({ error: 'Missing API key' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log("API key received, length:", apiKey.length);
      console.log("User requested timezone:", requestedTimezone);
    } catch (error) {
      console.error("Failed to parse request body:", error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse request body',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all active campaign mappings
    const { data: mappings, error: mappingsError } = await supabaseClient
      .from('lp_to_ts_map')
      .select(`
        id,
        ts_campaign_id,
        lp_campaign:external_lp_campaigns(id, lp_campaign_id, name)
      `)
      .eq('active', true);

    if (mappingsError) {
      console.error('Error fetching campaign mappings:', mappingsError);
      return new Response(
        JSON.stringify({ 
          error: mappingsError.message,
          details: 'Failed to fetch active campaign mappings'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!mappings || mappings.length === 0) {
      console.log('No active campaign mappings found');
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
        console.warn(`Mapping ${mapping.id}: Missing LP campaign ID for mapping to ${mapping.ts_campaign_id}`);
        results.push({
          mapping_id: mapping.id,
          ts_campaign_id: mapping.ts_campaign_id,
          error: 'Missing Lead Prosper campaign ID',
          status: 'skipped'
        });
        errorCount++;
        continue;
      }

      const lpCampaignId = mapping.lp_campaign.lp_campaign_id;
      
      try {
        console.log(`Processing mapping ${mapping.id}: LP Campaign ${lpCampaignId} -> TS Campaign ${mapping.ts_campaign_id}`);
        
        // Try to fetch leads using different timezone formats
        const leadsData = await fetchTodayLeadsWithTimezoneOptions(
          apiKey, 
          lpCampaignId, 
          requestedTimezone
        );
        
        if (leadsData.data && leadsData.data.length > 0) {
          // Process the leads
          await processLeadsAndUpdateMetrics(supabaseClient, leadsData.data, {
            ts_campaign_id: mapping.ts_campaign_id
          });
          
          totalLeads += leadsData.data.length;
          successCount++;
          
          results.push({
            mapping_id: mapping.id,
            campaign_id: lpCampaignId,
            ts_campaign_id: mapping.ts_campaign_id,
            campaign_name: mapping.lp_campaign.name,
            leads_count: leadsData.data.length,
            status: 'success'
          });
        } else {
          console.log(`No leads found today for campaign ${lpCampaignId}`);
          results.push({
            mapping_id: mapping.id,
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
          mapping_id: mapping.id,
          campaign_id: lpCampaignId,
          ts_campaign_id: mapping.ts_campaign_id,
          campaign_name: mapping.lp_campaign?.name || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        });
      }
    }

    console.log(`Completed processing. Total leads: ${totalLeads}, Success: ${successCount}, Errors: ${errorCount}`);
    
    // Return success with summary
    return new Response(
      JSON.stringify({ 
        success: errorCount === 0,
        total_leads: totalLeads,
        campaigns_processed: mappings.length,
        success_count: successCount,
        error_count: errorCount,
        results,
        last_synced: new Date().toISOString()
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
