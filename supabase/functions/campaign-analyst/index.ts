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

      // Calculate trailing 7-day capacity fill
      const last7Days = sortedStats.slice(-7);
      const trailing7DayLeads = last7Days.reduce((sum, s) => sum + (s.leads || 0), 0);
      const targetLeadsPerDay = campaignTarget?.target_leads_per_day || 0;
      const weeklyTarget = targetLeadsPerDay * 7;
      const weeklyCapacityFill = weeklyTarget > 0 ? (trailing7DayLeads / weeklyTarget) * 100 : null;
      const isHittingWeeklyTarget = weeklyCapacityFill !== null && weeklyCapacityFill >= 100;
      
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
        targetLeadsPerDay: targetLeadsPerDay || null,
        targetRoas: campaignTarget?.target_roas || 2,
        dayCount,
        // 7-day capacity metrics
        trailing7DayLeads,
        weeklyTarget: weeklyTarget || null,
        weeklyCapacityFillPercent: weeklyCapacityFill !== null ? Math.round(weeklyCapacityFill) : null,
        isHittingWeeklyTarget
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
- ROAS (Return on Ad Spend): Target is minimum 2x (every $1 spent returns $2). THIS IS THE PRIMARY SUCCESS METRIC.
- Lead Volume: Each campaign may have daily lead targets for 7-day capacity fill
- CPL Trends: Only compare a campaign's CPL to its OWN historical performance - NEVER compare CPL between different campaigns as each tort has different economics

CRITICAL RULES:
1. **ROAS is king**: If a campaign has 2x+ ROAS, it is profitable. DO NOT recommend scaling back profitable campaigns.
2. **Never reallocate between campaigns**: The goal is to MAXIMIZE ALL campaigns, not shift budget between them.
3. **CPL is relative**: A $500 CPL might be great for one tort and terrible for another. Only flag rising CPL trends within the same campaign.
4. **If ROAS < 2x, the campaign is NOT profitable** - flag this clearly. If we're spending money and not getting 2x back, that's a problem.
5. **Only recommend scaling if ROAS supports it**: High volume means nothing if we're losing money.

When analyzing, consider:
1. **ROAS Performance**: FIRST check if each campaign is hitting 2x minimum. Below 2x = losing money.
2. **7-Day Capacity Fill**: Check weeklyCapacityFillPercent for each campaign. Under 100% means we're not hitting capacity.
3. **CPL Trends (self-comparison only)**: Is cost per lead rising or falling vs the campaign's own history? Rising CPL = audiences may be exhausting.
4. **Scaling Opportunities**: ONLY if ROAS >= 2x AND we're hitting capacity, consider scaling.
5. **Profit Focus**: Show actual profit (revenue - spend) for each campaign.

Format your response as:
## 🎯 Executive Summary
Brief 2-3 sentence overview. Start with overall ROAS across portfolio - are we profitable?

## 📊 Weekly Campaign Overview
For ALL active campaigns, show a table:
| Campaign | Spend | Revenue | ROAS | Profit | 7-Day Leads | Capacity Fill |
Flag any campaign below 2x ROAS with ⚠️ LOSING MONEY

## 🚨 Profitability Alerts
List campaigns BELOW 2x ROAS - these are losing money and need immediate attention. Show exactly how much we're losing.

## ✅ Profitable Campaigns Hitting Targets
Campaigns with 2x+ ROAS that are at or above capacity - these are working well.

## 📈 Scaling Opportunities
Campaigns with strong ROAS (2.5x+) where we could push harder. Only if profitable!

## ⚠️ Capacity Issues (but profitable)
Campaigns with 2x+ ROAS but under capacity - we should try to push volume here since they're profitable.

## 📉 CPL Trend Alerts
Only show campaigns where CPL is rising significantly vs their own past performance (cplTrend > 15%). Don't compare to other campaigns.

## 💡 Campaign-Specific Actions
For each campaign, one actionable recommendation based on ITS data. Focus on maximizing each campaign individually.

Use specific numbers from the data. Be direct about profitability - if ROAS < 2x, we're losing money, period.`;

    const userPrompt = `Analyze this campaign performance data and provide strategic recommendations:

${JSON.stringify(dataPayload, null, 2)}

CRITICAL REMINDERS:
- Minimum target ROAS is 2x. Below 2x = LOSING MONEY. Be very clear about this.
- NEVER tell me to reallocate budget between campaigns - I want to maximize ALL campaigns
- NEVER tell me to scale back a profitable campaign (2x+ ROAS)
- Only compare a campaign's CPL to its OWN history, not to other campaigns
- Show me ALL active campaigns in the weekly overview
- If a campaign shows low/no revenue but has spend, flag it as potentially unprofitable - don't recommend scaling it!
- Calculate actual profit (revenue - spend) for each campaign`;

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
