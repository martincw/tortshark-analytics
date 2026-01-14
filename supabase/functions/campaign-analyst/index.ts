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
    const { workspaceId, messages, briefingMode, analysisPeriod, clientDate } = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Calculate date range based on analysisPeriod
    // "yesterday" = just yesterday's data
    // "trailing7" (default) = trailing 7 days EXCLUDING today
    
    // Use client-provided date if available, otherwise fall back to server time
    // This ensures the analysis uses the user's local date, not the server's UTC date
    let todayUTC: Date;
    
    if (clientDate) {
      // clientDate should be in YYYY-MM-DD format from the client's local timezone
      const [year, month, day] = clientDate.split('-').map(Number);
      todayUTC = new Date(Date.UTC(year, month - 1, day));
      console.log(`Using client date: ${clientDate} -> ${todayUTC.toISOString()}`);
    } else {
      // Fallback to server time (less accurate for users in different timezones)
      const now = new Date();
      todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      console.log(`Using server time (UTC): ${todayUTC.toISOString()}`);
    }
    
    // Yesterday is 1 day before today
    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setUTCDate(yesterdayUTC.getUTCDate() - 1);
    
    // For the "yesterday" period, start = end = yesterday
    // For "trailing7", start = 7 days back from yesterday, end = yesterday
    const endDate = new Date(yesterdayUTC);
    const startDate = new Date(yesterdayUTC);
    
    if (analysisPeriod !== "yesterday") {
      // trailing 7 days: go back 6 more days from yesterday (total 7 days)
      startDate.setUTCDate(startDate.getUTCDate() - 6);
    }
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    const periodLabel = analysisPeriod === "yesterday" ? "yesterday" : "trailing 7 days";
    console.log(`Analyzing ${periodLabel}: ${startDateStr} to ${endDateStr}`);

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

    // Fetch stats history for the trailing 7 days (excluding today)
    const { data: statsHistory } = await supabase
      .from("campaign_stats_history")
      .select("campaign_id, date, leads, ad_spend, revenue, cases, retainers")
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: true });
    
    console.log(`Found ${statsHistory?.length || 0} stats records`);

    // Fetch ALL changelog entries for context (no date limit)
    const { data: changelogEntries } = await supabase
      .from("campaign_changelog")
      .select(`
        campaign_id,
        change_type,
        title,
        description,
        change_date,
        campaigns!inner(name)
      `)
      .eq("workspace_id", workspaceId)
      .order("change_date", { ascending: false });
    
    console.log(`Found ${changelogEntries?.length || 0} changelog entries (all time)`);

    // Fetch stats for 7 days BEFORE each change to calculate before/after metrics
    // IMPORTANT: Only include changes that have at least 1 full day of data AFTER the change
    // (i.e., changes made before today)
    const changelogWithImpact = await Promise.all((changelogEntries || []).map(async (change: any) => {
      const changeDate = new Date(change.change_date);
      const campaignName = change.campaigns?.name || "Unknown";
      
      // Skip changes made today - no data available yet
      // Change must be made BEFORE today to have any "after" data
      if (changeDate >= todayUTC) {
        return {
          campaignName,
          changeType: change.change_type === "ad_creative" ? "Ad/Creative" : 
                      change.change_type === "spend_increase" ? "Ad Spend Increase" :
                      change.change_type === "spend_decrease" ? "Ad Spend Decrease" : "Targeting",
          title: change.title,
          description: change.description,
          changeDate: change.change_date,
          daysOfDataAfter: 0,
          tooRecent: true, // Flag to indicate no data yet
          before: null,
          after: null,
          impact: null
        };
      }
      
      // 7 days before the change
      const beforeStart = new Date(changeDate);
      beforeStart.setUTCDate(beforeStart.getUTCDate() - 7);
      const beforeEnd = new Date(changeDate);
      beforeEnd.setUTCDate(beforeEnd.getUTCDate() - 1);
      
      // From the DAY AFTER the change (first full day of data) up to 7 days after
      // We use the day after because we don't count partial day data
      const afterStart = new Date(changeDate);
      afterStart.setUTCDate(afterStart.getUTCDate() + 1); // Day after the change
      const afterEnd = new Date(changeDate);
      afterEnd.setUTCDate(afterEnd.getUTCDate() + 7); // 7 full days after change
      
      // Clamp afterEnd to yesterday (endDate)
      if (afterEnd > endDate) {
        afterEnd.setTime(endDate.getTime());
      }
      
      // If afterStart > afterEnd, there's no complete day of data yet
      if (afterStart > endDate) {
        return {
          campaignName,
          changeType: change.change_type === "ad_creative" ? "Ad/Creative" : 
                      change.change_type === "spend_increase" ? "Ad Spend Increase" :
                      change.change_type === "spend_decrease" ? "Ad Spend Decrease" : "Targeting",
          title: change.title,
          description: change.description,
          changeDate: change.change_date,
          daysOfDataAfter: 0,
          tooRecent: true,
          before: null,
          after: null,
          impact: null
        };
      }
      
      const beforeStartStr = beforeStart.toISOString().split('T')[0];
      const beforeEndStr = beforeEnd.toISOString().split('T')[0];
      const afterStartStr = afterStart.toISOString().split('T')[0];
      const afterEndStr = afterEnd.toISOString().split('T')[0];
      
      // Fetch before stats
      const { data: beforeStats } = await supabase
        .from("campaign_stats_history")
        .select("leads, ad_spend, revenue, cases")
        .eq("campaign_id", change.campaign_id)
        .gte("date", beforeStartStr)
        .lte("date", beforeEndStr);
      
      // Fetch after stats
      const { data: afterStats } = await supabase
        .from("campaign_stats_history")
        .select("leads, ad_spend, revenue, cases")
        .eq("campaign_id", change.campaign_id)
        .gte("date", afterStartStr)
        .lte("date", afterEndStr);
      
      // Calculate metrics
      const beforeLeads = beforeStats?.reduce((sum, s) => sum + (s.leads || 0), 0) || 0;
      const beforeSpend = beforeStats?.reduce((sum, s) => sum + (s.ad_spend || 0), 0) || 0;
      const beforeRevenue = beforeStats?.reduce((sum, s) => sum + (s.revenue || 0), 0) || 0;
      const beforeDays = beforeStats?.length || 1;
      
      const afterLeads = afterStats?.reduce((sum, s) => sum + (s.leads || 0), 0) || 0;
      const afterSpend = afterStats?.reduce((sum, s) => sum + (s.ad_spend || 0), 0) || 0;
      const afterRevenue = afterStats?.reduce((sum, s) => sum + (s.revenue || 0), 0) || 0;
      const afterDays = afterStats?.length || 0; // Use 0 if no data
      
      // If no after days, mark as too recent
      if (afterDays === 0) {
        return {
          campaignName,
          changeType: change.change_type === "ad_creative" ? "Ad/Creative" : 
                      change.change_type === "spend_increase" ? "Ad Spend Increase" :
                      change.change_type === "spend_decrease" ? "Ad Spend Decrease" : "Targeting",
          title: change.title,
          description: change.description,
          changeDate: change.change_date,
          daysOfDataAfter: 0,
          tooRecent: true,
          before: null,
          after: null,
          impact: null
        };
      }
      
      const beforeCPL = beforeLeads > 0 ? beforeSpend / beforeLeads : 0;
      const afterCPL = afterLeads > 0 ? afterSpend / afterLeads : 0;
      const beforeROAS = beforeSpend > 0 ? beforeRevenue / beforeSpend : 0;
      const afterROAS = afterSpend > 0 ? afterRevenue / afterSpend : 0;
      
      const cplChange = beforeCPL > 0 ? ((afterCPL - beforeCPL) / beforeCPL) * 100 : 0;
      const roasChange = beforeROAS > 0 ? ((afterROAS - beforeROAS) / beforeROAS) * 100 : 0;
      const leadsPerDayChange = beforeLeads / beforeDays > 0 
        ? (((afterLeads / afterDays) - (beforeLeads / beforeDays)) / (beforeLeads / beforeDays)) * 100 
        : 0;
      
      return {
        campaignName,
        changeType: change.change_type === "ad_creative" ? "Ad/Creative" : 
                    change.change_type === "spend_increase" ? "Ad Spend Increase" :
                    change.change_type === "spend_decrease" ? "Ad Spend Decrease" : "Targeting",
        title: change.title,
        description: change.description,
        changeDate: change.change_date,
        daysOfDataAfter: afterDays,
        tooRecent: false,
        before: {
          days: beforeDays,
          leads: beforeLeads,
          spend: Math.round(beforeSpend * 100) / 100,
          revenue: Math.round(beforeRevenue * 100) / 100,
          cpl: Math.round(beforeCPL * 100) / 100,
          roas: Math.round(beforeROAS * 100) / 100,
          leadsPerDay: Math.round((beforeLeads / beforeDays) * 10) / 10,
        },
        after: {
          days: afterDays,
          leads: afterLeads,
          spend: Math.round(afterSpend * 100) / 100,
          revenue: Math.round(afterRevenue * 100) / 100,
          cpl: Math.round(afterCPL * 100) / 100,
          roas: Math.round(afterROAS * 100) / 100,
          leadsPerDay: Math.round((afterLeads / afterDays) * 10) / 10,
        },
        impact: {
          cplChange: Math.round(cplChange * 10) / 10,
          roasChange: Math.round(roasChange * 10) / 10,
          leadsPerDayChange: Math.round(leadsPerDayChange * 10) / 10,
        }
      };
    }));

    // Build campaign summaries for analysis - use revenue from campaign_stats_history
    const campaignSummaries = campaigns?.map(campaign => {
      const campaignStats = statsHistory?.filter(s => s.campaign_id === campaign.id) || [];
      const campaignTarget = targets?.find(t => t.campaign_id === campaign.id);
      
      const totalLeads = campaignStats.reduce((sum, s) => sum + (s.leads || 0), 0);
      const totalSpend = campaignStats.reduce((sum, s) => sum + (s.ad_spend || 0), 0);
      // Use revenue directly from campaign_stats_history
      const totalRevenue = campaignStats.reduce((sum, s) => sum + (s.revenue || 0), 0);
      const totalCases = campaignStats.reduce((sum, s) => sum + (s.cases || 0), 0);
      
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

      // Calculate capacity fill based on the actual period being analyzed
      const actualDays = sortedStats.length || 1;
      const periodLeads = totalLeads; // Use the total from the actual date range
      const targetLeadsPerDay = campaignTarget?.target_leads_per_day || 0;
      // Capacity target should match the actual period being analyzed
      const periodTarget = targetLeadsPerDay * actualDays;
      const capacityFillPercent = periodTarget > 0 ? (periodLeads / periodTarget) * 100 : null;
      const isHittingTarget = capacityFillPercent !== null && capacityFillPercent >= 100;
      
      // Get recent changes for this campaign
      const recentChanges = changelogWithImpact.filter(c => c.campaignName === campaign.name);
      
      return {
        id: campaign.id,
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
        // Capacity metrics (based on actual analysis period)
        periodLeads,
        periodTarget: periodTarget || null,
        capacityFillPercent: capacityFillPercent !== null ? Math.round(capacityFillPercent) : null,
        isHittingTarget,
        recentChanges: recentChanges.length > 0 ? recentChanges : undefined
      };
    }).filter(c => c.totalSpend > 0 || c.totalLeads > 0) || [];

    // Overall portfolio metrics
    const portfolioTotalSpend = campaignSummaries.reduce((sum, c) => sum + c.totalSpend, 0);
    const portfolioTotalRevenue = campaignSummaries.reduce((sum, c) => sum + c.totalRevenue, 0);
    const portfolioTotalLeads = campaignSummaries.reduce((sum, c) => sum + c.totalLeads, 0);
    const portfolioRoas = portfolioTotalSpend > 0 ? portfolioTotalRevenue / portfolioTotalSpend : 0;
    const portfolioCPL = portfolioTotalLeads > 0 ? portfolioTotalSpend / portfolioTotalLeads : 0;

    // Separate today's changes (actions already taken) from historical changes
    const todaysChanges = (changelogEntries || [])
      .filter((c: any) => {
        const changeDate = new Date(c.change_date);
        changeDate.setUTCHours(0, 0, 0, 0);
        return changeDate.getTime() >= todayUTC.getTime();
      })
      .map((c: any) => ({
        campaignName: c.campaigns?.name || "Unknown",
        changeType: c.change_type === "ad_creative" ? "Ad/Creative" : 
                    c.change_type === "spend_increase" ? "Ad Spend Increase" :
                    c.change_type === "spend_decrease" ? "Ad Spend Decrease" : "Targeting",
        title: c.title,
        description: c.description,
        changeDate: c.change_date,
      }));

    const dataPayload = {
      dateRange: {
        startDate: startDateStr,
        endDate: endDateStr,
        description: "Trailing 7 days (excluding today)"
      },
      portfolioMetrics: {
        totalSpend: Math.round(portfolioTotalSpend * 100) / 100,
        totalRevenue: Math.round(portfolioTotalRevenue * 100) / 100,
        totalLeads: portfolioTotalLeads,
        roas: Math.round(portfolioRoas * 100) / 100,
        avgCPL: Math.round(portfolioCPL * 100) / 100,
        activeCampaigns: campaignSummaries.filter(c => c.isActive).length
      },
      campaigns: campaignSummaries,
      // Changes made TODAY - actions already taken, DO NOT recommend these again
      todaysChanges: todaysChanges.length > 0 ? todaysChanges : undefined,
      // Historical changes with before/after impact data
      recentChanges: changelogWithImpact.length > 0 ? changelogWithImpact : undefined
    };

    // Build system prompt for AI analysis
    const systemPrompt = `You are an expert digital marketing analyst for a mass tort legal advertising agency. Your job is to analyze campaign performance data and answer questions about it.

CRITICAL: Each campaign in the data has a UNIQUE ID. Campaigns with similar names (e.g., "Rideshare" vs "Rideshare - Broughton") are COMPLETELY SEPARATE campaigns. Analyze each one individually based on its own metrics. Do NOT combine or confuse them.

You're analyzing campaigns that generate leads for mass tort legal cases. Key metrics:
- ROAS (Return on Ad Spend): Target is minimum 2x (every $1 spent returns $2). THIS IS THE PRIMARY SUCCESS METRIC.
- Lead Volume: Each campaign may have daily lead targets (target_leads_per_day) and weekly capacity fill percentage
- CPL Trends: Only compare a campaign's CPL to its OWN historical performance - NEVER compare CPL between different campaigns

CRITICAL RULES:
1. **ROAS is king**: If a campaign has 2x+ ROAS, it is profitable. DO NOT recommend scaling back profitable campaigns.
2. **Never reallocate between campaigns**: The goal is to MAXIMIZE ALL campaigns, not shift budget between them.
3. **CPL is relative**: A $500 CPL might be great for one tort and terrible for another. Only flag rising CPL trends within the same campaign.
4. **If ROAS < 2x, the campaign is NOT profitable** - flag this clearly.
5. **CAPACITY IS KEY**: Check capacityFillPercent for each campaign. This is calculated based on the actual analysis period (1 day for "yesterday", 7 days for "trailing 7"). If a campaign is under 100% capacity and has decent ROAS (1.5x+), this is a BIG OPPORTUNITY to push volume.
6. **Near-profitable campaigns under capacity are priority**: If ROAS is close to 2x (1.5x-2x) AND under capacity, highlight this as a key opportunity.

**TODAY'S CHANGES (ALREADY DONE - DO NOT RECOMMEND AGAIN):**
If "todaysChanges" is present in the data, these are actions the user has ALREADY TAKEN TODAY. 
- DO NOT recommend actions that have already been done today
- For example, if they already logged "Cut spend" for Rideshare today, do NOT tell them to cut Rideshare
- Acknowledge what they've already done if relevant
- Focus recommendations on campaigns that have NOT been addressed yet today

CHANGELOG ANALYSIS (if recentChanges data is present):
When you see "recentChanges" data, this contains logged changes the user made to campaigns with before/after impact metrics. ANALYZE THESE CAREFULLY:
- Compare the "before" vs "after" metrics for each change
- Highlight changes that had POSITIVE impact (lower CPL, higher ROAS, more leads per day)
- Flag changes that had NEGATIVE impact so they can be rolled back
- Note changes that are too recent (daysOfDataAfter < 5) to draw conclusions
- Correlate performance trends with the timing of changes

CONVERSATIONAL MODE:
You are now in a chat conversation. The user may ask follow-up questions about specific campaigns, request deeper analysis, or ask for recommendations. Be helpful, specific, and always base your answers on the actual data provided.

When the user asks about a specific campaign, look it up in the data and provide detailed metrics.
When asked for comparisons, use actual numbers.
When asked for recommendations, be actionable and specific.

CURRENT CAMPAIGN DATA:
${JSON.stringify(dataPayload, null, 2)}

IMPORTANT REMINDERS:
- Minimum target ROAS is 2x. Below 2x = LOSING MONEY. Be very clear about this.
- NEVER tell me to reallocate budget between campaigns - I want to maximize ALL campaigns
- NEVER tell me to scale back a profitable campaign (2x+ ROAS)
- Only compare a campaign's CPL to its OWN history, not to other campaigns
- Check "todaysChanges" before making recommendations - don't suggest what's already been done
- Calculate actual profit (revenue - spend) for each campaign
- If there are recentChanges, ANALYZE THEIR IMPACT in detail - this is critical for understanding what's working`;

    // Check if this is a chat conversation, briefing, or initial analysis
    const isChat = messages && Array.isArray(messages) && messages.length > 0;
    const isBriefing = briefingMode === true;
    
    let aiMessages;
    if (isChat) {
      // Chat mode: use provided messages with system prompt
      aiMessages = [
        { role: "system", content: systemPrompt },
        ...messages
      ];
    } else if (isBriefing) {
      // Morning briefing mode: ultra-concise top priorities
      const briefingPrompt = `Give me my TOP 3 priorities for today in simple bullet points. Be EXTREMELY concise.

Analyze the data and identify the 1-3 most impactful things I should focus on today. Consider:
- Campaigns losing money (ROAS < 2x)
- Profitable campaigns under capacity (easy wins)
- Recent changelog changes that need attention
- Rising CPL trends

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

**Today's Top Priorities:**

• **[Campaign Name]**: [One short action phrase - max 10 words] — [key metric like "$X loss" or "X% under capacity"]

• **[Campaign Name]**: [One short action phrase] — [key metric]

• **[Campaign Name]**: [One short action phrase] — [key metric]

RULES:
- Maximum 3 bullet points
- Each bullet is ONE line only
- Use specific numbers
- Action-oriented language (Scale up, Cut, Monitor, Roll back, etc.)
- If there are only 1-2 priorities, only show those
- NO explanations, NO paragraphs, NO headers beyond "Today's Top Priorities"`;

      aiMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: briefingPrompt }
      ];
    } else {
      // Initial analysis mode: generate full report
      const initialPrompt = `Provide a comprehensive analysis of all campaign performance data. 

Format your response as:

## 🎯 Executive Summary
Brief 2-3 sentence overview. Start with overall portfolio ROAS. Immediately highlight any profitable campaigns that are under capacity. If there are logged changes, mention their overall impact.

## 🔄 Change Impact Analysis
(Include this section ONLY if recentChanges data exists)
For each logged change, show:
- Campaign name, change type, and what was changed
- Date of change
- Before vs After comparison (CPL, ROAS, Leads/Day)
- Impact assessment: ✅ Positive, ⚠️ Neutral/Too Early, ❌ Negative
- Recommendation: Keep, Roll Back, or Wait for More Data

## 📊 Weekly Campaign Overview
For ALL active campaigns, show:
| Campaign | Spend | Revenue | ROAS | Profit/Loss | Leads | Daily Target | Capacity % |
Mark campaigns with: ✅ (2x+ ROAS), ⚠️ (1.5-2x), ❌ (<1.5x)

## 🚀 Top Priority: Under-Capacity Opportunities
Campaigns with decent ROAS (1.5x+) that are UNDER capacity (weeklyCapacityFillPercent < 100). These should be scaled up. Show the gap between current leads and target.

## 🚨 Losing Money (Action Required)
Campaigns with ROAS < 1.5x - calculate exact losses.

## ✅ Performing Well
Campaigns hitting both profitability (2x+) and capacity targets.

## 📉 CPL Trend Alerts
Only campaigns where CPL is rising vs their own past (cplTrend > 15%).

## 💡 Campaign-Specific Actions
One actionable item per campaign. Prioritize changes based on changelog impact analysis.

IMPORTANT: If a campaign has positive ROAS but is under capacity, this is your MAIN recommendation - push more volume there!`;

      aiMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: initialPrompt }
      ];
    }

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
        messages: aiMessages,
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
