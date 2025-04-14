
import React from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GoogleAdsMetrics from "./GoogleAdsMetrics";
import { WeeklyPerformanceChart } from "./WeeklyPerformanceChart";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, TooltipProps } from "recharts";
import { calculateMetrics, formatCurrency, formatPercent } from "@/utils/campaignUtils";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

interface CampaignPerformanceSectionProps {
  campaign: Campaign;
}

export function CampaignPerformanceSection({ campaign }: CampaignPerformanceSectionProps) {
  const metrics = calculateMetrics(campaign);
  
  // Calculate monthly target percentages
  const monthlyData = [
    {
      name: "Progress",
      leads: Math.min((campaign.manualStats.leads / campaign.targets.monthlyRetainers) * 100, 120),
      cases: Math.min((campaign.manualStats.cases / campaign.targets.monthlyRetainers) * 100, 120),
      revenue: Math.min((campaign.manualStats.revenue / campaign.targets.monthlyIncome) * 100, 120),
      adSpend: Math.min((campaign.stats.adSpend / campaign.targets.monthlySpend) * 100, 120),
      actualLeads: campaign.manualStats.leads,
      actualCases: campaign.manualStats.cases,
      actualRevenue: campaign.manualStats.revenue,
      actualAdSpend: campaign.stats.adSpend,
      targetLeads: campaign.targets.monthlyRetainers * 30, // Estimate leads needed based on target retainers
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

  return (
    <div className="grid gap-6">
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">Weekly Performance</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Targets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weekly" className="mt-4">
          <WeeklyPerformanceChart campaign={campaign} />
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <GoogleAdsMetrics campaign={campaign} />
    </div>
  );
}
