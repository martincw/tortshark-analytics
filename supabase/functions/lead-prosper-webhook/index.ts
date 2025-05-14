import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.6";

// Create a Supabase client with the service role key for database operations
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
  try {
    // Handle CORS
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    // Parse the webhook payload
    const payload = await req.json();
    console.log("Received Lead Prosper webhook payload:", JSON.stringify(payload));

    // Validate webhook signature (optional) - if Lead Prosper provides this functionality
    // Compare req.headers.get("x-webhook-signature") with HMAC(payload)
    
    // Expected payload format:
    // {
    //   "event": "lead_created", // or other event types
    //   "created_at": "2025-06-01T12:34:56Z",
    //   "data": {
    //     "lead": {
    //       "id": "12345",
    //       "campaign_id": 6789,
    //       ... other lead data
    //     }
    //   }
    // }

    // Check if this is a lead event
    if (payload.event !== "lead_created" && payload.event !== "lead_updated") {
      return new Response(JSON.stringify({ success: true, message: "Event ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Extract lead data
    const lead = payload.data?.lead;
    if (!lead || !lead.id || !lead.campaign_id) {
      return new Response(JSON.stringify({ success: false, error: "Invalid lead data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Find mapping for this Lead Prosper campaign
    const { data: campaignData, error: campaignError } = await supabase
      .from('external_lp_campaigns')
      .select('id')
      .eq('lp_campaign_id', lead.campaign_id)
      .single();

    if (campaignError) {
      console.error("Error finding LP campaign:", campaignError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Lead Prosper campaign not found" 
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Find Tortshark campaign mapping
    const { data: mappingData, error: mappingError } = await supabase
      .from('lp_to_ts_map')
      .select('ts_campaign_id')
      .eq('lp_campaign_id', campaignData.id)
      .eq('active', true)
      .single();

    if (mappingError) {
      console.error("Error finding campaign mapping:", mappingError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "No active mapping found for this Lead Prosper campaign" 
      }), {
        status: 404,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    // Check if lead already exists
    const { data: existingLead, error: checkError } = await supabase
      .from('lp_leads_raw')
      .select('id')
      .eq('id', lead.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking existing lead:", checkError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Error checking existing lead" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    let operation;
    if (existingLead) {
      // Update existing lead
      operation = supabase
        .from('lp_leads_raw')
        .update({
          status: lead.status || 'unknown',
          cost: lead.cost || 0,
          revenue: lead.revenue || 0,
          json_payload: lead,
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);
    } else {
      // Insert new lead
      operation = supabase
        .from('lp_leads_raw')
        .insert({
          id: lead.id,
          lp_campaign_id: lead.campaign_id,
          ts_campaign_id: mappingData.ts_campaign_id,
          status: lead.status || 'unknown',
          cost: lead.cost || 0,
          revenue: lead.revenue || 0,
          lead_date_ms: lead.created_at 
            ? new Date(lead.created_at).getTime() 
            : Date.now(),
          json_payload: lead
        });
    }

    const { error: operationError } = await operation;
    if (operationError) {
      console.error("Error processing lead:", operationError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to process lead" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  
    // Update metrics
    const dateStr = new Date(lead.created_at || Date.now()).toISOString().split('T')[0]; // YYYY-MM-DD
    
    if (!existingLead) { // Only update metrics for new leads
      const { error: metricsError } = await supabase.rpc('upsert_daily_lead_metrics', {
        p_ts_campaign_id: mappingData.ts_campaign_id,
        p_date: dateStr,
        p_lead_count: 1,
        p_accepted: lead.status === 'sold' ? 1 : 0,
        p_duplicated: lead.status === 'duplicate' ? 1 : 0,
        p_failed: ['rejected', 'failed'].includes(lead.status || '') ? 1 : 0,
        p_cost: lead.cost || 0,
        p_revenue: lead.revenue || 0
      });
      
      if (metricsError) {
        console.error("Error updating metrics:", metricsError);
        // Continue anyway as the lead was processed successfully
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: existingLead ? "Lead updated" : "Lead processed and saved" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: `Unexpected error: ${error.message}` 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
