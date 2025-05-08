
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handle CORS preflight requests
const handleCors = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

// Fetch campaigns from the Lead Prosper API
async function fetchLeadProsperCampaigns(apiKey: string): Promise<any> {
  try {
    console.log('Fetching Lead Prosper campaigns with provided API key');
    
    // Basic validation
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      throw new Error('Invalid API key format');
    }
    
    const response = await fetch('https://api.leadprosper.io/public/campaigns', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      console.error(`Lead Prosper API error (${status}):`, errorText);
      throw new Error(`Lead Prosper API returned ${status}: ${errorText}`);
    }

    try {
      const data = await response.json();
      console.log(`Successfully fetched ${data.data?.length || 0} campaigns from Lead Prosper`);
      return data;
    } catch (parseError) {
      console.error('Error parsing Lead Prosper API response:', parseError);
      throw new Error('Failed to parse Lead Prosper API response');
    }
  } catch (error) {
    console.error('Error in fetchLeadProsperCampaigns:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Lead Prosper campaigns function called');
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError) {
      console.error('User authentication error:', userError?.message);
      return new Response(
        JSON.stringify({ error: userError?.message || 'User not found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.error('No user found in session');
      return new Response(
        JSON.stringify({ error: 'No user found in session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully authenticated user: ${user.id}`);

    // Get the Lead Prosper API key from the request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { apiKey } = requestData;
    
    if (!apiKey) {
      console.error('No API key provided');
      return new Response(
        JSON.stringify({ error: 'No API key provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch campaigns from the Lead Prosper API
    let campaigns;
    try {
      campaigns = await fetchLeadProsperCampaigns(apiKey);
    } catch (apiError) {
      console.error('Lead Prosper API error:', apiError);
      return new Response(
        JSON.stringify({ error: `Lead Prosper API error: ${apiError.message}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the campaigns in the external_lp_campaigns table
    if (campaigns && campaigns.data && Array.isArray(campaigns.data)) {
      try {
        for (const campaign of campaigns.data) {
          // Validate campaign data
          if (!campaign.id) {
            console.warn('Skipping campaign with missing ID:', campaign);
            continue;
          }
          
          // Upsert the campaign
          await supabaseClient.from('external_lp_campaigns').upsert({
            lp_campaign_id: campaign.id,
            name: campaign.name || `Campaign ${campaign.id}`,
            status: campaign.status || 'active',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'lp_campaign_id',
          });
        }
        console.log(`Successfully stored ${campaigns.data.length} campaigns in database`);
      } catch (dbError) {
        console.error('Error storing campaigns in database:', dbError);
        // Continue to return campaigns even if storage fails
      }
    } else {
      console.warn('Invalid or empty campaigns data received from Lead Prosper API');
    }

    // Return the campaigns
    return new Response(
      JSON.stringify({ campaigns: campaigns?.data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in lead-prosper-campaigns:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
