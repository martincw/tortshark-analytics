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

    // Check if API key exists and log it (without showing the actual key for security)
    console.log('API key configured:', apiKey ? 'Yes' : 'No', apiKey ? `(${apiKey.length} chars)` : '');

    // Try multiple potential API endpoints and methods
    let lpResponse;
    let apiError = null;

    // First try: GET method with query parameters
    try {
      console.log('Trying GET method with query parameters...');
      const url = new URL('https://api.leadprosper.io/api/leads');
      url.searchParams.set('start_date', startDate);
      url.searchParams.set('end_date', endDate);
      
      lpResponse = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        }
      });
      
      console.log('GET response status:', lpResponse.status);
      
      if (lpResponse.ok) {
        console.log('GET method successful');
      } else {
        throw new Error(`GET failed with status ${lpResponse.status}`);
      }
    } catch (error) {
      console.log('GET method failed:', error);
      apiError = error;
      
      // Second try: POST method
      try {
        console.log('Trying POST method...');
        lpResponse = await fetch('https://api.leadprosper.io/api/leads', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({
            start_date: startDate,
            end_date: endDate
          })
        });
        
        console.log('POST response status:', lpResponse.status);
        
        if (!lpResponse.ok) {
          throw new Error(`POST failed with status ${lpResponse.status}`);
        }
      } catch (postError) {
        console.log('POST method also failed:', postError);
        
        // Third try: Different endpoint structure
        try {
          console.log('Trying alternative endpoint structure...');
          lpResponse = await fetch('https://leadprosper.io/api/v1/leads', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Alternative endpoint status:', lpResponse.status);
          
          if (!lpResponse.ok) {
            throw new Error(`Alternative endpoint failed with status ${lpResponse.status}`);
          }
        } catch (altError) {
          console.log('All API attempts failed');
          console.error('Final error:', altError);
          throw new Error(`All API endpoint attempts failed. Last error: ${altError.message}`);
        }
      }
    }

    if (!lpResponse.ok) {
      console.error('LeadProsper API error:', lpResponse.status, lpResponse.statusText);
      return new Response(
        JSON.stringify({ error: `LeadProsper API error: ${lpResponse.statusText}` }),
        { status: lpResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let lpData;
    try {
      lpData = await lpResponse.json();
      console.log('API Response received:', Object.keys(lpData), 'Keys in response');
      console.log('Response sample:', JSON.stringify(lpData).substring(0, 500) + '...');
    } catch (parseError) {
      console.error('Failed to parse API response:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from LeadProsper API' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Handle different possible response structures
    let leads = [];
    if (lpData.leads && Array.isArray(lpData.leads)) {
      leads = lpData.leads;
    } else if (lpData.data && Array.isArray(lpData.data)) {
      leads = lpData.data;
    } else if (Array.isArray(lpData)) {
      leads = lpData;
    } else {
      console.error('Unexpected response structure:', lpData);
      return new Response(
        JSON.stringify({ error: 'Unexpected response format from LeadProsper API' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${leads.length} leads from LeadProsper`);

    if (leads.length === 0) {
      console.log('No leads found in response');
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          dateRange: { startDate, endDate },
          type,
          message: 'No leads found for the specified date range'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process and store leads data with flexible field mapping
    const processedLeads = leads.map((lead, index) => {
      console.log(`Processing lead ${index}:`, Object.keys(lead));
      return {
        lead_id: lead.id || lead.lead_id || lead.leadId || `unknown_${index}`,
        campaign_id: lead.campaign_id || lead.campaignId || 'unknown',
        campaign_name: lead.campaign_name || lead.campaignName || lead.name || 'Unknown Campaign',
        date: lead.date || lead.created_at || lead.createdAt || startDate,
        status: lead.status || 'unknown',
        revenue: Number(lead.revenue || lead.value || 0),
        cost: Number(lead.cost || lead.spend || 0),
        raw_data: lead,
        updated_at: new Date().toISOString()
      };
    });

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