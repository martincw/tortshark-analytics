import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workspaceId, dateRange } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all campaign data for analysis
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("id, name, is_active")
      .eq("workspace_id", workspaceId);

    if (campaignsError) throw campaignsError;

    // Fetch campaign targets
    const { data: targets } = await supabase
      .from("campaign_targets")
      .select("campaign_id, target_leads_per_day, case_payout_amount, target_roas");

    // Fetch stats history for the date range
    const { data: statsHistory } = await supabase
      .from("campaign_stats_history")
      .select("campaign_id, date, leads, ad_spend, revenue, cases, retainers")
      .gte("date", dateRange.startDate)
      .lte("date", dateRange.endDate)
      .order("date", { ascending: true });

    // Fetch case attributions for revenue
    const { data: caseAttributions } = await supabase
      .from("case_attributions")
      .select("campaign_id, date, case_count, price_per_case")
      .gte("date", dateRange.startDate)
      .lte("date", dateRange.endDate);

    // Build campaign summaries for analysis
    const campaignSummaries = campaigns?.map(campaign => {
      const campaignStats = statsHistory?.filter(s => s.campaign_id === campaign.id) || [];
      const campaignTarget = targets?.find(t => t.campaign_id === campaign.id);
      const campaignCases = caseAttributions?.filter(c => c.campaign_id === campaign.id) || [];
      
      const totalLeads = campaignStats.reduce((sum, s) => sum + (s.leads || 0), 0);
      const totalSpend = campaignStats.reduce((sum, s) => sum + (s.ad_spend || 0), 0);
      const totalRevenue = campaignCases.reduce((sum, c) => sum + ((c.case_count || 0) * (c.price_per_case || 0)), 0);
      const totalCases = campaignCases.reduce((sum, c) => sum + (c.case_count || 0), 0);
      
      const dayCount = campaignStats.length || 1;
      const avgLeadsPerDay = totalLeads / dayCount;
      const avgSpendPerDay = totalSpend / dayCount;
      const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
      
      // Calculate trend (compare last 7 days vs previous 7 days)
      const sortedStats = [...campaignStats].sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      const midPoint = Math.floor(sortedStats.length / 2);
      const firstHalf = sortedStats.slice(0, midPoint);
      const secondHalf = sortedStats.slice(midPoint);
      
      const firstHalfCPL = firstHalf.reduce((sum, s) => sum + (s.leads || 0), 0) > 0
        ? firstHalf.reduce((sum, s) => sum + (s.ad_spend || 0), 0) / firstHalf.reduce((sum, s) => sum + (s.leads || 0), 0)
        : 0;
      const secondHalfCPL = secondHalf.reduce((sum, s) => sum + (s.leads || 0), 0) > 0
        ? secondHalf.reduce((sum, s) => sum + (s.ad_spend || 0), 0) / secondHalf.reduce((sum, s) => sum + (s.leads || 0), 0)
        : 0;
      
      const cplTrend = firstHalfCPL > 0 ? ((secondHalfCPL - firstHalfCPL) / firstHalfCPL) * 100 : 0;
      
      return {
        name: campaign.name,
        isActive: campaign.is_active,
        totalLeads,
        totalSpend,
        totalRevenue,
        totalCases,
        avgLeadsPerDay: Math.round(avgLeadsPerDay * 10) / 10,
        avgSpendPerDay: Math.round(avgSpendPerDay * 100) / 100,
        costPerLead: Math.round(costPerLead * 100) / 100,
        roas: Math.round(roas * 100) / 100,
        cplTrend: Math.round(cplTrend * 10) / 10,
        targetLeadsPerDay: campaignTarget?.target_leads_per_day || null,
        targetRoas: campaignTarget?.target_roas || 2,
        dayCount
      };
    }).filter(c => c.totalSpend > 0 || c.totalLeads > 0) || [];

    // Overall portfolio metrics
    const portfolioTotalSpend = campaignSummaries.reduce((sum, c) => sum + c.totalSpend, 0);
    const portfolioTotalRevenue = campaignSummaries.reduce((sum, c) => sum + c.totalRevenue, 0);
    const portfolioTotalLeads = campaignSummaries.reduce((sum, c) => sum + c.totalLeads, 0);
    const portfolioRoas = portfolioTotalSpend > 0 ? portfolioTotalRevenue / portfolioTotalSpend : 0;
    const portfolioCPL = portfolioTotalLeads > 0 ? portfolioTotalSpend / portfolioTotalLeads : 0;

    const dataPayload = {
      dateRange,
      portfolioMetrics: {
        totalSpend: Math.round(portfolioTotalSpend * 100) / 100,
        totalRevenue: Math.round(portfolioTotalRevenue * 100) / 100,
        totalLeads: portfolioTotalLeads,
        roas: Math.round(portfolioRoas * 100) / 100,
        avgCPL: Math.round(portfolioCPL * 100) / 100,
        activeCampaigns: campaignSummaries.filter(c => c.isActive).length
      },
      campaigns: campaignSummaries
    };

    // Build prompt for AI analysis
    const systemPrompt = `You are an expert digital marketing analyst for a mass tort legal advertising agency. Your job is to analyze campaign performance data and provide actionable insights.

You're analyzing campaigns that generate leads for mass tort legal cases. Key metrics:
- CPL (Cost Per Lead): Lower is better, but quality matters
- ROAS (Return on Ad Spend): Target is minimum 2x (every $1 spent returns $2)
- Lead Volume: Each campaign may have daily lead targets
- Trends: Rising CPL is concerning, falling CPL is positive

When analyzing, consider:
1. **Lead Target Achievement**: Are campaigns hitting their daily lead targets? Calculate % of target.
2. **ROAS Performance**: Are campaigns hitting the 2x minimum? Which are crushing it (3x+)?
3. **CPL Trends**: Is cost per lead rising or falling? Rising CPL means audiences may be exhausting.
4. **Scaling Opportunities**: High ROAS + consistent performance = opportunity to scale spend.
5. **Underperformers**: Low ROAS or rising CPL = needs optimization or pausing.
6. **Portfolio Balance**: Is spend concentrated or diversified appropriately?

Format your response as:
## 🎯 Executive Summary
Brief 2-3 sentence overview of portfolio health.

## 🚨 Urgent Actions Needed
List the most critical issues that need immediate attention.

## 📈 Top Performers
Campaigns crushing it that could be scaled.

## 📉 Underperformers
Campaigns that need optimization or consideration for pausing.

## 💡 Strategic Recommendations
3-5 actionable recommendations for improving overall performance.

## 📊 Campaign-by-Campaign Analysis
Brief notes on each campaign's status.

Use specific numbers from the data. Be direct and actionable.`;

    const userPrompt = `Analyze this campaign performance data and provide strategic recommendations:

${JSON.stringify(dataPayload, null, 2)}

Remember:
- Minimum target ROAS is 2x
- If a campaign has targetLeadsPerDay set, calculate how they're tracking against it
- cplTrend shows % change in CPL (positive = costs rising, negative = costs falling)
- Focus on actionable insights the team can act on TODAY`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted. Please add credits to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);
      return new Response(JSON.stringify({ error: "AI analysis failed. Please try again." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Campaign analyst error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
