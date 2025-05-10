
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Interface for HYROS lead data
interface HyrosLead {
  id: string;
  email: string;
  creationDate: string;
  campaign?: string;
  campaignId?: string;
  source?: string;
  revenue?: number;
  sale?: boolean;
  tags?: string[];
  [key: string]: any; // Allow for additional properties
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get the user from the auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    // Get the API key from the database
    const { data: tokenData, error: tokenError } = await supabase
      .from('hyros_tokens')
      .select('api_key, account_id')
      .eq('user_id', user.id)
      .single();
      
    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "HYROS API key not found. Please connect your HYROS account first." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const apiKey = tokenData.api_key;
    
    // Calculate yesterday's date in ISO format for the date range
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    const fromDate = yesterday.toISOString();
    const toDate = yesterdayEnd.toISOString();
    const dateString = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get active campaign mappings
    const { data: mappings, error: mappingsError } = await supabase
      .from('hyros_to_ts_map')
      .select(`
        id,
        hyros_campaign_id,
        ts_campaign_id,
        active
      `)
      .eq('active', true);
      
    if (mappingsError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch campaign mappings" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // If no mappings, return early
    if (mappings.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          campaigns_processed: 0,
          total_leads: 0,
          date_fetched: fromDate.split('T')[0],
          message: "No active campaign mappings found" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Fetch all leads for the date range in one call
    const leadsApiUrl = `https://api.hyros.com/api/v1.0/leads?fromDate=${fromDate}&toDate=${toDate}&pageSize=100`;
    console.log(`Fetching all leads from: ${leadsApiUrl}`);
    
    // Fetch and aggregate all leads with pagination
    let allLeads: HyrosLead[] = [];
    let nextPageId: string | undefined = undefined;
    let pageCount = 0;
    let totalLeads = 0;
    const debugInfo: any[] = [];
    
    do {
      pageCount++;
      const pageUrl = nextPageId ? 
        `${leadsApiUrl}&pageId=${encodeURIComponent(nextPageId)}` : 
        leadsApiUrl;
      
      try {
        const response = await fetch(pageUrl, {
          method: 'GET',
          headers: {
            'API-Key': apiKey,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.status === 200) {
          const data = await response.json();
          const leads = data.result || [];
          allLeads = [...allLeads, ...leads];
          nextPageId = data.nextPageId;
          totalLeads += leads.length;
          
          debugInfo.push({
            page: pageCount,
            url: pageUrl.replace(apiKey, "API_KEY_HIDDEN"), // Hide the API key in logs
            leads_count: leads.length,
            has_next_page: !!nextPageId
          });
          
          console.log(`Retrieved page ${pageCount} with ${leads.length} leads. Next page: ${nextPageId ? 'yes' : 'no'}`);
        } else {
          const errorText = await response.text();
          console.error(`Error fetching leads: ${response.status}`, errorText);
          
          debugInfo.push({
            page: pageCount,
            url: pageUrl.replace(apiKey, "API_KEY_HIDDEN"), // Hide the API key in logs
            error: `HTTP ${response.status}`,
            error_details: errorText.substring(0, 500),
          });
          
          // Break the loop on error
          break;
        }
      } catch (error) {
        console.error(`Exception fetching leads page ${pageCount}:`, error);
        debugInfo.push({
          page: pageCount,
          url: pageUrl.replace(apiKey, "API_KEY_HIDDEN"),
          exception: error.message,
        });
        break;
      }
    } while (nextPageId && pageCount < 10); // Limit to 10 pages for safety
    
    // Process leads by campaign
    const campaignStats: Record<string, { 
      leads: number, 
      sales: number, 
      revenue: number,
      leads_data: any[]
    }> = {};
    
    // Initialize stats for each campaign mapping
    for (const mapping of mappings) {
      campaignStats[mapping.hyros_campaign_id] = { 
        leads: 0, 
        sales: 0, 
        revenue: 0,
        leads_data: []
      };
    }
    
    // Process each lead and attribute to campaigns
    for (const lead of allLeads) {
      // Extract campaign ID from lead data
      // Note: we need to check various possible field names since the exact structure may vary
      const leadCampaignId = lead.campaignId || lead.campaign_id || 
                            (lead.campaign && typeof lead.campaign === 'string' ? lead.campaign : null) ||
                            (lead.source && typeof lead.source === 'string' ? lead.source : null);
      
      if (leadCampaignId && campaignStats[leadCampaignId]) {
        // Increment lead count
        campaignStats[leadCampaignId].leads++;
        
        // Add lead to the campaign's leads data
        campaignStats[leadCampaignId].leads_data.push(lead);
        
        // Check if this is a sale/conversion with revenue
        if (lead.sale || lead.converted || lead.isConversion) {
          campaignStats[leadCampaignId].sales++;
          
          // Add revenue if available
          const revenue = parseFloat(lead.revenue) || 0;
          if (!isNaN(revenue) && revenue > 0) {
            campaignStats[leadCampaignId].revenue += revenue;
          }
        }
      }
    }
    
    // Store aggregated stats for each campaign
    let processedCampaigns = 0;
    let totalProcessedLeads = 0;
    
    for (const mapping of mappings) {
      const stats = campaignStats[mapping.hyros_campaign_id];
      
      if (stats) {
        // Store raw stats
        const { error: insertError } = await supabase
          .from('hyros_stats_raw')
          .upsert({
            hyros_campaign_id: mapping.hyros_campaign_id,
            ts_campaign_id: mapping.ts_campaign_id,
            date: dateString,
            leads: stats.leads,
            sales: stats.sales,
            revenue: stats.revenue,
            json_payload: { 
              leads_count: stats.leads,
              sales_count: stats.sales,
              revenue: stats.revenue,
              leads_sample: stats.leads_data.slice(0, 5) // Store only a sample of leads to avoid huge payloads
            }
          }, { onConflict: 'hyros_campaign_id,date' });
        
        if (insertError) {
          console.error(`Error inserting stats for campaign ${mapping.hyros_campaign_id}:`, insertError);
        } else {
          processedCampaigns++;
          totalProcessedLeads += stats.leads;
          
          // Update the TS daily lead metrics
          await supabase.rpc('upsert_hyros_daily_metrics', {
            p_ts_campaign_id: mapping.ts_campaign_id,
            p_date: dateString,
            p_lead_count: stats.leads,
            p_cost: 0, // We don't have cost information from HYROS
            p_revenue: stats.revenue // Use revenue from HYROS if available
          });
        }
      }
    }
    
    // Update last synced timestamp
    await supabase
      .from('hyros_tokens')
      .update({ last_synced: new Date().toISOString() })
      .eq('user_id', user.id);
    
    // Return the results
    return new Response(
      JSON.stringify({ 
        success: true,
        campaigns_processed: processedCampaigns,
        total_leads: totalProcessedLeads,
        date_fetched: dateString,
        last_synced: new Date().toISOString(),
        debug_info: debugInfo
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in hyros-sync function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
