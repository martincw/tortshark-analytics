
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
      .select('api_key')
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
    
    // Calculate yesterday's date in ISO format
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);
    
    const fromDate = yesterday.toISOString();
    const toDate = yesterdayEnd.toISOString();
    
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
    
    // Process each mapping
    let totalLeads = 0;
    const debugInfo = [];
    
    for (const mapping of mappings) {
      // We don't have actual campaign ID query from the documentation,
      // so we'll simulate fetching leads for each campaign
      // In a real implementation, you'd use campaign-specific endpoints
      
      const response = await fetch(`https://api.hyros.com/v1/api/v1.0/leads?fromDate=${fromDate}&toDate=${toDate}&pageSize=100`, {
        method: 'GET',
        headers: {
          'API-Key': apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 200) {
        const data = await response.json();
        const leads = data.result || [];
        
        // Process the leads for this campaign
        const campaignInfo = {
          campaign_id: mapping.hyros_campaign_id,
          endpoint_used: `leads?fromDate=${fromDate}&toDate=${toDate}`,
          leads_count: leads.length,
          stats_count: 0
        };
        
        if (leads.length > 0) {
          // In a real implementation, you would aggregate this data appropriately
          // For now, we'll just count the leads
          totalLeads += leads.length;
          
          // Store aggregated stats for this campaign
          const { data: insertData, error: insertError } = await supabase
            .from('hyros_stats_raw')
            .upsert({
              hyros_campaign_id: mapping.hyros_campaign_id,
              ts_campaign_id: mapping.ts_campaign_id,
              date: yesterday.toISOString().split('T')[0],
              leads: leads.length,
              json_payload: { leads_data: leads }
            }, { onConflict: 'hyros_campaign_id,date' })
            .select();
            
          if (insertError) {
            console.error("Error inserting leads:", insertError);
          } else {
            campaignInfo.stats_count = insertData?.length || 0;
          }
          
          // Update the TS daily lead metrics
          await supabase.rpc('upsert_hyros_daily_metrics', {
            p_ts_campaign_id: mapping.ts_campaign_id,
            p_date: yesterday.toISOString().split('T')[0],
            p_lead_count: leads.length,
            p_cost: 0, // We don't have cost information from the leads API
            p_revenue: 0 // We don't have revenue information from the leads API
          });
        }
        
        debugInfo.push(campaignInfo);
      } else {
        // Handle API error
        const errorData = await response.json();
        debugInfo.push({
          campaign_id: mapping.hyros_campaign_id,
          error: errorData.message || "API error",
          status: response.status
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
        campaigns_processed: mappings.length,
        total_leads: totalLeads,
        date_fetched: fromDate.split('T')[0],
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
