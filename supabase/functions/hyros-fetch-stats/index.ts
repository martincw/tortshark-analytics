
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
    
    // Get the request body
    const { startDate, endDate, campaignId, pageSize = 100, pageId } = await req.json();
    
    if (!startDate || !endDate) {
      return new Response(
        JSON.stringify({ success: false, error: "startDate and endDate are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Get the API key from the database
    const { data: tokenData, error: tokenError } = await supabase
      .from('hyros_tokens')
      .select('api_key')
      .eq('user_id', user.id)
      .single();
      
    if (tokenError || !tokenData) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "HYROS API key not found. Please connect your HYROS account first." 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    const apiKey = tokenData.api_key;
    
    // Construct the API URL
    let apiUrl = `https://api.hyros.com/v1/api/v1.0/leads?fromDate=${startDate}&toDate=${endDate}&pageSize=${pageSize}`;
    
    if (pageId) {
      apiUrl += `&pageId=${pageId}`;
    }
    
    // Make the request to the HYROS API
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status !== 200) {
      const errorData = await response.json();
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorData.message ? errorData.message.join(', ') : "API error",
          status: response.status
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
      );
    }
    
    // Parse the response
    const data = await response.json();
    const leads = data.result || [];
    
    // Process the leads
    // In a real implementation, you would do more processing here
    
    // Return the results
    return new Response(
      JSON.stringify({ 
        success: true,
        leads: leads,
        nextPageId: data.nextPageId,
        total: leads.length,
        request_id: data.request_id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("Error in hyros-fetch-stats function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
