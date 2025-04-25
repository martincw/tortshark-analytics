
import React, { useMemo } from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GoogleAdsMetrics from "./GoogleAdsMetrics";
import { WeeklyPerformanceChart } from "./WeeklyPerformanceChart";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { calculateMetrics, formatCurrency, formatPercent, getPeriodStats } from "@/utils/campaignUtils";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useCampaign } from "@/contexts/CampaignContext";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";

interface CampaignPerformanceSectionProps {
  campaign: Campaign;
}

export function CampaignPerformanceSection({ campaign }: CampaignPerformanceSectionProps) {
  const { dateRange } = useCampaign();
  
  // Calculate metrics based on date range
  const metrics = useMemo(() => {
    console.log('CampaignPerformanceSection - Calculating metrics with date range:', dateRange);
    return calculateMetrics(campaign, dateRange);
  }, [campaign, dateRange]);
  
  // Calculate period stats within date range using the shared utility function
  const periodStats = useMemo(() => {
    console.log('CampaignPerformanceSection - Getting period stats with date range:', dateRange);
    return getPeriodStats(campaign, dateRange);
  }, [campaign, dateRange]);
  
  console.log('Period stats calculated:', periodStats);
  console.log('Metrics calculated:', metrics);
  
  // Calculate monthly target percentages using filtered data
  const monthlyData = [
    {
      name: "Progress",
      leads: Math.min((periodStats.leads / campaign.targets.monthlyRetainers) * 100, 120),
      cases: Math.min((periodStats.cases / campaign.targets.monthlyRetainers) * 100, 120),
      revenue: Math.min((periodStats.revenue / campaign.targets.monthlyIncome) * 100, 120),
      adSpend: Math.min((periodStats.adSpend / campaign.targets.monthlySpend) * 100, 120),
      actualLeads: periodStats.leads,
      actualCases: periodStats.cases,
      actualRevenue: periodStats.revenue,
      actualAdSpend: periodStats.adSpend,
      targetLeads: campaign.targets.monthlyRetainers * 30,
      targetCases: campaign.targets.monthlyRetainers,
      targetRevenue: campaign.targets.monthlyIncome,
      targetAdSpend: campaign.targets.monthlySpend
    }
  ];

  const chartConfig = {
    leads: {
      label: "Leads",
      theme: {
        light: "#6366f1",
        dark: "#818cf8",
      },
    },
    cases: {
      label: "Cases",
      theme: {
        light: "#f97316",
        dark: "#fb923c",
      },
    },
    revenue: {
      label: "Revenue",
      theme: {
        light: "#10b981",
        dark: "#34d399",
      },
    },
    adSpend: {
      label: "Ad Spend",
      theme: {
        light: "#ef4444",
        dark: "#f87171",
      },
    }
  };

  // Use a key based on dateRange to force re-render when date changes
  const chartKey = `chart-${dateRange.startDate}-${dateRange.endDate}`;

  return (
    <div className="space-y-8">
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">Weekly Performance</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Targets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weekly" className="mt-4">
          <WeeklyPerformanceChart campaign={campaign} key={chartKey} />
        </TabsContent>
        
        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Target Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ChartContainer 
                  config={chartConfig}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis 
                        type="number" 
                        domain={[0, 120]} 
                        tickFormatter={(value) => `${value}%`} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tickLine={false}
                        axisLine={false}
                        hide
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent 
                            formatter={(value: ValueType, name: NameType, props: any) => {
                              if (name === "leads") {
                                const numValue = Number(value);
                                return [`${numValue.toFixed(0)}% (${props.payload.actualLeads}/${props.payload.targetLeads})`, "Leads"];
                              }
                              if (name === "cases") {
                                const numValue = Number(value);
                                return [`${numValue.toFixed(0)}% (${props.payload.actualCases}/${props.payload.targetCases})`, "Cases"];
                              }
                              if (name === "revenue") {
                                const numValue = Number(value);
                                return [`${numValue.toFixed(0)}% (${formatCurrency(props.payload.actualRevenue)}/${formatCurrency(props.payload.targetRevenue)})`, "Revenue"];
                              }
                              if (name === "adSpend") {
                                const numValue = Number(value);
                                return [`${numValue.toFixed(0)}% (${formatCurrency(props.payload.actualAdSpend)}/${formatCurrency(props.payload.targetAdSpend)})`, "Ad Spend"];
                              }
                              return [value, name];
                            }}
                          />
                        }
                      />
                      <Legend formatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label || value} />
                      <Bar 
                        dataKey="leads" 
                        name="leads"
                        fill="var(--color-leads)"
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      />
                      <Bar 
                        dataKey="cases" 
                        name="cases"
                        fill="var(--color-cases)"
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      />
                      <Bar 
                        dataKey="revenue" 
                        name="revenue"
                        fill="var(--color-revenue)"
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      />
                      <Bar 
                        dataKey="adSpend" 
                        name="adSpend"
                        fill="var(--color-adSpend)"
                        radius={[0, 4, 4, 0]}
                        barSize={30}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">ROI</div>
                  <div className="font-semibold mt-1">
                    {formatPercent(metrics.roi)}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">Profit</div>
                  <div className="font-semibold mt-1">
                    {formatCurrency(metrics.profit)}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">CPA</div>
                  <div className="font-semibold mt-1">
                    {formatCurrency(metrics.cpa)}
                  </div>
                </div>
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-muted-foreground">CPL</div>
                  <div className="font-semibold mt-1">
                    {formatCurrency(metrics.costPerLead)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div className="bg-accent/10 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Cost Per Case Breakdown</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Cost Per Case</span>
                      <div className="text-lg font-semibold mt-0.5">{formatCurrency(metrics.cpa)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Target Payout</span>
                      <div className="text-lg font-semibold mt-0.5">{formatCurrency(campaign.targets.casePayoutAmount)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Profit Per Case</span>
                      <div className={`text-lg font-semibold mt-0.5 ${campaign.targets.casePayoutAmount > metrics.cpa ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
                        {formatCurrency(campaign.targets.casePayoutAmount - metrics.cpa)}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Cases Needed</span>
                      <div className="text-lg font-semibold mt-0.5">
                        {metrics.adSpend > 0 ? Math.ceil(periodStats.adSpend / metrics.cpa) : 0}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-accent/10 p-4 rounded-lg">
                  <h3 className="text-sm font-medium mb-2">Conversion Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground">Lead → Case Rate</span>
                      <div className="text-lg font-semibold mt-0.5">
                        {periodStats.leads > 0 ? 
                          `${((periodStats.cases / periodStats.leads) * 100).toFixed(1)}%` : 
                          "0%"}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Avg Revenue/Case</span>
                      <div className="text-lg font-semibold mt-0.5">
                        {periodStats.cases > 0 ? 
                          formatCurrency(periodStats.revenue / periodStats.cases) : 
                          "$0.00"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <GoogleAdsMetrics campaign={campaign} key={`metrics-${dateRange.startDate}-${dateRange.endDate}`} />
    </div>
  );
}
