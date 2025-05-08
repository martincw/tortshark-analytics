
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
  maxRetries: number = 3
): Promise<any> {
  // Format today's date
  const today = format(new Date(), 'yyyy-MM-dd');
  console.log(`Attempting to fetch leads for campaign ${campaignId} for date ${today}`);
  
  // Define different timezone formats to try with the /leads endpoint
  const timezoneFormats = [
    { format: null, description: "No timezone parameter (using campaign default)" },
    { format: requestedTimezone, description: `IANA timezone name (${requestedTimezone})` },
    { format: "UTC", description: "UTC timezone" },
    { format: "US/Mountain", description: "US/Mountain timezone" },
    { format: "-07:00", description: "UTC offset format" },
    { format: "MST", description: "Mountain Standard Time abbreviation" },
    // Additional formats to try
    { format: "America/Los_Angeles", description: "America/Los_Angeles timezone" },
    { format: "America/New_York", description: "America/New_York timezone" },
    { format: "GMT", description: "GMT timezone" },
    { format: "EST", description: "EST abbreviation" },
    { format: "CST", description: "CST abbreviation" },
    { format: "PST", description: "PST abbreviation" },
    { format: "EDT", description: "EDT abbreviation" },
    { format: "CDT", description: "CDT abbreviation" },
    { format: "PDT", description: "PDT abbreviation" },
  ];
  
  // Try each timezone format with /leads endpoint
  const leadsErrors = [];
  
  // Try all formats, not just the first few
  for (const { format, description } of timezoneFormats) {
    try {
      console.log(`Trying ${description} with /leads endpoint`);
      
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
        console.log(`Success using ${description} with /leads endpoint! Received ${data.data?.length || 0} leads`);
        return { ...data, endpoint: 'leads' };
      }
      
      // If not successful, capture the error
      const errorText = await response.text();
      const statusCode = response.status;
      console.error(`Failed with ${description} on /leads endpoint: ${statusCode} - ${errorText}`);
      leadsErrors.push({ format: description, error: errorText, status: statusCode });
      
      // If this isn't a timezone error, we should stop and report the actual error
      if (!errorText.includes("timezone") && 
          !errorText.toLowerCase().includes("cannot assign null") &&
          !errorText.includes("must be a valid zone")) {
        throw new Error(`API returned status ${statusCode}: ${errorText}`);
      }
      
      // Otherwise continue trying other formats
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('API returned status')) {
        throw error; // Re-throw non-timezone related errors
      }
      console.error(`Error with ${description} on /leads endpoint:`, error);
      leadsErrors.push({ format: description, error: error instanceof Error ? error.message : String(error) });
    }
  }

  // If /leads endpoint failed with all formats, try the /stats endpoint as fallback
  console.log("All /leads endpoint attempts failed. Trying /stats endpoint...");
  
  try {
    // Try different date formats for /stats endpoint
    const dateFormats = [
      { startDate: today, endDate: today, description: "Same day" },
      { 
        startDate: format(new Date(Date.now() - 86400000), 'yyyy-MM-dd'), // Yesterday
        endDate: today, 
        description: "Yesterday and today" 
      },
      {
        startDate: today,
        endDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'), // Tomorrow
        description: "Today and tomorrow"
      }
    ];
    
    // Try each date range
    for (const { startDate, endDate, description } of dateFormats) {
      // Build URL for /stats endpoint
      const statsUrl = `https://api.leadprosper.io/public/stats?campaign=${campaignId}&start_date=${startDate}&end_date=${endDate}`;
      
      console.log(`Trying /stats endpoint with date range ${description} (${startDate} to ${endDate})`);
      
      // Make the API call to stats endpoint
      const statsResponse = await fetch(statsUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        console.log(`Success with /stats endpoint using ${description}! Processing stats data instead.`);
        
        // Filter to only include today's stats
        const todayStats = statsData.data?.filter((item: any) => 
          item.date?.split('T')[0] === today
        ) || [];
        
        console.log(`Found ${todayStats.length} stats entries for today (${today})`);
        
        // Format stats data to match expected structure for leads processing
        return {
          success: true,
          data: [], // No leads data, but we'll record the stats
          stats: todayStats,
          endpoint: 'stats'
        };
      }
      
      // Log error but continue trying other date ranges
      const statsErrorText = await statsResponse.text();
      const statsStatusCode = statsResponse.status;
      console.error(`Failed with /stats endpoint using ${description}: ${statsStatusCode} - ${statsErrorText}`);
    }
    
    // If all stats attempts failed, report detailed error
    const errorDetails = JSON.stringify({
      leads_attempts: leadsErrors,
      date_formats_tried: dateFormats.map(df => df.description)
    }, null, 2);
    
    throw new Error(`Failed to fetch data using any endpoint, timezone format, or date range. Details: ${errorDetails}`);
    
  } catch (finalError) {
    console.error("All API attempts failed:", finalError);
    throw finalError;
  }
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

