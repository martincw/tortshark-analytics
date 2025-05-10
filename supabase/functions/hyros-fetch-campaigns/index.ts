
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
    
    // Update the list of possible endpoints for the HYROS API, starting with the one from the example
    const possibleEndpoints = [
      'https://api.hyros.com/v1/api/v1.0/campaigns',  // New endpoint from the example code format
      'https://api.hyros.com/v1/api/v1.0/campaign',   // Singular variant
      'https://api.hyros.com/v1/campaigns',           // Keep existing endpoints as fallbacks
      'https://api.hyros.com/campaigns',
      'https://api.hyros.com/api/v1/campaigns',
      'https://api.hyros.com/api/campaigns'
    ];
    
    let hyrosResponse = null;
    let successfulEndpoint = '';
    let allErrors = [];
    
    // Try each endpoint until one works
    for (const endpoint of possibleEndpoints) {
      console.log(`Attempting to fetch campaigns from endpoint: ${endpoint}`);
      
      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'API-Key': apiKey,
            'Content-Type': 'application/json',
          }
        });
        
        // Get the response text regardless of status code for better debugging
        const responseText = await response.text();
        console.log(`Response from ${endpoint} (${response.status}):`, responseText.substring(0, 500));
        
        if (response.ok) {
          try {
            // Try to parse the response as JSON
            const jsonData = JSON.parse(responseText);
            hyrosResponse = response;
            successfulEndpoint = endpoint;
            console.log(`Successfully fetched campaigns from endpoint: ${endpoint}`);
            break;
          } catch (parseError) {
            console.error(`Response from ${endpoint} is not valid JSON:`, parseError.message);
            allErrors.push({ endpoint, status: response.status, error: "Response is not valid JSON", parseError: parseError.message });
          }
        } else {
          console.error(`Endpoint ${endpoint} returned status: ${response.status}`);
          allErrors.push({ endpoint, status: response.status, response: responseText.substring(0, 1000) });
        }
      } catch (fetchError) {
        console.error(`Error fetching from ${endpoint}:`, fetchError.message);
        allErrors.push({ endpoint, error: fetchError.message });
      }
    }
    
    if (!hyrosResponse) {
      console.error("All HYROS API endpoints failed");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Failed to fetch campaigns from HYROS API. All endpoints failed.",
          triedEndpoints: possibleEndpoints,
          errors: allErrors,
          documentation: "Please check HYROS API documentation or contact HYROS support for the correct API endpoint."
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Get the response body again since we already read it during the loop
    const hyrosResponseClone = await fetch(successfulEndpoint, {
      method: 'GET',
      headers: {
        'API-Key': apiKey, 
        'Content-Type': 'application/json',
      }
    });
    
    const hyrosCampaignsData = await hyrosResponseClone.json();
    console.log(`Fetched campaigns from HYROS API using endpoint ${successfulEndpoint}:`, 
      JSON.stringify(hyrosCampaignsData).substring(0, 200) + "...");
    
    // Extract campaigns from the API response based on the response structure
    // HYROS might return data in different formats, so we need to handle various structures
    let campaigns = [];
    
    if (Array.isArray(hyrosCampaignsData)) {
      // If the response is directly an array
      campaigns = hyrosCampaignsData;
    } else if (hyrosCampaignsData.data && Array.isArray(hyrosCampaignsData.data)) {
      // If the response has a data property that is an array
      campaigns = hyrosCampaignsData.data;
    } else if (hyrosCampaignsData.campaigns && Array.isArray(hyrosCampaignsData.campaigns)) {
      // If the response has a campaigns property that is an array
      campaigns = hyrosCampaignsData.campaigns;
    } else if (hyrosCampaignsData.results && Array.isArray(hyrosCampaignsData.results)) {
      // If the response has a results property that is an array
      campaigns = hyrosCampaignsData.results;
    } else {
      console.error("Unexpected campaigns data format:", typeof hyrosCampaignsData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Unexpected data format from HYROS API",
          dataFormat: typeof hyrosCampaignsData,
          hasDataProperty: !!hyrosCampaignsData.data,
          hasCampaignsProperty: !!hyrosCampaignsData.campaigns,
          responseExcerpt: JSON.stringify(hyrosCampaignsData).substring(0, 1000),
          endpoint: successfulEndpoint
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
    
    console.log(`Processing ${campaigns.length} campaigns from HYROS API`);
    
    // If we got empty campaigns array but a successful response, log this but continue
    if (campaigns.length === 0) {
      console.warn("API returned successful response but no campaigns were found");
    }
    
    // Store campaigns in the database
    for (const campaign of campaigns) {
      // We need to adapt this based on the actual structure of the HYROS API response
      const hyrosCampaignId = campaign.id || campaign.campaign_id || campaign.campaignId;
      const name = campaign.name || campaign.campaign_name || campaign.title || campaign.campaignName;
      const status = campaign.status || campaign.campaignStatus || campaign.state || 'active';
      
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
            onConflict: 'hyros_campaign_id, user_id',
            ignoreDuplicates: false
          });
          
        if (upsertError) {
          console.error("Error upserting campaign:", hyrosCampaignId, upsertError);
        }
      } else {
        console.warn("Skipping campaign with missing ID or name:", campaign);
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
        apiEndpoint: successfulEndpoint
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
