
import React, { useMemo } from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/utils/campaignUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart";
import { format, parseISO } from "date-fns";

interface ConversionAnalysisProps {
  campaign: Campaign;
}

export function ConversionAnalysis({ campaign }: ConversionAnalysisProps) {
  const conversionData = useMemo(() => {
    // Sort history entries by date
    const sortedHistory = [...campaign.statsHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Weekly conversion analysis
    const weeklyData = [];
    let weekStart = 0;
    
    while (weekStart < sortedHistory.length) {
      const weekEnd = Math.min(weekStart + 6, sortedHistory.length - 1);
      const weekEntries = sortedHistory.slice(weekStart, weekEnd + 1);
      
      const weekLeads = weekEntries.reduce((sum, entry) => sum + entry.leads, 0);
      const weekCases = weekEntries.reduce((sum, entry) => sum + entry.cases, 0);
      const weekAdSpend = weekEntries.reduce((sum, entry) => sum + (entry.adSpend || 0), 0);
      
      const weekCostPerLead = weekLeads > 0 ? weekAdSpend / weekLeads : 0;
      const weekCPA = weekCases > 0 ? weekAdSpend / weekCases : 0;
      const weekConversionRate = weekLeads > 0 ? (weekCases / weekLeads) * 100 : 0;
      
      const startDate = format(parseISO(weekEntries[0].date), "MMM d");
      const endDate = format(parseISO(weekEntries[weekEntries.length - 1].date), "MMM d");
      
      weeklyData.push({
        name: `${startDate}-${endDate}`,
        leads: weekLeads,
        cases: weekCases,
        adSpend: weekAdSpend,
        costPerLead: weekCostPerLead,
        costPerCase: weekCPA,
        conversionRate: weekConversionRate,
      });
      
      weekStart += 7;
    }
    
    // Daily conversion trends for last 30 days
    const dailyData = sortedHistory.slice(-30).map(entry => {
      const leads = entry.leads;
      const cases = entry.cases;
      const adSpend = entry.adSpend || 0;
      const costPerLead = leads > 0 ? adSpend / leads : 0;
      const costPerCase = cases > 0 ? adSpend / cases : 0;
      const conversionRate = leads > 0 ? (cases / leads) * 100 : 0;
      
      return {
        date: format(parseISO(entry.date), "MMM d"),
        leads,
        cases,
        adSpend,
        costPerLead,
        costPerCase,
        conversionRate,
      };
    });
    
    // Calculate overall conversion metrics
    const totalLeads = campaign.manualStats.leads;
    const totalCases = campaign.manualStats.cases;
    const totalAdSpend = campaign.stats.adSpend;
    
    const overallCostPerLead = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
    const overallCPA = totalCases > 0 ? totalAdSpend / totalCases : 0;
    const overallConversionRate = totalLeads > 0 ? (totalCases / totalLeads) * 100 : 0;
    
    // Analyze if conversion is improving
    const isConversionImproving = weeklyData.length >= 2 && 
      weeklyData[weeklyData.length - 1].conversionRate > weeklyData[weeklyData.length - 2].conversionRate;
    
    // Analyze if costs are decreasing
    const areCostsDecreasing = weeklyData.length >= 2 && 
      weeklyData[weeklyData.length - 1].costPerLead < weeklyData[weeklyData.length - 2].costPerLead;
    
    return {
      weeklyData,
      dailyData,
      overall: {
        costPerLead: overallCostPerLead,
        costPerCase: overallCPA,
        conversionRate: overallConversionRate,
      },
      isConversionImproving,
      areCostsDecreasing,
    };
  }, [campaign]);
  
  const chartConfig = {
    leads: {
      label: "Leads",
      theme: { light: "#6366f1", dark: "#818cf8" },
    },
    cases: {
      label: "Cases",
      theme: { light: "#f97316", dark: "#fb923c" },
    },
    costPerLead: {
      label: "Cost Per Lead",
      theme: { light: "#ef4444", dark: "#f87171" },
    },
    costPerCase: {
      label: "Cost Per Case",
      theme: { light: "#10b981", dark: "#34d399" },
    },
    conversionRate: {
      label: "Conversion Rate (%)",
      theme: { light: "#8b5cf6", dark: "#a78bfa" },
    },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Metrics Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-accent/10 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Lead-to-Case Rate</h3>
            <div className="text-2xl font-bold">
              {formatPercent(conversionData.overall.conversionRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {conversionData.isConversionImproving 
                ? "Trend: Improving" 
                : "Trend: Needs attention"}
            </p>
          </div>
          
          <div className="bg-accent/10 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Cost Per Lead</h3>
            <div className="text-2xl font-bold">
              {formatCurrency(conversionData.overall.costPerLead)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: {formatCurrency(campaign.targets.monthlySpend / 30)}
            </p>
          </div>
          
          <div className="bg-accent/10 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Cost Per Case</h3>
            <div className="text-2xl font-bold">
              {formatCurrency(conversionData.overall.costPerCase)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: {formatCurrency(campaign.targets.casePayoutAmount)}
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Weekly Conversion Metrics</h3>
            <div className="h-[350px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={conversionData.weeklyData}
                    margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis 
                      dataKey="name"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="primary"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <YAxis 
                      yAxisId="secondary"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent 
                          formatter={(value, name) => {
                            const numValue = Number(value);
                            if (name === "costPerLead" || name === "costPerCase") {
                              return [formatCurrency(numValue), chartConfig[name as keyof typeof chartConfig]?.label];
                            }
                            if (name === "conversionRate") {
                              return [formatPercent(numValue), chartConfig[name as keyof typeof chartConfig]?.label];
                            }
                            return [numValue.toLocaleString(), chartConfig[name as keyof typeof chartConfig]?.label];
                          }}
                        />
                      }
                    />
                    <Legend />
                    
                    <Bar 
                      dataKey="leads" 
                      name="leads"
                      yAxisId="primary"
                      fill="var(--color-leads)"
                      opacity={0.7}
                      barSize={20}
                    />
                    
                    <Bar 
                      dataKey="cases" 
                      name="cases"
                      yAxisId="primary"
                      fill="var(--color-cases)"
                      opacity={0.7}
                      barSize={20}
                    />
                    
                    <Line 
                      type="monotone"
                      dataKey="costPerLead"
                      name="costPerLead"
                      yAxisId="primary"
                      stroke="var(--color-costPerLead)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    
                    <Line 
                      type="monotone"
                      dataKey="costPerCase"
                      name="costPerCase"
                      yAxisId="primary"
                      stroke="var(--color-costPerCase)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    
                    <Line 
                      type="monotone"
                      dataKey="conversionRate"
                      name="conversionRate"
                      yAxisId="secondary"
                      stroke="var(--color-conversionRate)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </div>
          
          <div className="p-4 bg-muted/30 rounded-lg">
            <h3 className="text-sm font-medium mb-2">Conversion Insights</h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                {campaign.manualStats.leads > 0 
                  ? `Your campaign is converting ${formatPercent(conversionData.overall.conversionRate)} of leads into cases.`
                  : "No lead conversion data available yet."}
                {conversionData.isConversionImproving
                  ? " Conversion rate is trending upward, indicating improving lead quality or intake efficiency."
                  : " There may be opportunities to improve your qualification or intake process."}
              </p>
              <p>
                {campaign.targets.casePayoutAmount > conversionData.overall.costPerCase
                  ? `Your cost per case (${formatCurrency(conversionData.overall.costPerCase)}) is below your target payout (${formatCurrency(campaign.targets.casePayoutAmount)}), generating a profit of ${formatCurrency(campaign.targets.casePayoutAmount - conversionData.overall.costPerCase)} per case.`
                  : `Your cost per case (${formatCurrency(conversionData.overall.costPerCase)}) is above your target payout (${formatCurrency(campaign.targets.casePayoutAmount)}). Consider adjusting your ad targeting or bidding strategy to reduce costs.`}
              </p>
              {conversionData.dailyData.length > 0 && (
                <p>
                  Recent performance shows 
                  {conversionData.areCostsDecreasing
                    ? " decreasing acquisition costs, which is positive for ROI."
                    : " increasing acquisition costs, which may impact profitability."}
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
