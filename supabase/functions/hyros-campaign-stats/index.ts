
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  console.log("hyros-campaign-stats function called");
  
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
    
    // Query hyros_stats_raw joined with hyros_campaigns to get stats
    const { data, error } = await supabase
      .from('hyros_stats_raw')
      .select(`
        hyros_campaign_id,
        date,
        leads,
        ad_spend,
        hyros_campaigns (
          name,
          platform
        )
      `)
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Error fetching campaign stats:", error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // Aggregate stats by campaign
    const campaignMap: Record<string, {
      name: string
      platform: string
      totalLeads: number
      totalSpend: number
      lastDate: string
    }> = {};
    
    for (const row of data) {
      const id = row.hyros_campaign_id;
      if (!campaignMap[id]) {
        campaignMap[id] = {
          name: row.hyros_campaigns?.name ?? `Campaign ${id}`,
          platform: row.hyros_campaigns?.platform ?? 'unknown',
          totalLeads: 0,
          totalSpend: 0,
          lastDate: row.date
        };
      }
      
      campaignMap[id].totalLeads += row.leads;
      campaignMap[id].totalSpend += row.ad_spend; // FIXED: Changed from 'spend' to 'ad_spend'
      
      if (row.date > campaignMap[id].lastDate) {
        campaignMap[id].lastDate = row.date;
      }
    }
    
    // Format results
    const results = Object.entries(campaignMap).map(([id, stats]) => ({
      hyros_campaign_id: id,
      name: stats.name,
      platform: stats.platform,
      leads: stats.totalLeads,
      spend: stats.totalSpend,
      last_activity: stats.lastDate
    }));
    
    console.log(`Returning stats for ${results.length} campaigns`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        campaigns: results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in hyros-campaign-stats function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Unknown error occurred"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
