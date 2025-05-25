
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Lead Prosper verify function called');
    
    const { apiKey } = await req.json();
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'No API key provided' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Verifying API key with Lead Prosper...');
    
    // Try to fetch campaigns to verify the API key
    const response = await fetch('https://api.leadprosper.io/public/campaigns', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    console.log(`Lead Prosper API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Lead Prosper API error: ${errorText}`);
      
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: `API verification failed: ${response.status} ${response.statusText}` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse the response
    let campaigns;
    try {
      campaigns = await response.json();
      console.log(`API key verified - found ${Array.isArray(campaigns) ? campaigns.length : 'unknown'} campaigns`);
    } catch (parseError) {
      console.error('Error parsing Lead Prosper response:', parseError);
      return new Response(
        JSON.stringify({ 
          isValid: false, 
          error: 'Invalid response from Lead Prosper API' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // API key is valid
    return new Response(
      JSON.stringify({ 
        isValid: true,
        campaignCount: Array.isArray(campaigns) ? campaigns.length : 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in lead-prosper-verify:', error);
    return new Response(
      JSON.stringify({ 
        isValid: false, 
        error: `Verification error: ${error.message}` 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
