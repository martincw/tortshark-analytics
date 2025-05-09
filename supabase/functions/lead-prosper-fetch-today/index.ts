
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
      
      // Remove Content-Type header as requested by Lead Prosper support
      if (options.headers) {
        const headers = new Headers(options.headers);
        headers.delete('Content-Type');
        options.headers = headers;
      }
      
      const response = await fetch(url, options);
      
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

// Try to fetch leads with optimized timezone handling
async function fetchLeadsWithOptimizedTimezone(
  apiKey: string,
  campaignId: number,
  date: string
): Promise<any> {
  // First check if we have a successful format cached for this campaign
  const cachedFormat = successfulTimezoneCache.get(campaignId);
  
  if (cachedFormat !== undefined) {
    console.log(`Using cached timezone format for campaign ${campaignId}: ${cachedFormat || "default"}`);
    
    // Build URL - only include timezone if format is provided
    let url = `https://api.leadprosper.io/public/leads?campaign=${campaignId}&start_date=${date}&end_date=${date}`;
    if (cachedFormat !== null) {
      url += `&timezone=${encodeURIComponent(cachedFormat)}`;
    }
    
    // Make the API call with retry logic - NO Content-Type header
    const response = await fetchWithRetry(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
    });

    // Check if successful
    if (response.ok) {
      const data = await response.json();
      console.log(`Success using cached format for campaign ${campaignId}! Received ${data.data?.length || 0} leads`);
      return { ...data, endpoint: 'leads' };
    }
    
    // If cached format failed, clear it and try other formats
    console.warn(`Cached timezone format failed for campaign ${campaignId}. Clearing cache and trying other formats.`);
    successfulTimezoneCache.delete(campaignId);
  }
  
  // Try each of our reduced set of timezone formats
  const leadsErrors = [];
  
  for (const { format, description } of API_CONFIG.TIMEZONE_FORMATS) {
    try {
      console.log(`Trying ${description} with /leads endpoint for campaign ${campaignId}`);
      
      // Build URL - only include timezone if format is provided
      let url = `https://api.leadprosper.io/public/leads?campaign=${campaignId}&start_date=${date}&end_date=${date}`;
      if (format !== null) {
        url += `&timezone=${encodeURIComponent(format)}`;
      }
      
      // Add delay between requests to avoid rate limiting
      await sleep(API_CONFIG.REQUEST_DELAY_MS);
      
      // Make the API call with retry logic - NO Content-Type header
      const response = await fetchWithRetry(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
      });

      // Check if successful
      if (response.ok) {
        const data = await response.json();
        console.log(`Success using ${description} with /leads endpoint! Received ${data.data?.length || 0} leads`);
        
        // Cache the successful format for future requests
        successfulTimezoneCache.set(campaignId, format);
        
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
  console.log("All /leads endpoint attempts failed for campaign ${campaignId}. Trying /stats endpoint...");
  
  try {
    // Add delay before trying stats endpoint
    await sleep(API_CONFIG.REQUEST_DELAY_MS);
    
    // Build URL for /stats endpoint - using only today's date to reduce complexity
    const statsUrl = `https://api.leadprosper.io/public/stats?campaign=${campaignId}&start_date=${date}&end_date=${date}`;
    
    console.log(`Trying /stats endpoint for campaign ${campaignId} with date ${date}`);
    
    // Make the API call to stats endpoint with retry logic - NO Content-Type header
    const statsResponse = await fetchWithRetry(statsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
    });

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      console.log(`Success with /stats endpoint for campaign ${campaignId}! Processing stats data instead.`);
      
      // Format stats data to match expected structure for leads processing
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
    console.error(`Failed with /stats endpoint for campaign ${campaignId}: ${statsStatusCode} - ${statsErrorText}`);
    
    // Format error details
    const errorDetails = JSON.stringify({
      campaign_id: campaignId,
      leads_attempts: leadsErrors,
      stats_attempt: { status: statsStatusCode, error: statsErrorText }
    }, null, 2);
    
    throw new Error(`Failed to fetch data using any endpoint for campaign ${campaignId}. Details: ${errorDetails}`);
  } catch (error) {
    console.error(`All API attempts failed for campaign ${campaignId}:`, error);
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
        
        // If user requested a specific timezone, add it to our formats to try
        if (!API_CONFIG.TIMEZONE_FORMATS.some(tf => tf.format === requestedTimezone)) {
          API_CONFIG.TIMEZONE_FORMATS.unshift({ 
            format: requestedTimezone, 
            description: `User requested timezone (${requestedTimezone})` 
          });
        }
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
        
        // Try to fetch leads with optimized timezone handling - use yesterday instead of today
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
