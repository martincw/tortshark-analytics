
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  console.log("hyros-verify function called");
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    let apiKey;
    try {
      const body = await req.json();
      apiKey = body.apiKey;
      console.log("Received request with API key present:", !!apiKey);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON in request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // If no API key was provided, return error
    if (!apiKey) {
      console.error("No API key provided");
      return new Response(
        JSON.stringify({ success: false, error: "API key is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify the API key by making a test request to the HYROS API
    console.log("Verifying API key with HYROS...");
    const verifyResponse = await fetch('https://api.hyros.com/v1/api/v1.0/leads?pageSize=1', {
      method: 'GET',
      headers: {
        'API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log("HYROS verification response status:", verifyResponse.status);
    
    if (verifyResponse.status !== 200) {
      let errorMessage = "Invalid API key";
      
      try {
        const responseData = await verifyResponse.json();
        errorMessage = responseData.message ? responseData.message.join(', ') : "Invalid API key";
      } catch (e) {
        // If we can't parse the response, use the default error message
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage,
          statusCode: verifyResponse.status 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("API key verification successful");
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in hyros-verify function:", error);
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
