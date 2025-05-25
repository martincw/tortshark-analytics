
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Create a Supabase client with the service role key for database operations
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface LeadProsperCredentials {
  apiKey: string;
  id?: string;
}

interface LeadProsperSyncResult {
  success: boolean;
  total_leads: number;
  campaigns_processed: number;
  last_synced?: string;
  date_fetched?: string;
  results?: any[];
  error?: string;
  debug_info?: any[];
}

serve(async (req: Request) => {
  try {
    // Handle CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    // Get date range from request body, defaulting to today and yesterday
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let startDate = yesterday;
    let endDate = today;
    let userId: string | null = null;
    
    try {
      const body = await req.json();
      userId = body.user_id || null;
      
      // Allow custom date range from request
      if (body.start_date) {
        startDate = new Date(body.start_date);
      }
      if (body.end_date) {
        endDate = new Date(body.end_date);
      }
    } catch (e) {
      // No body or invalid JSON, proceed with defaults
    }
    
    const startDateFormatted = startDate.toISOString().split('T')[0];
    const endDateFormatted = endDate.toISOString().split('T')[0];

    console.log(`Fetching leads for date range: ${startDateFormatted} to ${endDateFormatted}`);

    // Get Lead Prosper API credentials
    const credentials = await getLeadProsperCredentials(userId);
    if (!credentials || !credentials.apiKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No Lead Prosper API credentials found" 
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        }
      );
    }

    // Get active campaign mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('lp_to_ts_map')
      .select(`
        id,
        lp_campaign_id,
        ts_campaign_id,
        active,
        linked_at
      `)
      .eq('active', true);

    if (mappingsError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to get campaign mappings: ${mappingsError.message}` 
        }),
        {
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        }
      );
    }

    if (!mappings || mappings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "No active Lead Prosper campaign mappings found" 
        }),
        {
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          },
        }
      );
    }

    console.log(`Found ${mappings.length} active campaign mappings`);

    // Process each campaign
    const results = [];
    const debugInfo = [];
    let totalLeads = 0;
    let campaignsProcessed = 0;

    for (const mapping of mappings) {
      try {
        // Fetch the external campaign details to get the numeric ID
        const { data: externalCampaign } = await supabase
          .from('external_lp_campaigns')
          .select('lp_campaign_id, name')
          .eq('id', mapping.lp_campaign_id)
          .single();
        
        if (!externalCampaign) {
          console.warn(`No external campaign found for ID: ${mapping.lp_campaign_id}`);
          debugInfo.push({
            mapping_id: mapping.id,
            issue: 'external_campaign_not_found',
            lp_campaign_id: mapping.lp_campaign_id
          });
          continue;
        }

        const lpCampaignId = externalCampaign.lp_campaign_id;
        const tsCampaignId = mapping.ts_campaign_id;
        const campaignName = externalCampaign.name;

        console.log(`Processing campaign: LP ID ${lpCampaignId} ("${campaignName}"), TS ID ${tsCampaignId}`);

        // Fetch leads from Lead Prosper API
        const apiUrl = `https://api.leadprosper.io/v1/campaigns/${lpCampaignId}/leads`;
        const params = new URLSearchParams({
          start_date: startDateFormatted,
          end_date: endDateFormatted,
          limit: '1000',
        });

        const headers = {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        console.log(`Calling Lead Prosper API: ${apiUrl}?${params.toString()}`);

        const response = await fetch(`${apiUrl}?${params.toString()}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Lead Prosper API error for campaign ${lpCampaignId}: ${response.status} ${response.statusText} - ${errorText}`);
          
          debugInfo.push({
            campaign_id: lpCampaignId,
            campaign_name: campaignName,
            ts_campaign_id: tsCampaignId,
            api_error: `${response.status}: ${errorText}`,
            api_url: `${apiUrl}?${params.toString()}`
          });
          
          results.push({
            campaign_id: lpCampaignId,
            campaign_name: campaignName,
            ts_campaign_id: tsCampaignId,
            leads_count: 0,
            status: "api_error",
            error: `${response.status}: ${errorText}`
          });
          continue;
        }

        const data = await response.json();
        
        console.log(`API Response for campaign ${lpCampaignId}:`, {
          has_leads: !!data.leads,
          leads_count: data.leads?.length || 0,
          response_keys: Object.keys(data)
        });
        
        if (!data.leads || !Array.isArray(data.leads)) {
          console.warn(`No leads array in response for campaign ${lpCampaignId}`);
          debugInfo.push({
            campaign_id: lpCampaignId,
            campaign_name: campaignName,
            ts_campaign_id: tsCampaignId,
            issue: 'no_leads_array_in_response',
            response_structure: Object.keys(data)
          });
          
          results.push({
            campaign_id: lpCampaignId,
            campaign_name: campaignName,
            ts_campaign_id: tsCampaignId,
            leads_count: 0,
            status: "no_leads_array"
          });
          continue;
        }

        console.log(`Retrieved ${data.leads.length} leads for campaign ${lpCampaignId} ("${campaignName}")`);

        // Process the leads
        if (data.leads.length > 0) {
          const result = await processLeadsAndUpdateMetrics({
            leads: data.leads,
            campaign_id: lpCampaignId,
            ts_campaign_id: tsCampaignId,
            campaign_name: campaignName
          });

          totalLeads += result.processed;
          
          results.push({
            campaign_id: lpCampaignId,
            campaign_name: campaignName,
            ts_campaign_id: tsCampaignId,
            leads_processed: result.processed,
            leads_failed: result.errors,
            status: result.success ? "success" : "partial_failure"
          });
          
          debugInfo.push({
            campaign_id: lpCampaignId,
            campaign_name: campaignName,
            ts_campaign_id: tsCampaignId,
            leads_fetched: data.leads.length,
            leads_processed: result.processed,
            leads_failed: result.errors
          });
        } else {
          console.log(`No leads found for campaign ${lpCampaignId} ("${campaignName}") in date range ${startDateFormatted} to ${endDateFormatted}`);
          
          results.push({
            campaign_id: lpCampaignId,
            campaign_name: campaignName,
            ts_campaign_id: tsCampaignId,
            leads_count: 0,
            status: "no_leads_in_date_range"
          });
          
          debugInfo.push({
            campaign_id: lpCampaignId,
            campaign_name: campaignName,
            ts_campaign_id: tsCampaignId,
            issue: 'no_leads_in_date_range',
            date_range: `${startDateFormatted} to ${endDateFormatted}`
          });
        }

        campaignsProcessed++;

        // Add a short delay between campaigns to avoid rate limiting
        if (mappings.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`Error processing campaign ${mapping.lp_campaign_id}:`, error);
        results.push({
          campaign_id: mapping.lp_campaign_id,
          ts_campaign_id: mapping.ts_campaign_id,
          status: "error",
          error: error.message
        });
        
        debugInfo.push({
          campaign_id: mapping.lp_campaign_id,
          ts_campaign_id: mapping.ts_campaign_id,
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Update the last_synced timestamp in account_connections
    if (credentials.id && campaignsProcessed > 0) {
      const { error: updateError } = await supabase
        .from('account_connections')
        .update({ last_synced: new Date().toISOString() })
        .eq('id', credentials.id);

      if (updateError) {
        console.error('Error updating last_synced timestamp:', updateError);
      }
    }

    // Return the results
    const syncResult: LeadProsperSyncResult = {
      success: true,
      total_leads: totalLeads,
      campaigns_processed: campaignsProcessed,
      last_synced: new Date().toISOString(),
      date_fetched: `${startDateFormatted} to ${endDateFormatted}`,
      results,
      debug_info: debugInfo
    };

    console.log('Final sync result:', syncResult);

    return new Response(
      JSON.stringify(syncResult),
      {
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      }
    );
  } catch (error) {
    console.error("Error in lead-prosper-fetch-today:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${error.message}`,
        debug_info: [{ error: error.message, stack: error.stack }]
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
      }
    );
  }
});

