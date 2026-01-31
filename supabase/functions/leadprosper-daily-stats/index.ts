import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface LeadProsperCampaign {
  id: number;
  name: string;
  public_name: string;
}

interface LeadProsperLead {
  id: string;
  lead_date_ms: string;
  status: string;
  cost: number;
  revenue: number;
  campaign_id: number;
  campaign_name: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Helper to get date string in Eastern Time
function getEasternDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

// Get yesterday's date in Eastern Time
function getYesterdayET(): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return getEasternDateString(yesterday);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { date: targetDate, dryRun = false, prefillOnly = false } = body;
    
    // Use provided date or default to yesterday
    const syncDate = targetDate || getYesterdayET();
    console.log('LeadProsper daily stats sync for date:', syncDate, 'dryRun:', dryRun, 'prefillOnly:', prefillOnly);
    
    // Get user from authorization header (optional - can also run as service role)
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;
    
    if (authHeader && !authHeader.includes('service_role')) {
      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (user) {
        userId = user.id;
      }
    }
    
    // Get the LeadProsper API key from account_connections table
    let apiKeyQuery = supabase
      .from('account_connections')
      .select('credentials, user_id')
      .eq('platform', 'leadprosper')
      .eq('is_connected', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (userId) {
      apiKeyQuery = apiKeyQuery.eq('user_id', userId);
    }
    
    const { data: connections, error: connectionError } = await apiKeyQuery.maybeSingle();

    if (connectionError || !connections?.credentials?.apiKey) {
      console.error('LeadProsper connection not found:', connectionError);
      return new Response(
        JSON.stringify({ error: 'LeadProsper connection not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = connections.credentials.apiKey;
    const connectionUserId = connections.user_id;
    console.log('Using LeadProsper API for user:', connectionUserId);

    // Step 1: Fetch all campaigns from LeadProsper
    console.log('Fetching campaigns from LeadProsper API...');
    const campaignsResponse = await fetch('https://api.leadprosper.io/public/campaigns', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!campaignsResponse.ok) {
      console.error('LeadProsper campaigns API error:', campaignsResponse.status);
      return new Response(
        JSON.stringify({ error: `LeadProsper API error: ${campaignsResponse.statusText}` }),
        { status: campaignsResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const campaigns: LeadProsperCampaign[] = await campaignsResponse.json();
    console.log(`Found ${campaigns.length} campaigns`);

    // Step 2: Fetch leads for each campaign for the target date
    interface CampaignStats {
      lpCampaignId: number;
      campaignName: string;
      leads: number;
      revenue: number;
      cost: number;
      acceptedLeads: number;
    }
    
    const campaignStats: Map<number, CampaignStats> = new Map();

    for (const campaign of campaigns) {
      try {
        // Fetch ALL leads with pagination
        let allLeads: LeadProsperLead[] = [];
        let page = 1;
        const perPage = 100; // LeadProsper default page size
        let hasMore = true;

        while (hasMore) {
          const leadsUrl = new URL('https://api.leadprosper.io/public/leads');
          leadsUrl.searchParams.set('start_date', syncDate);
          leadsUrl.searchParams.set('end_date', syncDate);
          leadsUrl.searchParams.set('campaign', campaign.id.toString());
          leadsUrl.searchParams.set('timezone', 'America/New_York');
          leadsUrl.searchParams.set('page', page.toString());
          leadsUrl.searchParams.set('per_page', perPage.toString());

          const leadsResponse = await fetch(leadsUrl.toString(), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          if (!leadsResponse.ok) {
            console.warn(`Failed to fetch leads for campaign ${campaign.id} page ${page}:`, leadsResponse.status);
            break;
          }

          const leadsData = await leadsResponse.json();
          let leads: LeadProsperLead[] = [];
          
          if (Array.isArray(leadsData)) {
            leads = leadsData;
          } else if (leadsData.data && Array.isArray(leadsData.data)) {
            leads = leadsData.data;
          } else if (leadsData.leads && Array.isArray(leadsData.leads)) {
            leads = leadsData.leads;
          }

          allLeads = allLeads.concat(leads);

          // Check if there are more pages
          // If we got fewer than perPage leads, we've reached the end
          if (leads.length < perPage) {
            hasMore = false;
          } else {
            page++;
            // Safety valve: max 50 pages (5000 leads per campaign per day should be more than enough)
            if (page > 50) {
              console.warn(`Campaign ${campaign.id}: Hit pagination limit at 50 pages`);
              hasMore = false;
            }
          }

          // Add a small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (allLeads.length > 0) {
          const stats: CampaignStats = {
            lpCampaignId: campaign.id,
            campaignName: campaign.name,
            leads: allLeads.length,
            revenue: allLeads.reduce((sum, l) => sum + (l.revenue || 0), 0),
            cost: allLeads.reduce((sum, l) => sum + (l.cost || 0), 0),
            acceptedLeads: allLeads.filter(l => l.status?.toLowerCase() === 'accepted').length
          };
          campaignStats.set(campaign.id, stats);
          console.log(`Campaign ${campaign.name}: ${allLeads.length} leads (${page} page(s)), $${stats.revenue} revenue`);
        }
        
      } catch (error) {
        console.warn(`Error processing campaign ${campaign.id}:`, error);
        continue;
      }
    }

    console.log(`Aggregated stats for ${campaignStats.size} campaigns`);

    if (campaignStats.size === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `No leads found for ${syncDate}`,
          submissions: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Map LeadProsper campaigns to TortShark campaigns
    // Get all external_lp_campaigns to map numeric LP campaign IDs to UUIDs
    const { data: externalCampaigns } = await supabase
      .from('external_lp_campaigns')
      .select('id, lp_campaign_id, name');

    // Get all active lp_to_ts_map mappings
    const { data: lpMappings } = await supabase
      .from('lp_to_ts_map')
      .select('lp_campaign_id, ts_campaign_id, active')
      .eq('active', true);

    // Build mapping: LP numeric ID -> external UUID -> TS campaign ID
    const lpNumericToExternal: Map<number, string> = new Map();
    externalCampaigns?.forEach(ec => {
      lpNumericToExternal.set(parseInt(ec.lp_campaign_id), ec.id);
    });

    const externalToTs: Map<string, string> = new Map();
    lpMappings?.forEach(m => {
      externalToTs.set(m.lp_campaign_id, m.ts_campaign_id);
    });

    // Step 4: Create contractor submissions
    const submissions: any[] = [];
    const unmappedCampaigns: string[] = [];

    for (const [lpId, stats] of campaignStats) {
      const externalId = lpNumericToExternal.get(lpId);
      const tsCampaignId = externalId ? externalToTs.get(externalId) : null;

      if (!tsCampaignId) {
        unmappedCampaigns.push(`${stats.campaignName} (${lpId})`);
        continue;
      }

      const submission = {
        campaign_id: tsCampaignId,
        submission_date: syncDate,
        leads: stats.leads,
        revenue: stats.revenue,
        ad_spend: stats.cost,
        cases: 0, // Cases need manual entry
        contractor_name: 'LeadProsper Auto-Sync',
        contractor_email: 'system@leadprosper.sync',
        status: 'pending',
        notes: `Auto-synced from LeadProsper. LP Campaign: ${stats.campaignName} (ID: ${lpId}). Accepted leads: ${stats.acceptedLeads}`
      };

      submissions.push(submission);
    }

    console.log(`Created ${submissions.length} submissions, ${unmappedCampaigns.length} unmapped campaigns`);

    // Get TortShark campaign names for prefill
    const tsCampaignIds = submissions.map(s => s.campaign_id);
    const { data: tsCampaigns } = await supabase
      .from('campaigns')
      .select('id, name')
      .in('id', tsCampaignIds);
    
    const campaignNameMap = new Map(tsCampaigns?.map(c => [c.id, c.name]) || []);

    // Add campaign names to submissions for prefill
    const submissionsWithNames = submissions.map(s => ({
      ...s,
      campaign_name: campaignNameMap.get(s.campaign_id) || 'Unknown'
    }));

    if (dryRun || prefillOnly) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: dryRun || prefillOnly,
          prefillOnly,
          date: syncDate,
          submissions: submissionsWithNames,
          submissionsCreated: 0,
          unmappedCampaigns
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Upsert contractor submissions (update if exists for same campaign/date)
    if (submissions.length > 0) {
      // Check for existing submissions for this date
      const existingQuery = await supabase
        .from('contractor_submissions')
        .select('id, campaign_id')
        .eq('submission_date', syncDate)
        .eq('contractor_email', 'system@leadprosper.sync');

      const existingMap = new Map(
        existingQuery.data?.map(e => [e.campaign_id, e.id]) || []
      );

      // Split into updates and inserts
      const toUpdate: any[] = [];
      const toInsert: any[] = [];

      for (const sub of submissions) {
        const existingId = existingMap.get(sub.campaign_id);
        if (existingId) {
          toUpdate.push({ ...sub, id: existingId });
        } else {
          toInsert.push(sub);
        }
      }

      // Perform inserts
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('contractor_submissions')
          .insert(toInsert);

        if (insertError) {
          console.error('Insert error:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to insert submissions', details: insertError }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.log(`Inserted ${toInsert.length} new submissions`);
      }

      // Perform updates
      for (const update of toUpdate) {
        const { id, ...updateData } = update;
        const { error: updateError } = await supabase
          .from('contractor_submissions')
          .update({
            leads: updateData.leads,
            revenue: updateData.revenue,
            ad_spend: updateData.ad_spend,
            notes: updateData.notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error('Update error for submission', id, updateError);
        }
      }

      if (toUpdate.length > 0) {
        console.log(`Updated ${toUpdate.length} existing submissions`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: syncDate,
        inserted: submissions.length,
        submissions: submissions.map(s => ({
          campaign_id: s.campaign_id,
          leads: s.leads,
          revenue: s.revenue
        })),
        unmappedCampaigns
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in leadprosper-daily-stats function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
