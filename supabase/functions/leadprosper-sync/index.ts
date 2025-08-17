import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface LeadProsperCampaign {
  id: number;
  name: string;
  public_name: string;
  suppliers: any[];
  buyers: any[];
  fields: string[];
}

interface LeadProsperLead {
  id: string;
  lead_date_ms: string;
  status: string;
  error_code: number;
  error_message: string;
  test: boolean;
  cost: number;
  revenue: number;
  campaign_id: number;
  campaign_name: string;
  lead_data: Record<string, any>;
  supplier: any;
  buyers: any[];
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
    
    // Get the API key from account_connections table
    const { data: connections, error: connectionError } = await supabase
      .from('account_connections')
      .select('credentials')
      .eq('platform', 'leadprosper')
      .eq('is_connected', true)
      .maybeSingle();

    if (connectionError) {
      console.error('Database error fetching LeadProsper connection:', connectionError);
      return new Response(
        JSON.stringify({ error: 'Database error fetching connection details' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connections?.credentials?.apiKey) {
      console.error('LeadProsper connection not found or API key missing');
      return new Response(
        JSON.stringify({ error: 'LeadProsper connection not found. Please connect your LeadProsper account first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = connections.credentials.apiKey;
    console.log('Using LeadProsper API key for real data sync');

    // Determine date range based on sync type
    let startDate: string;
    let endDate: string;
    const today = new Date().toISOString().split('T')[0];

    if (type === 'historical') {
      // For historical sync, get data from 30 days ago to yesterday
      const historicalStart = new Date();
      historicalStart.setDate(historicalStart.getDate() - 30);
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

    // Step 1: Get all campaigns
    console.log('Fetching campaigns from LeadProsper API...');
    const campaignsResponse = await fetch('https://api.leadprosper.io/public/campaigns', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!campaignsResponse.ok) {
      console.error('LeadProsper campaigns API error:', campaignsResponse.status, campaignsResponse.statusText);
      const errorText = await campaignsResponse.text();
      console.error('Error response:', errorText);
      return new Response(
        JSON.stringify({ error: `LeadProsper API error: ${campaignsResponse.statusText}` }),
        { status: campaignsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const campaigns: LeadProsperCampaign[] = await campaignsResponse.json();
    console.log(`Found ${campaigns.length} campaigns`);

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          dateRange: { startDate, endDate },
          type,
          message: 'No campaigns found in LeadProsper account'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Fetch leads for each campaign
    let allLeads: LeadProsperLead[] = [];
    let processedCampaigns = 0;

    for (const campaign of campaigns) {
      try {
        console.log(`Fetching leads for campaign: ${campaign.name} (ID: ${campaign.id})`);
        
        const leadsUrl = new URL('https://api.leadprosper.io/public/leads');
        leadsUrl.searchParams.set('start_date', startDate);
        leadsUrl.searchParams.set('end_date', endDate);
        leadsUrl.searchParams.set('campaign', campaign.id.toString());
        leadsUrl.searchParams.set('timezone', 'America/New_York');

        const leadsResponse = await fetch(leadsUrl.toString(), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!leadsResponse.ok) {
          console.warn(`Failed to fetch leads for campaign ${campaign.id}:`, leadsResponse.status);
          continue;
        }

        const leadsData = await leadsResponse.json();
        
        // Handle pagination if needed
        let leads: LeadProsperLead[] = [];
        if (Array.isArray(leadsData)) {
          leads = leadsData;
        } else if (leadsData.data && Array.isArray(leadsData.data)) {
          leads = leadsData.data;
        } else if (leadsData.leads && Array.isArray(leadsData.leads)) {
          leads = leadsData.leads;
        }

        if (leads.length > 0) {
          console.log(`Found ${leads.length} leads for campaign ${campaign.name}`);
          allLeads = allLeads.concat(leads);
        }

        processedCampaigns++;
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.warn(`Error processing campaign ${campaign.id}:`, error);
        continue;
      }
    }

    console.log(`Total leads found across all campaigns: ${allLeads.length}`);

    if (allLeads.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          dateRange: { startDate, endDate },
          type,
          message: `No leads found for the specified date range across ${processedCampaigns} campaigns`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Process and store leads data
    const processedLeads = allLeads.map((lead) => {
      // Convert lead_date_ms to date
      const leadDate = lead.lead_date_ms 
        ? new Date(parseInt(lead.lead_date_ms)).toISOString().split('T')[0]
        : startDate;

      return {
        lead_id: lead.id,
        campaign_id: lead.campaign_id.toString(),
        campaign_name: lead.campaign_name || 'Unknown Campaign',
        date: leadDate,
        status: lead.status?.toLowerCase() || 'unknown',
        revenue: Number(lead.revenue || 0),
        cost: Number(lead.cost || 0),
        raw_data: lead,
        updated_at: new Date().toISOString()
      };
    });

    // Step 4: Upsert leads data
    const { error: upsertError } = await supabase
      .from('leadprosper_leads')
      .upsert(processedLeads, {
        onConflict: 'lead_id,date',
        ignoreDuplicates: false
      });

    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store leads data in database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully processed and stored ${processedLeads.length} leads from ${processedCampaigns} campaigns`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedLeads.length,
        campaigns_processed: processedCampaigns,
        dateRange: { startDate, endDate },
        type
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in leadprosper-sync function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});