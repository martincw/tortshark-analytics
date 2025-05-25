
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";

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

// Fetch campaigns from the Lead Prosper API
async function fetchLeadProsperCampaigns(apiKey: string): Promise<any> {
  try {
    console.log('Fetching Lead Prosper campaigns with provided API key');
    
    // Basic validation
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      throw new Error('Invalid API key format');
    }
    
    const response = await fetch('https://api.leadprosper.io/public/campaigns', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const status = response.status;
      console.error(`Lead Prosper API error (${status}):`, errorText);
      throw new Error(`Lead Prosper API returned ${status}: ${errorText}`);
    }

    try {
      // Parse the direct array response - no nested data structure expected
      const campaigns = await response.json();
      
      // Log the structure and count of campaigns
      console.log(`Successfully fetched ${Array.isArray(campaigns) ? campaigns.length : 0} campaigns from Lead Prosper`);
      if (Array.isArray(campaigns) && campaigns.length > 0) {
        console.log('First campaign structure:', JSON.stringify(campaigns[0], null, 2).substring(0, 200) + '...');
      } else if (campaigns && typeof campaigns === 'object') {
        console.log('Response structure:', Object.keys(campaigns));
      }
      
      return campaigns; // Return the campaigns array directly
    } catch (parseError) {
      console.error('Error parsing Lead Prosper API response:', parseError);
      throw new Error('Failed to parse Lead Prosper API response');
    }
  } catch (error) {
    console.error('Error in fetchLeadProsperCampaigns:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Lead Prosper campaigns function called');
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    
    // Log detailed auth information for debugging
    console.log(`Auth header present: ${!!authHeader}`);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ 
          error: 'No authorization header', 
          authenticated: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client with better error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client with auth header
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the current user - using more reliable pattern
    let user;
    try {
      // Extract the JWT token from the Authorization header
      const token = authHeader.replace('Bearer ', '');
      console.log(`Attempting to get user with token (length: ${token.length})`);
      
      // Use getUser with explicit token
      const { data, error } = await supabaseClient.auth.getUser(token);
      
      if (error) {
        console.error('User authentication error:', error?.message);
        throw error;
      }
      
      user = data.user;
      
      // Double check user exists
      if (!user) {
        console.error('No user found after successful auth call');
        throw new Error('Authentication successful but no user returned');
      }
      
      console.log(`Successfully authenticated user: ${user.id}`);
      
    } catch (userError) {
      console.error('Authentication error details:', userError);
      return new Response(
        JSON.stringify({ 
          error: userError?.message || 'User authentication failed',
          authenticated: false 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Lead Prosper API key from the request body
    let requestData;
    try {
      requestData = await req.json();
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { apiKey } = requestData;
    
    if (!apiKey) {
      console.error('No API key provided');
      return new Response(
        JSON.stringify({ error: 'No API key provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch campaigns from the Lead Prosper API
    let campaigns;
    try {
      campaigns = await fetchLeadProsperCampaigns(apiKey);
    } catch (apiError) {
      console.error('Lead Prosper API error:', apiError);
      return new Response(
        JSON.stringify({ error: `Lead Prosper API error: ${apiError.message}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store the campaigns in the external_lp_campaigns table
    if (campaigns && Array.isArray(campaigns)) {
      try {
        console.log(`Processing ${campaigns.length} campaigns for storage`);
        
        for (const campaign of campaigns) {
          // Validate campaign data
          if (!campaign.id) {
            console.warn('Skipping campaign with missing ID:', campaign);
            continue;
          }
          
          // Upsert the campaign with user_id set
          const { error: upsertError } = await supabaseClient
            .from('external_lp_campaigns')
            .upsert({
              lp_campaign_id: campaign.id,
              name: campaign.name || `Campaign ${campaign.id}`,
              status: campaign.status || 'active',
              user_id: user.id, // Set the user_id for RLS
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'lp_campaign_id',
            });
            
          if (upsertError) {
            console.error('Error upserting campaign:', campaign.id, upsertError);
            // Continue with other campaigns even if one fails
          }
        }
        console.log(`Successfully processed ${campaigns.length} campaigns for database storage`);
      } catch (dbError) {
        console.error('Error storing campaigns in database:', dbError);
        // Continue to return campaigns even if storage fails
      }
    } else {
      console.warn('Invalid or empty campaigns data received from Lead Prosper API');
    }

    // Return the campaigns with successful authentication status 
    return new Response(
      JSON.stringify({ 
        campaigns: campaigns && Array.isArray(campaigns) ? campaigns : [],
        authenticated: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in lead-prosper-campaigns:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
