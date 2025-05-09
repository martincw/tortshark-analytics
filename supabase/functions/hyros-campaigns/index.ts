
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
    
    // Fetch campaigns from HYROS API
    // Note: This is a placeholder as the documentation doesn't specify a campaigns endpoint
    // In a real implementation, you'd need to know the exact endpoint for campaigns
    // For now, we'll simulate it by storing/getting campaigns from our database
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
    
    // Format the response
    const formattedCampaigns = campaigns.map(campaign => ({
      id: campaign.id,
      hyrosCampaignId: campaign.hyros_campaign_id,
      name: campaign.name,
      status: campaign.status || 'active',
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
