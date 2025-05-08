
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

// Safe parse function to handle JSON strings or objects consistently
const safeParseCredentials = (credentials: any): any => {
  if (!credentials) return null;
  
  if (typeof credentials === 'string') {
    try {
      return JSON.parse(credentials);
    } catch (error) {
      console.error('Failed to parse credentials string:', error);
      return null;
    }
  }
  return credentials; // Already an object
};

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    console.log('Lead Prosper Auth check initiated');
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ 
          error: 'No authorization header',
          isConnected: false,
          credentials: null
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase configuration');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error', 
          isConnected: false,
          credentials: null
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError) {
      console.error('User authentication error:', userError?.message);
      return new Response(
        JSON.stringify({ 
          error: userError?.message || 'User authentication failed',
          isConnected: false,
          credentials: null
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Additional check to make sure we have a user
    if (!user) {
      console.error('No user found in session');
      return new Response(
        JSON.stringify({ 
          error: 'No user found in session',
          isConnected: false,
          credentials: null
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully authenticated user: ${user.id}`);

    // Check if the user has stored credentials for Lead Prosper
    // Note: We've changed from .single() to .order() and .limit() to handle multiple connections
    const { data: connections, error: credentialsError } = await supabaseClient
      .from('account_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'leadprosper')
      .eq('is_connected', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (credentialsError) {
      console.error('Error fetching credentials:', credentialsError);
      return new Response(
        JSON.stringify({ 
          error: credentialsError.message,
          isConnected: false,
          credentials: null
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if we have any active connections
    if (!connections || connections.length === 0) {
      console.log('No Lead Prosper credentials found for user:', user.id);
      return new Response(
        JSON.stringify({
          isConnected: false,
          credentials: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the most recent connection
    const mostRecentConnection = connections[0];
    
    // Parse credentials to ensure consistent format
    if (mostRecentConnection.credentials) {
      const parsedCredentials = safeParseCredentials(mostRecentConnection.credentials);
      
      if (parsedCredentials) {
        mostRecentConnection.credentials = parsedCredentials;
      } else {
        console.error('Failed to parse connection credentials');
      }
    }
    
    console.log(`Found active Lead Prosper connection for user: ${user.id}, connection ID: ${mostRecentConnection.id}`);
    
    // Return the connection status
    return new Response(
      JSON.stringify({
        isConnected: true,
        credentials: mostRecentConnection || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in lead-prosper-auth:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        isConnected: false,
        credentials: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
