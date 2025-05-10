
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
    
    // Fetch ads from HYROS API using the correct endpoint
    const adsEndpoint = `${HYROS_BASE_URL}/ads?page=1&size=500`;
    console.log(`Fetching ads from HYROS API: ${adsEndpoint}`);
    
    try {
      const response = await fetch(adsEndpoint, {
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
        console.error(`Error fetching ads: ${response.status} ${errorText.substring(0, 500)}`);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to fetch ads: ${response.status}`,
            details: errorText.substring(0, 200),
            endpoint: adsEndpoint
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
        );
      }
      
      const data = await response.json();
      console.log(`Fetched ads from HYROS API. Count: ${data.data?.length || 0}`);
      
      // Extract unique campaigns from ads data with flexible field name handling
      const campaigns = [];
      const uniqueCampaignIds = new Set();
      
      if (data.data && Array.isArray(data.data)) {
        // Extract unique campaigns from ads
        data.data.forEach(ad => {
          // Handle different possible field naming conventions
          const campaignId = ad.campaign_id || ad.campaignId;
          const campaignName = ad.campaign_name || ad.campaignName;
          const adPlatform = ad.platform || ad.adPlatform || 'unknown';
          const adStatus = ad.status || ad.adStatus || 'active';
          
          if (campaignId && !uniqueCampaignIds.has(campaignId)) {
            uniqueCampaignIds.add(campaignId);
            campaigns.push({
              hyros_campaign_id: campaignId.toString(),
              name: campaignName || `Campaign ${campaignId}`,
              status: adStatus,
              platform: adPlatform,
              updated_at: new Date().toISOString(),
              user_id: user.id
            });
          }
        });
      }
      
      console.log(`Extracted ${campaigns.length} unique campaigns from ads`);
      
      // Bulk upsert campaigns to the database
      if (campaigns.length > 0) {
        const { error: upsertError } = await supabase
          .from('hyros_campaigns')
          .upsert(campaigns, {
            onConflict: 'hyros_campaign_id, user_id',
            ignoreDuplicates: false
          });
          
        if (upsertError) {
          console.error("Error upserting campaigns:", upsertError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Failed to save campaigns: ${upsertError.message}`,
              campaigns: campaigns
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
          );
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
      }
      
      // Fetch the updated campaigns from the database to return to the client
      const { data: updatedCampaigns, error: fetchError } = await supabase
        .from('hyros_campaigns')
        .select('*')
        .eq('user_id', user.id);
        
      if (fetchError) {
        console.error("Error fetching updated campaigns:", fetchError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to fetch updated campaigns" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          campaigns: updatedCampaigns,
          importCount: campaigns.length,
          apiEndpoint: adsEndpoint
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (fetchError) {
      console.error(`Error fetching from HYROS API:`, fetchError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Error connecting to HYROS API: ${fetchError.message}`,
          apiEndpoint: adsEndpoint
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
        stack: error.stack 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
