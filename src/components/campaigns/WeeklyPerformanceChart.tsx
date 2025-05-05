
import React, { useMemo } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign } from "@/types/campaign";
import { calculateMetrics, formatCurrency, formatNumber, getPeriodStats } from "@/utils/campaignUtils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Line,
  LineChart,
  Tooltip
} from "recharts";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useCampaign } from "@/contexts/CampaignContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  createDateBoundaries,
  formatDateForStorage, 
  parseStoredDate, 
  format, 
  isDateInRange, 
  standardizeDateString
} from "@/lib/utils/ManualDateUtils";

interface WeeklyPerformanceChartProps {
  campaign: Campaign;
}

export function WeeklyPerformanceChart({ campaign }: WeeklyPerformanceChartProps) {
  const { dateRange } = useCampaign();

  const dailyData = useMemo(() => {
    if (!campaign.statsHistory || campaign.statsHistory.length === 0) return [];
    
    // Filter stats by date range
    const filteredStats = campaign.statsHistory.filter(entry => {
      if (!dateRange.startDate || !dateRange.endDate) return true;
      return isDateInRange(entry.date, dateRange.startDate, dateRange.endDate);
    });
    
    console.log('WeeklyPerformanceChart - Filtered stats:', filteredStats);

    // Calculate aggregated totals for weighted averages
    let totalLeads = 0;
    let totalAdSpend = 0;
    let totalRevenue = 0;

    filteredStats.forEach(entry => {
      totalLeads += entry.leads || 0;
      totalAdSpend += entry.adSpend || 0;
      totalRevenue += entry.revenue || 0;
    });

    // Calculate the overall weighted averages for the entire period
    const overallCostPerLead = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
    const overallEarningsPerLead = totalLeads > 0 ? totalRevenue / totalLeads : 0;
    
    console.log('WeeklyPerformanceChart - Weighted Averages:', {
      totalLeads,
      totalAdSpend,
      totalRevenue,
      overallCostPerLead,
      overallEarningsPerLead
    });

    return filteredStats
      .sort((a, b) => {
        const dateA = parseStoredDate(standardizeDateString(a.date));
        const dateB = parseStoredDate(standardizeDateString(b.date));
        return dateA.getTime() - dateB.getTime();
      })
      .map(entry => {
        const leads = entry.leads || 0;
        const revenue = entry.revenue || 0;
        const adSpend = entry.adSpend || 0;
        const displayDate = format(parseStoredDate(standardizeDateString(entry.date)), 'MMM dd');
        
        // Calculate per-day metrics - but use the entry's own CPL/EPL to show daily fluctuations
        // This preserves daily variation while the averages below use weighted calculations
        const costPerLead = leads > 0 ? adSpend / leads : 0;
        const earningsPerLead = leads > 0 ? revenue / leads : 0;
        
        return {
          date: displayDate,
          adSpend: adSpend,
          costPerLead: costPerLead,
          earningsPerLead: earningsPerLead,
          leads: leads,
          revenue: revenue
        };
      });
  }, [campaign.statsHistory, dateRange]);

  // Calculate proper weighted averages for the summary stats
  const averages = useMemo(() => {
    if (!dailyData.length) {
      return {
        averageDailyAdSpend: 0,
        averageCostPerLead: 0,
        averageEarningsPerLead: 0
      };
    }

    // Sum totals across all days for weighted averaging
    const totals = dailyData.reduce((acc, day) => {
      return {
        adSpend: acc.adSpend + day.adSpend,
        leads: acc.leads + day.leads,
        revenue: acc.revenue + day.revenue,
        days: acc.days + 1
      };
    }, { adSpend: 0, leads: 0, revenue: 0, days: 0 });

    // Calculate properly weighted averages
    const averageDailyAdSpend = totals.days > 0 ? totals.adSpend / totals.days : 0;
    
    // These are the weighted averages (total amount / total leads)
    const averageCostPerLead = totals.leads > 0 ? totals.adSpend / totals.leads : 0;
    const averageEarningsPerLead = totals.leads > 0 ? totals.revenue / totals.leads : 0;

    return {
      averageDailyAdSpend,
      averageCostPerLead,
      averageEarningsPerLead
    };
  }, [dailyData]);

  const chartData = useMemo(() => {
    if (!campaign.statsHistory || campaign.statsHistory.length === 0) return [];
    
    const hasDateRange = dateRange.startDate && dateRange.endDate;
    const { startDate, endDate } = hasDateRange ? dateRange : {
      startDate: undefined,
      endDate: undefined
    };
    
    console.log('WeeklyPerformanceChart - Using date range:', { startDate, endDate });
    
    let startDateForCalc, endDateForCalc;
    
    if (hasDateRange) {
      const boundaries = createDateBoundaries(startDate!, endDate!);
      startDateForCalc = boundaries.start;
      endDateForCalc = boundaries.end;
    } else {
      const now = new Date();
      endDateForCalc = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23, 59, 59, 999
      ));
      startDateForCalc = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 28,
        0, 0, 0, 0
      ));
    }

    const weeksToShow = Math.ceil((endDateForCalc.getTime() - startDateForCalc.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const adjustedWeeksToShow = Math.max(1, Math.min(weeksToShow, 8));
    
    const weeklyPeriods = Array.from({ length: adjustedWeeksToShow }).map((_, index) => {
      const currentEndDate = new Date(endDateForCalc);
      currentEndDate.setDate(endDateForCalc.getDate() - (index * 7));
      
      // Use consistent date handling for start and end of week
      const startDateOfWeek = new Date(currentEndDate);
      startDateOfWeek.setDate(currentEndDate.getDate() - 6);
      
      const endDateOfWeek = currentEndDate;
      
      return {
        startDate: startDateOfWeek,
        endDate: endDateOfWeek,
        label: `Week ${adjustedWeeksToShow - index}`
      };
    }).reverse();
    
    const monthlyAdSpendTarget = campaign.targets.monthlySpend;
    const monthlyRevenueTarget = campaign.targets.monthlyIncome;
    const weeklyAdSpendTarget = monthlyAdSpendTarget / 4.33;
    const weeklyRevenueTarget = monthlyRevenueTarget / 4.33;
    const weeklyLeadsTarget = campaign.targets.monthlyRetainers * 30 / 4.33;
    const weeklyCasesTarget = campaign.targets.monthlyRetainers / 4.33;

    // Filter stats using getPeriodStats for consistency
    const periodStats = getPeriodStats(campaign, dateRange);
    console.log('WeeklyPerformanceChart - Period stats:', periodStats);

    const weeklyData = {
      name: 'Current Period',
      period: `${format(startDateForCalc, 'MMM d')} - ${format(endDateForCalc, 'MMM d')}`,
      adSpend: periodStats.adSpend,
      leads: periodStats.leads,
      cases: periodStats.cases,
      revenue: periodStats.revenue,
      adSpendPercentage: Math.min((periodStats.adSpend / weeklyAdSpendTarget) * 100, 150),
      leadsPercentage: Math.min((periodStats.leads / weeklyLeadsTarget) * 100, 150),
      casesPercentage: Math.min((periodStats.cases / weeklyCasesTarget) * 100, 150),
      revenuePercentage: Math.min((periodStats.revenue / weeklyRevenueTarget) * 100, 150),
      adSpendTarget: weeklyAdSpendTarget,
      leadsTarget: weeklyLeadsTarget,
      casesTarget: weeklyCasesTarget,
      revenueTarget: weeklyRevenueTarget
    };

    return [weeklyData];
  }, [campaign.statsHistory, campaign.targets, dateRange]);

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
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Campaign Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="daily">Daily Stats</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Target Progress</TabsTrigger>
          </TabsList>
          
          <TabsContent value="daily" className="mt-4">
            <div className="h-[350px] w-full">
              <ChartContainer 
                config={{
                  adSpend: {
                    label: "Ad Spend",
                    theme: {
                      light: "#ef4444",
                      dark: "#f87171",
                    },
                  },
                  costPerLead: {
                    label: "Cost per Lead",
                    theme: {
                      light: "#6366f1",
                      dark: "#818cf8",
                    },
                  },
                  earningsPerLead: {
                    label: "Earnings per Lead",
                    theme: {
                      light: "#10b981",
                      dark: "#34d399",
                    },
                  }
                }}
                className="h-full w-full"
              >
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dailyData}
                      margin={{ top: 10, right: 30, left: 30, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => formatCurrency(value)}
                      />
                      <Tooltip
                        content={
                          <ChartTooltipContent 
                            formatter={(value: ValueType, name: NameType) => {
                              const numValue = Number(value);
                              return [formatCurrency(numValue), name];
                            }}
                          />
                        }
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="adSpend"
                        stroke="var(--color-adSpend)"
                        yAxisId="left"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="costPerLead"
                        stroke="var(--color-costPerLead)"
                        yAxisId="right"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="earningsPerLead"
                        stroke="var(--color-earningsPerLead)"
                        yAxisId="right"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-muted/20 rounded-md border border-dashed">
                    <p className="text-muted-foreground">No data available for the selected date range</p>
                  </div>
                )}
              </ChartContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Average Daily Ad Spend</div>
                <div className="font-semibold mt-1">
                  {formatCurrency(averages.averageDailyAdSpend)}
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Average Cost per Lead</div>
                <div className="font-semibold mt-1">
                  {formatCurrency(averages.averageCostPerLead)}
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Average Earnings per Lead</div>
                <div className="font-semibold mt-1">
                  {formatCurrency(averages.averageEarningsPerLead)}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="weekly" className="mt-4">
            <div className="h-[350px] w-full">
              <ChartContainer 
                config={chartConfig}
                className="h-full w-full"
              >
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={chartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${value}%`}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 120]}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent 
                            formatter={(value: ValueType, name: NameType, props: any) => {
                              const stringName = String(name);
                              const metricName = stringName.replace('Percentage', '');
                              
                              if (stringName.includes('Percentage')) {
                                const numValue = Number(value);
                                return [`${numValue.toFixed(0)}% of target`, chartConfig[metricName as keyof typeof chartConfig]?.label || metricName];
                              }
                              
                              return [value, name];
                            }}
                            labelFormatter={(label) => {
                              const item = chartData.find(d => d.name === label);
                              return item ? `${item.period}` : label;
                            }}
                          />
                        }
                      />
                      <Legend 
                        formatter={(value: string) => {
                          const metricName = value.replace('Percentage', '');
                          return chartConfig[metricName as keyof typeof chartConfig]?.label || value;
                        }}
                      />
                      <Bar 
                        dataKey="leadsPercentage" 
                        name="leadsPercentage" 
                        fill="var(--color-leads)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="casesPercentage" 
                        name="casesPercentage" 
                        fill="var(--color-cases)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="revenuePercentage" 
                        name="revenuePercentage" 
                        fill="var(--color-revenue)"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar 
                        dataKey="adSpendPercentage" 
                        name="adSpendPercentage" 
                        fill="var(--color-adSpend)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center bg-muted/20 rounded-md border border-dashed">
                    <p className="text-muted-foreground">No data available for the selected date range</p>
                  </div>
                )}
              </ChartContainer>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {chartData.length > 0 && (
                <>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground">Weekly Ad Spend Target</div>
                    <div className="font-semibold mt-1">
                      {formatCurrency(chartData[0].adSpendTarget)}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground">Weekly Leads Target</div>
                    <div className="font-semibold mt-1">
                      {formatNumber(Math.round(chartData[0].leadsTarget))}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground">Weekly Cases Target</div>
                    <div className="font-semibold mt-1">
                      {formatNumber(Math.round(chartData[0].casesTarget))}
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md">
                    <div className="text-sm text-muted-foreground">Weekly Revenue Target</div>
                    <div className="font-semibold mt-1">
                      {formatCurrency(chartData[0].revenueTarget)}
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
