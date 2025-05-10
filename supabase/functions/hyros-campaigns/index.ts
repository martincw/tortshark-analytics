
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
    
    // Parse request body to check for forceSync flag
    let forceSync = false;
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        forceSync = body.forceSync === true;
        console.log("Request received with forceSync:", forceSync);
      }
    } catch (parseError) {
      // If parsing fails, continue without sync
      console.error("Error parsing request body:", parseError);
    }
    
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
      .select('api_key, last_synced') // Also get last_synced to check auto-refresh
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

    // Check if we should auto-refresh based on last_synced timestamp
    const lastSynced = tokenData.last_synced ? new Date(tokenData.last_synced) : null;
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    // Force sync if last sync was more than a day ago or never done
    const shouldAutoRefresh = !lastSynced || lastSynced < oneDayAgo;
    forceSync = forceSync || shouldAutoRefresh;
    
    // Fetch campaigns from hyros_campaigns table
    const { data: campaigns, error: campaignsError } = await supabase
      .from('hyros_campaigns')
      .select('*')
      .eq('user_id', user.id);
      
    if (campaignsError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch campaigns" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    // If no campaigns found or forceSync is true, attempt to fetch from HYROS API
    if (forceSync || campaigns.length === 0) {
      console.log("No campaigns found or force sync requested, fetching from HYROS API");
      
      // Call the hyros-fetch-campaigns function
      const syncResponse = await fetch(`${SUPABASE_URL}/functions/v1/hyros-fetch-campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!syncResponse.ok) {
        console.error("Error calling hyros-fetch-campaigns:", syncResponse.status);
        let errorMessage = "Failed to sync campaigns from HYROS";
        
        try {
          const errorData = await syncResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If parsing fails, use default error message
          console.error("Error parsing sync error response:", e);
        }
        
        // If we have some campaigns already, return them despite sync failure
        if (campaigns.length > 0) {
          return new Response(
            JSON.stringify({ 
              success: true,
              campaigns: campaigns.map(campaign => ({
                id: campaign.id,
                hyrosCampaignId: campaign.hyros_campaign_id,
                name: campaign.name,
                status: campaign.status || 'active',
                platform: campaign.platform || 'unknown', // Include platform in response
                userId: campaign.user_id,
                createdAt: campaign.created_at,
                updatedAt: campaign.updated_at
              })),
              syncError: errorMessage
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: false, error: errorMessage }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      // Get the sync response with updated campaigns
      const syncResult = await syncResponse.json();
      
      if (syncResult.success && syncResult.campaigns) {
        // Format the response
        const formattedCampaigns = syncResult.campaigns.map(campaign => ({
          id: campaign.id,
          hyrosCampaignId: campaign.hyros_campaign_id,
          name: campaign.name,
          status: campaign.status || 'active',
          platform: campaign.platform || 'unknown', // Include platform in response
          userId: campaign.user_id,
          createdAt: campaign.created_at,
          updatedAt: campaign.updated_at
        }));
        
        return new Response(
          JSON.stringify({ 
            success: true,
            campaigns: formattedCampaigns,
            importCount: syncResult.importCount || formattedCampaigns.length,
            dateRange: syncResult.dateRange,
            apiEndpoint: syncResult.apiEndpoint
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // In case of sync failure but we have existing campaigns
        if (campaigns.length > 0) {
          // Format the response with existing campaigns
          const formattedCampaigns = campaigns.map(campaign => ({
            id: campaign.id,
            hyrosCampaignId: campaign.hyros_campaign_id,
            name: campaign.name,
            status: campaign.status || 'active',
            platform: campaign.platform || 'unknown', // Include platform in response
            userId: campaign.user_id,
            createdAt: campaign.created_at,
            updatedAt: campaign.updated_at
          }));
          
          return new Response(
            JSON.stringify({ 
              success: true,
              campaigns: formattedCampaigns,
              syncError: syncResult.error || "Unknown sync error"
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        return new Response(
          JSON.stringify({ success: false, error: syncResult.error || "Failed to sync campaigns" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    // Format the response
    const formattedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      hyrosCampaignId: campaign.hyros_campaign_id,
      name: campaign.name,
      status: campaign.status || 'active',
      platform: campaign.platform || 'unknown', // Include platform in response
      userId: campaign.user_id,
      createdAt: campaign.created_at,
      updatedAt: campaign.updated_at
    }));
    
    return new Response(
      JSON.stringify({ 
        success: true,
        campaigns: formattedCampaigns
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in hyros-campaigns function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
