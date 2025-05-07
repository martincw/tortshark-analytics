
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";

// Set up CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-leadprosper-signature',
};

// Handle CORS preflight requests
const handleCors = (req: Request): Response | null => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
};

serve(async (req) => {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Create a Supabase client with the service role key for webhook processing
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get the lead data from the request body
    const leadData = await req.json();

    if (!leadData || !leadData.id || !leadData.campaign_id) {
      return new Response(
        JSON.stringify({ error: 'Invalid lead data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: In the future, validate the signature from Lead Prosper
    // const signature = req.headers.get('x-leadprosper-signature');

    // Find the campaign mapping
    const { data: lp_campaign, error: campaignError } = await supabaseAdmin
      .from('external_lp_campaigns')
      .select('id')
      .eq('lp_campaign_id', leadData.campaign_id)
      .single();

    if (campaignError) {
      console.error('Error finding LP campaign:', campaignError.message);
      return new Response(
        JSON.stringify({ error: 'Campaign not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the active mapping for this Lead Prosper campaign
    const { data: mapping, error: mappingError } = await supabaseAdmin
      .from('lp_to_ts_map')
      .select('ts_campaign_id')
      .eq('lp_campaign_id', lp_campaign.id)
      .eq('active', true)
      .single();

    if (mappingError) {
      console.error('Error finding campaign mapping:', mappingError.message);
      return new Response(
        JSON.stringify({ error: 'No active mapping found for this campaign' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add the lead to the raw leads table
    const { error: insertError } = await supabaseAdmin
      .from('lp_leads_raw')
      .upsert({
        id: leadData.id,
        lp_campaign_id: leadData.campaign_id,
        ts_campaign_id: mapping.ts_campaign_id,
        status: leadData.status,
        cost: leadData.cost || 0,
        revenue: leadData.revenue || 0,
        lead_date_ms: leadData.created_at,
        json_payload: leadData,
      });

    if (insertError) {
      console.error('Error inserting lead:', insertError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to store lead data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the date from the lead timestamp
    const leadDate = new Date(leadData.created_at);
    const dateString = leadDate.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Update daily metrics
    let status = leadData.status?.toUpperCase() || 'UNKNOWN';
    let accepted = status === 'ACCEPTED' ? 1 : 0;
    let duplicated = status === 'DUPLICATE' ? 1 : 0;
    let failed = status === 'FAILED' || status === 'REJECTED' ? 1 : 0;

    // Update the daily metrics for this campaign and date
    const { error: metricsError } = await supabaseAdmin
      .from('ts_daily_lead_metrics')
      .upsert({
        ts_campaign_id: mapping.ts_campaign_id,
        date: dateString,
        lead_count: 1,
        accepted: accepted,
        duplicated: duplicated,
        failed: failed,
        cost: leadData.cost || 0,
        revenue: leadData.revenue || 0
      }, {
        onConflict: 'ts_campaign_id, date',
        // Increment counts and sums
        ignoreDuplicates: false
      });

    if (metricsError) {
      console.error('Error updating metrics:', metricsError.message);
    }

    // Broadcast the new lead to realtime subscribers
    const { error: broadcastError } = await supabaseAdmin
      .from('lp_leads_raw')
      .select('id')
      .filter('id', 'eq', leadData.id)
      .limit(1)
      .single();

    // Return success response
    return new Response(
      JSON.stringify({ success: true, leadId: leadData.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
