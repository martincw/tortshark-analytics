
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

  console.log("Lead Prosper verification endpoint called");
  
  try {
    // Get the API key from the request body
    let apiKey;
    
    try {
      const requestData = await req.json();
      apiKey = requestData.apiKey;
      console.log("API key received, length:", apiKey?.length || 0);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          isValid: false,
          error: "Invalid JSON in request body" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Basic validation
    if (!apiKey) {
      console.error("No API key provided");
      return new Response(
        JSON.stringify({ 
          success: false, 
          isValid: false,
          error: "No API key provided" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof apiKey !== 'string' || apiKey.length < 10) {
      console.error("Invalid API key format");
      return new Response(
        JSON.stringify({ 
          success: false, 
          isValid: false,
          error: "Invalid API key format" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Attempting Lead Prosper API verification");
    
    // First attempt with v1/campaigns endpoint
    let response;
    let isValid = false;
    let errorDetails = null;
    
    console.log("Trying first endpoint: /v1/campaigns");
    try {
      response = await fetch('https://api.leadprosper.io/v1/campaigns', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        // Add a timeout to avoid hanging requests
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        console.log("Lead Prosper API connection successful with /v1/campaigns");
        isValid = true;
      } else {
        console.error(`Lead Prosper API error with first endpoint (${response.status}): ${response.statusText}`);
        errorDetails = `Error with primary endpoint (${response.status}): ${response.statusText}`;
        
        // Try alternative endpoint
        console.log("Trying alternative endpoint: /public/campaigns");
        const altResponse = await fetch('https://api.leadprosper.io/public/campaigns', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });
        
        if (altResponse.ok) {
          console.log("Lead Prosper API connection successful with /public/campaigns");
          isValid = true;
        } else {
          console.error(`Lead Prosper API error with alternative endpoint (${altResponse.status}): ${altResponse.statusText}`);
          errorDetails += ` | Error with alternative endpoint (${altResponse.status}): ${altResponse.statusText}`;
        }
      }
    } catch (fetchError) {
      console.error("Fetch error during verification:", fetchError);
      errorDetails = `Fetch error: ${fetchError.message || "Unknown error"}`;
    }

    // Return verification result
    if (isValid) {
      return new Response(
        JSON.stringify({ 
          success: true,
          isValid: true,
          message: "Lead Prosper API connection successful" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          isValid: false,
          error: errorDetails || "Failed to connect to Lead Prosper API",
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
  } catch (error) {
    console.error("Error verifying Lead Prosper API:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        isValid: false, 
        error: error.message || "Unknown error during verification" 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
