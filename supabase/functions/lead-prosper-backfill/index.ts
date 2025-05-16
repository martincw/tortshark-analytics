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
    let rateLimited = false;
    let maxRetries = 3;

    // Paginate through all leads
    while (hasMoreLeads && !rateLimited) {
      try {
        params.set('page', page.toString());
        
        // Implement retry logic with exponential backoff for rate limiting
        let retries = 0;
        let success = false;
        let response;
        let backoffTime = 1000; // Start with 1 second
        
        while (!success && retries < maxRetries) {
          response = await fetch(`${apiUrl}?${params.toString()}`, {
            method: 'GET',
            headers
          });
          
          if (response.status === 429) {
            // Rate limited - implement backoff
            retries++;
            const retryAfter = response.headers.get('Retry-After');
            const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoffTime;
            
            console.log(`Rate limited, waiting ${waitTime}ms before retry ${retries}/${maxRetries}`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            
            // Exponential backoff
            backoffTime *= 2;
          } else {
            success = true;
          }
          
          if (retries >= maxRetries && response?.status === 429) {
            rateLimited = true;
            throw new Error(`Rate limit exceeded after ${maxRetries} retries`);
          }
        }

        if (!response || !response.ok) {
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
          
          // Add a small delay between batches to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Error fetching leads page ${page}:`, error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Error fetching leads: ${error.message}`,
          processed_leads: processedLeads,
          failed_leads: failedLeads,
          total_leads: totalLeads,
          rate_limited: rateLimited
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
      rate_limited: rateLimited,
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
  processed_leads: number; // Added to match interface
  errors: number;
  message?: string;
}> {
  try {
    if (!data.leads || !Array.isArray(data.leads) || data.leads.length === 0) {
      return { success: true, processed: 0, processed_leads: 0, errors: 0 };
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
          
        // Check if lead already exists - optimized to reduce DB calls
        const dateStr = leadDate.toISOString().split('T')[0]; // YYYY-MM-DD
        
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
      processed_leads: processed, // Added to match interface
      errors
    };
  } catch (error) {
    console.error('Error in processLeadsAndUpdateMetrics:', error);
    return {
      success: false,
      processed: 0,
      processed_leads: 0, // Added to match interface
      errors: data.leads?.length || 0
    };
  }
}
