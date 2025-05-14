
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Create a Supabase client with the service role key for database operations
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

interface BackfillRequest {
  apiKey: string;
  lpCampaignId: number;
  tsCampaignId: string;
  startDate: string;
  endDate: string;
}

interface LeadProsperLead {
  id: string;
  campaign_id: number;
  status: string;
  cost?: number;
  revenue?: number;
  created_at: number | string;
  [key: string]: any;
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

    // Parse request data
    const { apiKey, lpCampaignId, tsCampaignId, startDate, endDate } = await req.json() as BackfillRequest;

    // Validate request parameters
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: "API key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!lpCampaignId || !tsCampaignId) {
      return new Response(JSON.stringify({ success: false, error: "Campaign IDs are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (!startDate || !endDate) {
      return new Response(JSON.stringify({ success: false, error: "Date range is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Format dates for Lead Prosper API
    const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
    const formattedEndDate = new Date(endDate).toISOString().split('T')[0];

    console.log(`Backfilling leads for campaign ${lpCampaignId} from ${formattedStartDate} to ${formattedEndDate}`);

    // Call Lead Prosper API to get leads for the specified date range
    const apiUrl = `https://api.leadprosper.io/v1/campaigns/${lpCampaignId}/leads`;
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const params = new URLSearchParams({
      start_date: formattedStartDate,
      end_date: formattedEndDate,
      limit: '1000',  // Get maximum allowed per page
    });

    // Initialize response data
    let allLeads: LeadProsperLead[] = [];
    let hasMoreLeads = true;
    let page = 1;
    let totalLeads = 0;
    let processedLeads = 0;
    let failedLeads = 0;

    // Paginate through all leads
    while (hasMoreLeads) {
      try {
        params.set('page', page.toString());
        const response = await fetch(`${apiUrl}?${params.toString()}`, {
          method: 'GET',
          headers
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Lead Prosper API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        
        // Check if we have leads in the response
        if (!data.leads || !Array.isArray(data.leads) || data.leads.length === 0) {
          hasMoreLeads = false;
          break;
        }
        
        // Collect leads for processing
        allLeads = [...allLeads, ...data.leads];
        
        // Update pagination
        totalLeads += data.leads.length;
        page++;
        
        // Check if we've reached the last page
        if (data.meta && data.meta.current_page >= data.meta.last_page) {
          hasMoreLeads = false;
        }
        
        console.log(`Retrieved page ${page - 1} with ${data.leads.length} leads. Total so far: ${allLeads.length}`);
        
        // Process in batches to avoid memory issues
        if (allLeads.length >= 500) {
          const result = await processLeadsAndUpdateMetrics({
            leads: allLeads,
            campaign_id: lpCampaignId,
            ts_campaign_id: tsCampaignId
          });
          
          processedLeads += result.processed;
          failedLeads += result.errors;
          allLeads = []; // Clear processed leads
        }
      } catch (error) {
        console.error(`Error fetching leads page ${page}:`, error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Error fetching leads: ${error.message}`,
          processed_leads: processedLeads,
          failed_leads: failedLeads,
          total_leads: totalLeads
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      }
    }
    
    // Process any remaining leads
    if (allLeads.length > 0) {
      const result = await processLeadsAndUpdateMetrics({
        leads: allLeads,
        campaign_id: lpCampaignId,
        ts_campaign_id: tsCampaignId
      });
      
      processedLeads += result.processed;
      failedLeads += result.errors;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed_leads: processedLeads,
      failed_leads: failedLeads,
      total_leads: totalLeads,
      message: `Successfully processed ${processedLeads} leads for campaign ${lpCampaignId}`
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("Error in lead-prosper-backfill:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Unexpected error: ${error.message}` 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});

// Helper function to process leads and update metrics
async function processLeadsAndUpdateMetrics(data: {
  leads: LeadProsperLead[];
  campaign_id: number;
  ts_campaign_id: string;
}): Promise<{
  success: boolean;
  processed: number;
  errors: number;
}> {
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

    // Process each lead
    for (const lead of data.leads) {
      try {
        // Check if lead already exists
        const { data: existingLead, error: checkError } = await supabase
          .from('lp_leads_raw')
          .select('id')
          .eq('id', lead.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error checking existing lead:', checkError);
          errors++;
          continue;
        }

        if (existingLead) {
          console.log(`Lead ${lead.id} already exists, skipping`);
          continue;
        }

        // Convert created_at to appropriate format
        const leadDate = typeof lead.created_at === 'number' 
          ? new Date(lead.created_at) 
          : new Date(lead.created_at);
          
        // Insert new lead
        const { error: insertError } = await supabase.from('lp_leads_raw').insert({
          id: lead.id,
          lp_campaign_id: lpCampaignId,
          ts_campaign_id: tsCampaignId,
          status: lead.status || 'unknown',
          cost: lead.cost || 0,
          revenue: lead.revenue || 0,
          lead_date_ms: leadDate.getTime(),
          json_payload: lead
        });

        if (insertError) {
          console.error('Error inserting lead:', insertError);
          errors++;
          continue;
        }

        processed++;
        
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
        
        if (lead.status === 'sold') {
          metricsByDate[dateStr].accepted++;
        } else if (lead.status === 'duplicate') {
          metricsByDate[dateStr].duplicated++;
        } else if (['rejected', 'failed'].includes(lead.status || '')) {
          metricsByDate[dateStr].failed++;
        }
        
        metricsByDate[dateStr].cost += lead.cost || 0;
        metricsByDate[dateStr].revenue += lead.revenue || 0;
      } catch (err) {
        console.error('Error processing lead:', err);
        errors++;
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
