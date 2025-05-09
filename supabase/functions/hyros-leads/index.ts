
// This new edge function will handle fetching leads from the HYROS API with proper pagination
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { corsHeaders } from '../_shared/cors.ts'

// Get environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface HyrosLeadListParams {
  ids?: string[];
  emails?: string[];
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  pageId?: string;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const requestData = await req.json();
    const { apiKey, params } = requestData;
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "API key is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Construct the HYROS API URL for leads
    let url = 'https://api.hyros.com/v1/api/v1.0/leads?';
    const queryParams: string[] = [];

    // Add parameters to the URL if they exist
    if (params) {
      if (params.ids && Array.isArray(params.ids) && params.ids.length > 0) {
        queryParams.push(`ids=${encodeURIComponent(JSON.stringify(params.ids))}`);
      }
      
      if (params.emails && Array.isArray(params.emails) && params.emails.length > 0) {
        queryParams.push(`emails=${encodeURIComponent(JSON.stringify(params.emails))}`);
      }
      
      if (params.fromDate) {
        queryParams.push(`fromDate=${encodeURIComponent(params.fromDate)}`);
      }
      
      if (params.toDate) {
        queryParams.push(`toDate=${encodeURIComponent(params.toDate)}`);
      }
      
      if (params.pageSize) {
        queryParams.push(`pageSize=${params.pageSize}`);
      }
      
      if (params.pageId) {
        queryParams.push(`pageId=${encodeURIComponent(params.pageId)}`);
      }
    }
    
    url += queryParams.join('&');
    console.log(`Fetching leads from HYROS API: ${url}`);
    
    // Make the request to the HYROS API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HYROS API error (${response.status}):`, errorText);
      
      let errorMessage = `HYROS API returned status ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message && Array.isArray(errorData.message)) {
          errorMessage = errorData.message.join(', ');
        } else if (typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If we can't parse the error, just use the status code
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status }
      );
    }
    
    const data = await response.json();
    console.log(`Successfully retrieved leads data. Count: ${data.result?.length || 0}, Next page: ${data.nextPageId ? 'available' : 'none'}`);
    
    // Return the HYROS API response with success flag
    return new Response(
      JSON.stringify({ 
        success: true,
        leads: data.result || [],
        nextPageId: data.nextPageId,
        request_id: data.request_id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in hyros-leads function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
