
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the logo from the public assets directory
    const logoUrl = "https://lovable-uploads.sfo3.cdn.digitaloceanspaces.com/d4df696c-2bbd-4f08-bd94-ec202f414a3c.png";
    const logoResponse = await fetch(logoUrl);
    
    if (!logoResponse.ok) {
      throw new Error(`Failed to fetch logo: ${logoResponse.statusText}`);
    }
    
    const logoBlob = await logoResponse.blob();
    const logoBuffer = await logoBlob.arrayBuffer();
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("assets")
      .upload("tortshark-logo.png", logoBuffer, { 
        contentType: "image/png",
        upsert: true 
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from("assets")
      .getPublicUrl("tortshark-logo.png");
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Logo uploaded successfully",
        url: urlData.publicUrl
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
