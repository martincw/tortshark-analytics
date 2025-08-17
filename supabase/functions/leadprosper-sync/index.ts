import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface LeadProsperResponse {
  leads: Array<{
    id: string;
    campaign_id: string;
    campaign_name: string;
    date: string;
    status: string;
    revenue: number;
    cost: number;
    [key: string]: any;
  }>;
  success: boolean;
  error?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type = 'today' } = await req.json();
    console.log('LeadProsper sync request:', { type });
    
    const apiKey = Deno.env.get('LEADPROSPER_API_KEY');
    if (!apiKey) {
      console.error('LeadProsper API key not found');
      return new Response(
        JSON.stringify({ error: 'LeadProsper API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine date range based on sync type
    let startDate: string;
    let endDate: string;
    const today = new Date().toISOString().split('T')[0];

    if (type === 'historical') {
      // For historical sync, get data from 90 days ago to yesterday
      const historicalStart = new Date();
      historicalStart.setDate(historicalStart.getDate() - 90);
      startDate = historicalStart.toISOString().split('T')[0];
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      endDate = yesterday.toISOString().split('T')[0];
    } else {
      // For daily sync, only get today's data
      startDate = today;
      endDate = today;
    }

    console.log('Fetching LeadProsper data:', { startDate, endDate });

    // Fetch data from LeadProsper API
    const lpResponse = await fetch('https://api.leadprosper.io/v1/leads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start_date: startDate,
        end_date: endDate
      })
    });

    if (!lpResponse.ok) {
      console.error('LeadProsper API error:', lpResponse.status, lpResponse.statusText);
      return new Response(
        JSON.stringify({ error: `LeadProsper API error: ${lpResponse.statusText}` }),
        { status: lpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lpData: LeadProsperResponse = await lpResponse.json();
    
    if (!lpData.success) {
      console.error('LeadProsper API returned error:', lpData.error);
      return new Response(
        JSON.stringify({ error: lpData.error || 'LeadProsper API returned an error' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${lpData.leads.length} leads from LeadProsper`);

    // Process and store leads data
    const processedLeads = lpData.leads.map(lead => ({
      lead_id: lead.id,
      campaign_id: lead.campaign_id,
      campaign_name: lead.campaign_name,
      date: lead.date,
      status: lead.status,
      revenue: lead.revenue || 0,
      cost: lead.cost || 0,
      raw_data: lead,
      updated_at: new Date().toISOString()
    }));

    // Upsert leads data
    const { error: upsertError } = await supabase
      .from('leadprosper_leads')
      .upsert(processedLeads, {
        onConflict: 'lead_id,date',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store leads data' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully processed ${processedLeads.length} leads`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedLeads.length,
        dateRange: { startDate, endDate },
        type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in leadprosper-sync function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});