
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
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
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
    // With the unique constraint, we can get the single connection directly
    const { data: connection, error: credentialsError } = await supabaseClient
      .from('account_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'leadprosper')
      .eq('is_connected', true)
      .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no record exists

    if (credentialsError && credentialsError.code !== 'PGRST116') { // PGRST116 is "not found" error
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

    // Check if we have an active connection
    if (!connection) {
      console.log('No Lead Prosper credentials found for user:', user.id);
      return new Response(
        JSON.stringify({
          isConnected: false,
          credentials: null,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Parse credentials to ensure consistent format
    if (connection.credentials) {
      try {
        const parsedCredentials = safeParseCredentials(connection.credentials);
        
        if (parsedCredentials) {
          connection.credentials = parsedCredentials;
        } else {
          console.error('Failed to parse connection credentials');
        }
      } catch (error) {
        console.error('Error processing credentials:', error);
        // Continue with original credentials if parsing fails
      }
    }
    
    console.log(`Found active Lead Prosper connection for user: ${user.id}, connection ID: ${connection.id}`);
    
    // Return the connection status
    return new Response(
      JSON.stringify({
        isConnected: true,
        credentials: connection || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error in lead-prosper-auth:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Unknown server error',
        isConnected: false,
        credentials: null
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
