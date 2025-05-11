
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const HYROS_BASE_URL = "https://api.hyros.com/v1/api/v1.0";

Deno.serve(async (req) => {
  console.log("hyros-fetch-campaigns function called");
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get the user from the auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error("No authorization header provided");
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
      console.error("Error getting user from token:", userError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    
    // Get API key from the database
    const { data: hyrosToken, error: hyrosTokenError } = await supabase
      .from('hyros_tokens')
      .select('api_key')
      .eq('user_id', user.id)
      .single();
      
    if (hyrosTokenError || !hyrosToken) {
      console.error("Error getting HYROS API key:", hyrosTokenError);
      return new Response(
        JSON.stringify({ success: false, error: "HYROS API key not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const apiKey = hyrosToken.api_key;
    
    // Set up date range for the last 30 days
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 30);

    const isoFrom = from.toISOString().split('T')[0];
    const isoTo = to.toISOString().split('T')[0];

    // Fetch leads from HYROS API
    const leadsEndpoint = `${HYROS_BASE_URL}/leads?from=${isoFrom}&to=${isoTo}&pageSize=500`;
    console.log(`Fetching leads from HYROS API: ${leadsEndpoint}`);
    
    try {
      const response = await fetch(leadsEndpoint, {
        method: 'GET',
        headers: {
          'API-Key': apiKey,
          'Content-Type': 'application/json',
        }
      });
      
      // Log response status for debugging
      console.log(`HYROS API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error fetching leads: ${response.status} ${errorText.substring(0, 500)}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to fetch leads: ${response.status}`,
            details: errorText.substring(0, 200),
            endpoint: leadsEndpoint
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
        );
      }
      
      const data = await response.json();
      const leads = data?.result || [];
      console.log(`Fetched leads from HYROS API. Count: ${leads.length || 0}`);
      if (leads.length > 0) {
        console.log(`Lead sample: ${JSON.stringify(leads.slice(0, 1) || 'No leads')}`);
      }
      
      // Create debug info object
      const debugInfo = {
        endpoint: leadsEndpoint,
        dateRange: { from: isoFrom, to: isoTo },
        leadsFetched: leads.length,
        firstLead: leads.length > 0 ? leads[0] : null,
        hasData: leads.length > 0
      };
      
      // Process leads to extract campaigns and aggregate metrics
      const campaignsById: Record<string, any> = {};
      
      if (leads.length > 0) {
        // Extract unique campaigns from leads with metrics
        leads.forEach(lead => {
          const source = lead.firstSource || lead.lastSource;
          if (!source || !source.sourceLinkId) return;
          
          const id = source.sourceLinkId;
          const name = source.name || `Campaign ${id}`;
          const platform = source.adSource?.platform || 'unknown';
          const spend = parseFloat(source.spend ?? 0);
          
          if (!campaignsById[id]) {
            campaignsById[id] = {
              hyros_campaign_id: id,
              name,
              platform,
              status: 'active',
              updated_at: new Date().toISOString(),
              user_id: user.id,
              leads: 0,
              spend: 0
            };
          }
          
          campaignsById[id].leads += 1;
          campaignsById[id].spend += spend;
        });
      }
      
      const campaignList = Object.values(campaignsById);
      
      console.log(`Extracted ${campaignList.length} campaigns with metrics from leads`);
      debugInfo.campaignsExtracted = campaignList.length;
      debugInfo.firstCampaign = campaignList[0] || null;
      
      // Upsert campaigns to the hyros_campaigns table
      if (campaignList.length > 0) {
        const { error: upsertError } = await supabase
          .from('hyros_campaigns')
          .upsert(campaignList.map(c => ({
            hyros_campaign_id: c.hyros_campaign_id,
            name: c.name,
            platform: c.platform,
            status: c.status,
            updated_at: c.updated_at,
            user_id: c.user_id
          })), {
            onConflict: 'hyros_campaign_id, user_id',
            ignoreDuplicates: false
          });
          
        if (upsertError) {
          console.error("Error upserting campaigns:", upsertError);
          debugInfo.upsertError = upsertError.message;
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to save campaigns: ${upsertError.message}`,
              campaigns: campaignList,
              debugInfo: debugInfo
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
        }
      }
      
      // Save metrics per campaign to hyros_stats_raw table
      if (campaignList.length > 0) {
        const metricsRows = campaignList.map(c => ({
          user_id: user.id,
          hyros_campaign_id: c.hyros_campaign_id,
          leads: c.leads,
          spend: c.spend,
          date: isoTo
        }));
        
        const { error: statsError } = await supabase
          .from('hyros_stats_raw')
          .upsert(metricsRows, {
            onConflict: 'user_id, hyros_campaign_id, date'
          });
          
        if (statsError) {
          console.error("Error upserting campaign stats:", statsError);
          debugInfo.statsError = statsError.message;
        }
      }
      
      // Update the last_synced timestamp in the HYROS token record
      const { error: updateError } = await supabase
        .from('hyros_tokens')
        .update({ 
          last_synced: new Date().toISOString() 
        })
        .eq('user_id', user.id);
        
      if (updateError) {
        console.error("Error updating last_synced timestamp:", updateError);
        debugInfo.lastSyncedUpdateError = updateError.message;
      }
      
      // Fetch the updated campaigns from the database to return to the client
      const { data: updatedCampaigns, error: fetchError } = await supabase
        .from('hyros_campaigns')
        .select('*')
        .eq('user_id', user.id);
        
      if (fetchError) {
        console.error("Error fetching updated campaigns:", fetchError);
        debugInfo.fetchUpdatedCampaignsError = fetchError.message;
        
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Failed to fetch updated campaigns", 
            debugInfo: debugInfo 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Include debug info in the successful response
      return new Response(
        JSON.stringify({ 
          success: true, 
          campaigns: updatedCampaigns,
          importCount: campaignList.length,
          endpoint: leadsEndpoint,
          debugInfo: debugInfo
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (fetchError) {
      console.error(`Error fetching from HYROS API:`, fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error connecting to HYROS API: ${fetchError.message}`,
          endpoint: leadsEndpoint,
          debugInfo: {
            error: fetchError.message,
            stack: fetchError.stack,
            endpoint: leadsEndpoint,
            dateRange: { from: isoFrom, to: isoTo }
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

  } catch (error) {
    console.error("Error in hyros-fetch-campaigns function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error occurred",
        stack: error.stack,
        debugInfo: {
          errorMessage: error.message,
          errorStack: error.stack
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
