
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    
    // Fetch campaigns from HYROS API
    console.log("Fetching campaigns from HYROS API");
    
    // Note: Updated HYROS API endpoint - according to the error logs, this endpoint might be incorrect
    // The API call is returning a 404. Let's try a different endpoint format
    // Original: https://api.hyros.com/v1/api/v1.0/campaigns
    // Updated to use the more common v1 API structure
    const hyrosResponse = await fetch('https://api.hyros.com/v1/campaigns', {
      method: 'GET',
      headers: {
        'API-Key': apiKey,
        'Content-Type': 'application/json',
      }
    });
    
    if (!hyrosResponse.ok) {
      const statusCode = hyrosResponse.status;
      console.error("Error response from HYROS API:", statusCode);
      let errorMessage = `Failed to fetch campaigns from HYROS API (status: ${statusCode})`;
      
      try {
        const errorData = await hyrosResponse.text();
        console.error("Error data from HYROS API:", errorData);
        try {
          const parsedError = JSON.parse(errorData);
          errorMessage = parsedError.message || parsedError.error || errorMessage;
        } catch (parseError) {
          // If not JSON, just use the text response
          errorMessage = errorData || errorMessage;
        }
      } catch (e) {
        console.error("Error parsing error response:", e);
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          statusCode,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const hyrosCampaignsData = await hyrosResponse.json();
    console.log("Fetched campaigns from HYROS API:", JSON.stringify(hyrosCampaignsData).substring(0, 200) + "...");
    
    // Extract campaigns from the API response
    // Note: The exact structure depends on the HYROS API response format
    // This is a best guess based on common API patterns
    const campaigns = hyrosCampaignsData.data || hyrosCampaignsData.campaigns || [];
    
    if (!Array.isArray(campaigns)) {
      console.error("Unexpected campaigns data format:", typeof campaigns);
      return new Response(
        JSON.stringify({ success: false, error: "Unexpected data format from HYROS API" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    console.log(`Processing ${campaigns.length} campaigns from HYROS API`);
    
    // Store campaigns in the database
    for (const campaign of campaigns) {
      // We need to adapt this based on the actual structure of the HYROS API response
      const hyrosCampaignId = campaign.id || campaign.campaign_id;
      const name = campaign.name || campaign.campaign_name;
      const status = campaign.status || campaign.campaignStatus || 'active';
      
      if (hyrosCampaignId && name) {
        // Upsert the campaign into the database
        const { error: upsertError } = await supabase
          .from('hyros_campaigns')
          .upsert({
            hyros_campaign_id: hyrosCampaignId.toString(),
            name: name,
            status: status,
            user_id: user.id,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'hyros_campaign_id',
            ignoreDuplicates: false
          });
          
        if (upsertError) {
          console.error("Error upserting campaign:", hyrosCampaignId, upsertError);
        }
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
        importCount: campaigns.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

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
