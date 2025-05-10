
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HYROS_BASE_URL = "https://api.hyros.com/v1/api/v1.0";

// Interface for HYROS lead data
interface HyrosLead {
  id: string;
  email: string;
  created_at: string;
  campaign_id?: string;
  campaignId?: string;
  campaign_name?: string;
  campaignName?: string;
  platform?: string;
  purchase_amount?: number;
  purchaseAmount?: number;
  is_purchase?: boolean;
  isPurchase?: boolean;
  is_sale?: boolean;
  isSale?: boolean;
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
    
    // Create a map for quick lookup of TS campaign IDs by HYROS campaign ID
    const campaignMapping: Record<string, string> = {};
    mappings.forEach(mapping => {
      campaignMapping[mapping.hyros_campaign_id] = mapping.ts_campaign_id;
    });

    // Fetch all leads for the date range in one call
    const fetchLeadsUrl = `${HYROS_BASE_URL}/leads?from=${fromDate}&to=${toDate}&size=500`;
    console.log(`Fetching all leads from: ${fetchLeadsUrl}`);
    
    // Fetch and aggregate all leads with pagination
    let allLeads: HyrosLead[] = [];
    let nextPage: number | string | null = 1;
    let pageCount = 0;
    let totalLeads = 0;
    const debugInfo: any[] = [];
    
    do {
      pageCount++;
      // Handle both numeric pages and string token pagination
      const pageParam = typeof nextPage === 'number' ? `page=${nextPage}` : `pageId=${nextPage}`;
      const pageUrl = `${HYROS_BASE_URL}/leads?from=${fromDate}&to=${toDate}&size=500&${pageParam}`;
      
      try {
        const response = await fetch(pageUrl, {
          method: 'GET',
          headers: {
            'API-Key': apiKey,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          const leads = data.data || [];
          allLeads = [...allLeads, ...leads];
          totalLeads += leads.length;
          
          // Determine next page based on pagination info
          nextPage = data.pagination?.next_page || null;
          
          debugInfo.push({
            page: pageCount,
            url: pageUrl.replace(apiKey, "API_KEY_HIDDEN"), // Hide the API key in logs
            leads_count: leads.length,
            has_next_page: !!nextPage
          });
          
          console.log(`Retrieved page ${pageCount} with ${leads.length} leads. Next page: ${nextPage ? nextPage : 'no'}`);
        } else {
          const errorText = await response.text();
          console.error(`Error fetching leads: ${response.status} ${errorText}`);
          
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
    } while (nextPage !== null && pageCount < 10); // Limit to 10 pages for safety
    
    // Group leads by campaign_id 
    const byCampaignId: Record<string, HyrosLead[]> = {};
    
    // Process all leads and group by campaign ID
    allLeads.forEach(lead => {
      // Handle different possible field naming for campaign ID
      const campaignId = lead.campaign_id || lead.campaignId;
      
      if (campaignId) {
        // Initialize the array for this campaign if it doesn't exist
        if (!byCampaignId[campaignId]) {
          byCampaignId[campaignId] = [];
        }
        
        // Add the lead to the campaign's array
        byCampaignId[campaignId].push(lead);
      }
    });
    
    // Process leads for each campaign mapping
    let processedCampaigns = 0;
    let totalProcessedLeads = 0;
    
    for (const mapping of mappings) {
      const campaignLeads = byCampaignId[mapping.hyros_campaign_id] || [];
      const leadCount = campaignLeads.length;
      let salesCount = 0;
      let revenueTotal = 0;
      
      // Calculate sales and revenue
      campaignLeads.forEach(lead => {
        // Check if this is a sale/conversion using flexible field naming
        const isPurchase = lead.is_purchase || lead.isPurchase || lead.is_sale || lead.isSale;
        if (isPurchase) {
          salesCount++;
          
          // Add revenue if available
          const revenue = parseFloat((lead.purchase_amount || lead.purchaseAmount || 0).toString());
          if (!isNaN(revenue) && revenue > 0) {
            revenueTotal += revenue;
          }
        }
      });
      
      // Store stats for this campaign
      const { error: insertError } = await supabase
        .from('hyros_stats_raw')
        .upsert({
          hyros_campaign_id: mapping.hyros_campaign_id,
          ts_campaign_id: mapping.ts_campaign_id,
          date: dateString,
          leads: leadCount,
          sales: salesCount,
          revenue: revenueTotal,
          json_payload: { 
            leads_count: leadCount,
            sales_count: salesCount,
            revenue: revenueTotal,
            leads_sample: campaignLeads.slice(0, 5) // Store only a sample of leads to avoid huge payloads
          }
        }, { onConflict: 'hyros_campaign_id,date' });
      
      if (insertError) {
        console.error(`Error inserting stats for campaign ${mapping.hyros_campaign_id}:`, insertError);
      } else {
        processedCampaigns++;
        totalProcessedLeads += leadCount;
        
        // Update the TS daily lead metrics
        await supabase.rpc('upsert_hyros_daily_metrics', {
          p_ts_campaign_id: mapping.ts_campaign_id,
          p_date: dateString,
          p_lead_count: leadCount,
          p_cost: 0, // We don't have cost information from HYROS
          p_revenue: revenueTotal // Use revenue from HYROS
        });
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
