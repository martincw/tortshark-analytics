import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";
import { format, subDays } from "https://esm.sh/date-fns@2.30.0";

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

// Configuration for API requests
const API_CONFIG = {
  // Only try the most common timezone formats (reduced from 15+ to 3)
  TIMEZONE_FORMATS: [
    { format: null, description: "No timezone parameter (using campaign default)" },
    { format: "America/Denver", description: "America/Denver timezone (recommended)" },
    { format: "UTC", description: "UTC timezone (fallback)" }
  ],
  // Add delay between requests to avoid rate limiting
  REQUEST_DELAY_MS: 1000,
  // Maximum number of retries for rate-limited requests
  MAX_RETRIES: 3,
  // Starting delay for exponential backoff (in milliseconds)
  INITIAL_RETRY_DELAY_MS: 2000
};

// Cache successful timezone formats to reuse
const successfulTimezoneCache = new Map<number, string | null>();

// Sleep function for adding delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff implementation for retries
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = API_CONFIG.MAX_RETRIES,
  initialDelay: number = API_CONFIG.INITIAL_RETRY_DELAY_MS
): Promise<Response> {
  let retries = 0;
  let delay = initialDelay;
  
  while (true) {
    try {
      // IMPORTANT: Make sure we're using HTTPS URL
      if (!url.startsWith("https://")) {
        url = url.replace("http://", "https://");
      }
      
      // SUPER SIMPLIFIED REQUEST:
      // 1. Create a completely new options object with minimal properties
      // 2. Only keep the Authorization header, remove everything else
      const minimalOptions: RequestInit = {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${(options.headers as any)?.Authorization || ''}`
        }
      };
      
      console.log(`Attempting request to: ${url}`);
      console.log("Using minimal request options (no Content-Type header)");
      
      const response = await fetch(url, minimalOptions);
      
      // If we get a rate limit error, retry with backoff
      if (response.status === 429 && retries < maxRetries) {
        // Get retry-after header if available or use calculated delay
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay;
        
        console.log(`Rate limited (429). Retrying in ${waitTime}ms. Attempt ${retries + 1} of ${maxRetries}`);
        await sleep(waitTime);
        
        // Increase delay for next attempt with exponential backoff
        retries++;
        delay *= 2;
        
        // Continue to retry
        continue;
      }
      
      // Return the response for any other status
      return response;
    } catch (error) {
      if (retries < maxRetries) {
        console.log(`Network error. Retrying in ${delay}ms. Attempt ${retries + 1} of ${maxRetries}`);
        await sleep(delay);
        
        retries++;
        delay *= 2;
      } else {
        throw error; // Rethrow if we've exhausted retries
      }
    }
  }
}

// Try to fetch leads with simplified approach
async function fetchLeadsWithOptimizedTimezone(
  apiKey: string,
  campaignId: number,
  date: string
): Promise<any> {
  try {
    // Build the simplest possible URL
    let url = `https://api.leadprosper.io/public/leads?campaign=${campaignId}&start_date=${date}&end_date=${date}`;
    
    // Log attempt
    console.log(`Trying simplified approach for campaign ${campaignId}`);
    
    // Create the most minimal request possible
    const response = await fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
    });

    // Check if successful
    if (response.ok) {
      const data = await response.json();
      console.log(`Success using simplified approach! Received ${data.data?.length || 0} leads`);
      return { ...data, endpoint: 'leads' };
    }
    
    const statusCode = response.status;
    const errorText = await response.text();
    console.error(`Failed with simplified approach: ${statusCode} - ${errorText}`);
    
    // Try backup approach with stats endpoint
    console.log("Trying stats endpoint as backup...");
    const statsUrl = `https://api.leadprosper.io/public/stats?campaign=${campaignId}&start_date=${date}&end_date=${date}`;
    
    // Make the API call to stats endpoint with minimal options
    const statsResponse = await fetchWithRetry(statsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log(`Success with stats endpoint! Processing stats data instead.`);
      
      return {
        success: true,
        data: [], // No leads data, but we'll record the stats
        stats: statsData.data || [],
        endpoint: 'stats'
      };
    }
    
    // Log error but continue trying other campaigns
    const statsErrorText = await statsResponse.text();
    const statsStatusCode = statsResponse.status;
    console.error(`Failed with stats endpoint: ${statsStatusCode} - ${statsErrorText}`);
    
    // Format error details
    throw new Error(`All API attempts failed for campaign ${campaignId}. Status: ${statusCode}, Error: ${errorText}`);
  } catch (error) {
    console.error(`API error for campaign ${campaignId}:`, error);
    throw error;
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
    // Default to America/Denver as recommended by Lead Prosper support
    let requestedTimezone = 'America/Denver';
    
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
      console.log("Using simplified request approach with minimal parameters");
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
    
    // Change from today to yesterday
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    console.log(`Using yesterday's date for API calls: ${yesterday}`);

    // Process each campaign mapping SEQUENTIALLY (not in parallel)
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
        
        // Add delay between processing campaigns
        if (results.length > 0) {
          await sleep(API_CONFIG.REQUEST_DELAY_MS * 2);
        }
        
        // Try to fetch leads with extremely simplified approach
        const apiResponse = await fetchLeadsWithOptimizedTimezone(
          apiKey,
          lpCampaignId,
          yesterday
        );
        
        // Record debug info for each campaign
        const campaignDebugInfo = {
          campaign_id: lpCampaignId,
          endpoint_used: apiResponse.endpoint || 'unknown',
          leads_count: apiResponse.data?.length || 0,
          stats_count: apiResponse.stats?.length || 0
        };
        
        debugInfo.push(campaignDebugInfo);
        
        // Process leads if available
        if (apiResponse.data && apiResponse.data.length > 0) {
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
        // Process stats if we have them instead
        else if (apiResponse.stats && apiResponse.stats.length > 0) {
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
          console.log(`No leads or stats found for yesterday (${yesterday}) for campaign ${lpCampaignId}`);
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
        
        // More detailed error classification
        let errorStatus = 'error';
        let errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Check for common error types
        if (errorMessage.includes('429') || errorMessage.includes('Too Many Attempts')) {
          errorStatus = 'rate_limited';
          errorMessage = 'Rate limit exceeded. Try again later.';
        }
        
        results.push({
          mapping_id: mapping.id,
          campaign_id: lpCampaignId,
          ts_campaign_id: mapping.ts_campaign_id,
          campaign_name: mapping.lp_campaign?.name || 'Unknown',
          error: errorMessage,
          status: errorStatus
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
        date_fetched: yesterday,
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