// Process stats data and update metrics
async function processStatsAndUpdateMetrics(
  supabaseClient: any,
  statsData: any[],
  campaignMapping: any
): Promise<void> {
  // If we have stats data but no leads, we'll just update the metrics for the day
  if (!statsData || statsData.length === 0) {
    console.log('No stats data available to process');
    return;
  }
  
  console.log(`Processing ${statsData.length} stats entries`);
  
  for (const stat of statsData) {
    // Make sure we have a valid date from the stats
    if (!stat.date) {
      console.warn('Stats entry missing date, skipping:', stat);
      continue;
    }
    
    // Parse the date from the stats entry
    const dateString = stat.date.split('T')[0]; // YYYY-MM-DD format
    
    // Calculate metrics from stats
    const leadCount = stat.leads || 0;
    const accepted = stat.accepted || 0;
    const duplicated = stat.duplicates || 0;
    const failed = (stat.rejected || 0) + (stat.failed || 0);
    const cost = stat.cost || 0;
    const revenue = stat.revenue || 0;
    
    console.log(`Updating metrics for date ${dateString}: leads=${leadCount}, accepted=${accepted}, duplicated=${duplicated}, failed=${failed}, cost=${cost}, revenue=${revenue}`);
    
    // Upsert into daily metrics
    await supabaseClient.rpc('upsert_daily_lead_metrics', {
      p_ts_campaign_id: campaignMapping.ts_campaign_id,
      p_date: dateString,
      p_lead_count: leadCount,
      p_accepted: accepted,
      p_duplicated: duplicated,
      p_failed: failed,
      p_cost: cost,
      p_revenue: revenue
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
    let requestedTimezone = 'UTC'; // Default changed to UTC for better compatibility
    
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
    let debugInfo = [];

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
        
        // Try to fetch leads using different timezone formats or fallback to stats
        const apiResponse = await fetchTodayLeadsWithTimezoneOptions(
          apiKey, 
          lpCampaignId, 
          requestedTimezone
        );
        
        const campaignDebugInfo = {
          campaign_id: lpCampaignId,
          endpoint_used: apiResponse.endpoint || 'unknown',
          leads_count: apiResponse.data?.length || 0,
          stats_count: apiResponse.stats?.length || 0
        };
        
        debugInfo.push(campaignDebugInfo);
        
        // Check if we got leads data
        if (apiResponse.data && apiResponse.data.length > 0) {
          // Process the leads
          await processLeadsAndUpdateMetrics(supabaseClient, apiResponse.data, {
            ts_campaign_id: mapping.ts_campaign_id
          });
          
          totalLeads += apiResponse.data.length;
          successCount++;
          
          results.push({
            mapping_id: mapping.id,
            campaign_id: lpCampaignId,
            ts_campaign_id: mapping.ts_campaign_id,
            campaign_name: mapping.lp_campaign.name,
            leads_count: apiResponse.data.length,
            endpoint_used: apiResponse.endpoint || 'leads',
            status: 'success'
          });
        } 
        // Check if we got stats data instead
        else if (apiResponse.stats && apiResponse.stats.length > 0) {
          // Process the stats data
          await processStatsAndUpdateMetrics(supabaseClient, apiResponse.stats, {
            ts_campaign_id: mapping.ts_campaign_id
          });
          
          // Add up the total leads from stats
          const statsLeadsCount = apiResponse.stats.reduce((total: number, stat: any) => {
            return total + (stat.leads || 0);
          }, 0);
          
          totalLeads += statsLeadsCount;
          successCount++;
          
          results.push({
            mapping_id: mapping.id,
            campaign_id: lpCampaignId,
            ts_campaign_id: mapping.ts_campaign_id,
            campaign_name: mapping.lp_campaign.name,
            stats_count: apiResponse.stats.length,
            leads_count: statsLeadsCount,
            endpoint_used: 'stats',
            status: 'success_stats_only'
          });
        }
        else {
          console.log(`No leads or stats found today for campaign ${lpCampaignId}`);
          results.push({
            mapping_id: mapping.id,
            campaign_id: lpCampaignId,
            ts_campaign_id: mapping.ts_campaign_id,
            campaign_name: mapping.lp_campaign.name,
            leads_count: 0,
            endpoint_used: apiResponse.endpoint || 'unknown',
            status: 'success_no_data'
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
        debug_info: debugInfo,
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