// Helper function to get Lead Prosper API credentials
async function getLeadProsperCredentials(userId: string | null): Promise<LeadProsperCredentials | null> {
  try {
    let query = supabase
      .from('account_connections')
      .select('id, credentials')
      .eq('platform', 'leadprosper')
      .eq('is_connected', true);
      
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    query = query.order('created_at', { ascending: false }).limit(1);
    
    const { data, error } = await query;
    
    if (error || !data || data.length === 0) {
      console.error("Error or no credentials found:", error);
      return null;
    }
    
    const connection = data[0];
    let credentials = connection.credentials;
    
    // Parse credentials if it's a string
    if (typeof credentials === 'string') {
      try {
        credentials = JSON.parse(credentials);
      } catch (e) {
        console.error("Failed to parse credentials:", e);
        return null;
      }
    }
    
    // Check if we have an API key
    if (!credentials || !credentials.apiKey) {
      console.error("No API key found in credentials");
      return null;
    }
    
    return {
      apiKey: credentials.apiKey,
      id: connection.id
    };
  } catch (error) {
    console.error("Error getting Lead Prosper credentials:", error);
    return null;
  }
}

// Helper function to process leads and update metrics
async function processLeadsAndUpdateMetrics(data: {
  leads: any[];
  campaign_id: number;
  ts_campaign_id: string;
  campaign_name: string;
}): Promise<{
  success: boolean;
  processed: number;
  errors: number;
}> {
  try {
    if (!data.leads || !Array.isArray(data.leads) || data.leads.length === 0) {
      return { success: true, processed: 0, errors: 0 };
    }

    const { campaign_id: lpCampaignId, ts_campaign_id: tsCampaignId, campaign_name } = data;

    if (!lpCampaignId || !tsCampaignId) {
      throw new Error('Missing campaign IDs for lead processing');
    }

    let processed = 0;
    let errors = 0;
    
    // Group leads by date for metrics aggregation
    const metricsByDate: Record<string, {
      leads: number;
      accepted: number;
      duplicated: number; 
      failed: number;
      cost: number;
      revenue: number;
    }> = {};
    
    // Prepare batch insert array
    const leadsToInsert = [];

    // Process each lead
    for (const lead of data.leads) {
      try {
        // Convert created_at to appropriate format
        const leadDate = typeof lead.created_at === 'number' 
          ? new Date(lead.created_at) 
          : new Date(lead.created_at);
          
        // Add to batch insert array
        leadsToInsert.push({
          id: lead.id,
          lp_campaign_id: lpCampaignId,
          ts_campaign_id: tsCampaignId,
          status: lead.status || 'unknown',
          cost: lead.cost || 0,
          revenue: lead.revenue || 0,
          lead_date_ms: leadDate.getTime(),
          json_payload: lead
        });
        
        // Aggregate metrics by date
        const dateStr = leadDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (!metricsByDate[dateStr]) {
          metricsByDate[dateStr] = {
            leads: 0,
            accepted: 0,
            duplicated: 0,
            failed: 0,
            cost: 0,
            revenue: 0
          };
        }
        
        metricsByDate[dateStr].leads++;
        
        if (lead.status?.toLowerCase() === 'sold') {
          metricsByDate[dateStr].accepted++;
        } else if (lead.status?.toLowerCase() === 'duplicate') {
          metricsByDate[dateStr].duplicated++;
        } else if (['rejected', 'failed'].includes(lead.status?.toLowerCase() || '')) {
          metricsByDate[dateStr].failed++;
        }
        
        metricsByDate[dateStr].cost += lead.cost || 0;
        metricsByDate[dateStr].revenue += lead.revenue || 0;
        
        processed++;
      } catch (err) {
        console.error('Error processing lead:', err);
        errors++;
      }
    }
    
    // Batch insert leads if we have any
    if (leadsToInsert.length > 0) {
      try {
        console.log(`Batch inserting ${leadsToInsert.length} leads for campaign ${campaign_name} (${lpCampaignId})`);
        
        // Use upsert with onConflict to handle duplicates
        const { error: insertError } = await supabase
          .from('lp_leads_raw')
          .upsert(leadsToInsert, { 
            onConflict: 'id',
            ignoreDuplicates: true
          });
          
        if (insertError) {
          console.error('Error batch inserting leads:', insertError);
          errors += leadsToInsert.length;
          processed = 0; // Reset processed count since batch failed
        } else {
          console.log(`Successfully inserted ${leadsToInsert.length} leads for campaign ${campaign_name}`);
        }
      } catch (batchError) {
        console.error('Exception during batch insert:', batchError);
        errors += leadsToInsert.length;
        processed = 0;
      }
    }
    
    // Update metrics for each date
    for (const [dateStr, metrics] of Object.entries(metricsByDate)) {
      try {
        console.log(`Updating metrics for ${campaign_name} on ${dateStr}: ${metrics.leads} leads`);
        
        const { error: metricsError } = await supabase.rpc('upsert_daily_lead_metrics', {
          p_ts_campaign_id: tsCampaignId,
          p_date: dateStr,
          p_lead_count: metrics.leads,
          p_accepted: metrics.accepted,
          p_duplicated: metrics.duplicated,
          p_failed: metrics.failed,
          p_cost: metrics.cost,
          p_revenue: metrics.revenue
        });
        
        if (metricsError) {
          console.error(`Error updating metrics for ${dateStr}:`, metricsError);
        } else {
          console.log(`Successfully updated metrics for ${campaign_name} on ${dateStr}`);
        }
      } catch (error) {
        console.error(`Error calling upsert_daily_lead_metrics for ${dateStr}:`, error);
      }
    }

    return {
      success: errors === 0,
      processed,
      errors
    };
  } catch (error) {
    console.error('Error in processLeadsAndUpdateMetrics:', error);
    return {
      success: false,
      processed: 0,
      errors: data.leads?.length || 0
    };
  }
}
