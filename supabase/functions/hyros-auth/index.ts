
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
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { apiKey } = await req.json();
    
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

    const responseData = await verifyResponse.json();
    
    if (verifyResponse.status !== 200) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.message ? responseData.message.join(', ') : "Invalid API key" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get the user from the auth token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.replace('Bearer ', '');
    
    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Store the API key in the database
    const { data, error } = await supabase
      .from('hyros_tokens')
      .upsert(
        { 
          api_key: apiKey, 
          user_id: user.id,
          updated_at: new Date().toISOString() 
        },
        { onConflict: 'user_id' }
      )
      .select('id')
      .single();

    if (error) {
      console.error("Error storing API key:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to store API key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        apiKey: apiKey,
        accountId: null // We don't get account ID from that initial API call
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in hyros-auth function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
