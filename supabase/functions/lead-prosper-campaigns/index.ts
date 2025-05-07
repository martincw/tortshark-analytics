
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
  const response = await fetch('https://api.leadprosper.io/public/campaigns', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch campaigns: ${error}`);
  }

  return await response.json();
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the Lead Prosper API key from the request body
    const { apiKey } = await req.json();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'No API key provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch campaigns from the Lead Prosper API
    const campaigns = await fetchLeadProsperCampaigns(apiKey);

    // Store the campaigns in the external_lp_campaigns table
    if (campaigns && campaigns.data && Array.isArray(campaigns.data)) {
      for (const campaign of campaigns.data) {
        // Upsert the campaign
        await supabaseClient.from('external_lp_campaigns').upsert({
          lp_campaign_id: campaign.id,
          name: campaign.name,
          status: campaign.status || 'active',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'lp_campaign_id',
        });
      }
    }

    // Return the campaigns
    return new Response(
      JSON.stringify({ campaigns: campaigns.data || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
