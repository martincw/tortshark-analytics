
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

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1); // Get yesterday's data too to avoid timezone issues
    
    const todayFormatted = today.toISOString().split('T')[0];
    const yesterdayFormatted = yesterday.toISOString().split('T')[0];

    console.log(`Fetching leads for date range: ${yesterdayFormatted} to ${todayFormatted}`);

    // Get the user ID from the request, or use null for system-wide sync
    let userId: string | null = null;
    try {
      const body = await req.json();
      userId = body.user_id || null;
    } catch (e) {
      // No body or invalid JSON, proceed with system-wide sync
    }

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
    let totalLeads = 0;
    let campaignsProcessed = 0;

    for (const mapping of mappings) {
      try {
        // Fetch the external campaign details to get the numeric ID
        const { data: externalCampaign } = await supabase
          .from('external_lp_campaigns')
          .select('lp_campaign_id')
          .eq('id', mapping.lp_campaign_id)
          .single();
        
        if (!externalCampaign) {
          console.warn(`No external campaign found for ID: ${mapping.lp_campaign_id}`);
          continue;
        }

        const lpCampaignId = externalCampaign.lp_campaign_id;
        const tsCampaignId = mapping.ts_campaign_id;

        console.log(`Processing campaign: LP ID ${lpCampaignId}, TS ID ${tsCampaignId}`);

        // Fetch leads from Lead Prosper API
        const apiUrl = `https://api.leadprosper.io/v1/campaigns/${lpCampaignId}/leads`;
        const params = new URLSearchParams({
          start_date: yesterdayFormatted,
          end_date: todayFormatted,
          limit: '1000',
        });

        const headers = {
          'Authorization': `Bearer ${credentials.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        const response = await fetch(`${apiUrl}?${params.toString()}`, {
          method: 'GET',
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Lead Prosper API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.leads || !Array.isArray(data.leads)) {
          console.warn(`No leads array in response for campaign ${lpCampaignId}`);
          results.push({
            campaign_id: lpCampaignId,
            ts_campaign_id: tsCampaignId,
            leads_count: 0,
            status: "no_leads_array"
          });
          continue;
        }

        console.log(`Retrieved ${data.leads.length} leads for campaign ${lpCampaignId}`);

        // Process the leads
        if (data.leads.length > 0) {
          const result = await processLeadsAndUpdateMetrics({
            leads: data.leads,
            campaign_id: lpCampaignId,
            ts_campaign_id: tsCampaignId
          });

          totalLeads += result.processed;
          
          results.push({
            campaign_id: lpCampaignId,
            ts_campaign_id: tsCampaignId,
            leads_processed: result.processed,
            leads_failed: result.errors,
            status: result.success ? "success" : "partial_failure"
          });
        } else {
          results.push({
            campaign_id: lpCampaignId,
            ts_campaign_id: tsCampaignId,
            leads_count: 0,
            status: "no_leads"
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
      date_fetched: todayFormatted,
      results
    };

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
        error: `Unexpected error: ${error.message}` 
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
}): Promise<{
  success: boolean;
  processed: number;
  errors: number;
}> {
  // The function implementation is the same as in lead-prosper-backfill
  // Rather than duplicating it, we'll reuse the logic
  
  try {
    if (!data.leads || !Array.isArray(data.leads) || data.leads.length === 0) {
      return { success: true, processed: 0, errors: 0 };
    }

    const { campaign_id: lpCampaignId, ts_campaign_id: tsCampaignId } = data;

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
