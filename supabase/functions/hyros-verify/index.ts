
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
    // Extract API key from request body or use the one stored in the database
    const { apiKey } = await req.json();
    
    // If no API key was provided, return error
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "API key is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify the API key by making a test request to the HYROS API
    const verifyResponse = await fetch('https://api.hyros.com/v1/api/v1.0/leads?pageSize=1', {
      method: 'GET',
      headers: {
        'API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (verifyResponse.status !== 200) {
      const responseData = await verifyResponse.json();
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.message ? responseData.message.join(', ') : "Invalid API key" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in hyros-verify function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
