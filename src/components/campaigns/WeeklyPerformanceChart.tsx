import React, { useMemo } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign } from "@/types/campaign";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
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

interface WeeklyPerformanceChartProps {
  campaign: Campaign;
}

export function WeeklyPerformanceChart({ campaign }: WeeklyPerformanceChartProps) {
  const { dateRange } = useCampaign();
  
  const chartData = useMemo(() => {
    const hasDateRange = dateRange.startDate && dateRange.endDate;
    
    let startDateForCalc, endDateForCalc;
    
    if (hasDateRange) {
      startDateForCalc = startOfDay(new Date(dateRange.startDate));
      endDateForCalc = endOfDay(new Date(dateRange.endDate));
      
      console.log(`WeeklyPerformanceChart: Using date range ${startDateForCalc.toISOString()} to ${endDateForCalc.toISOString()}`);
    } else {
      endDateForCalc = endOfDay(new Date());
      startDateForCalc = startOfDay(subDays(endDateForCalc, 28));
    }
    
    const weeksToShow = Math.ceil((endDateForCalc.getTime() - startDateForCalc.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const adjustedWeeksToShow = Math.max(1, Math.min(weeksToShow, 8));
    
    const weeklyPeriods = Array.from({ length: adjustedWeeksToShow }).map((_, index) => {
      const currentEndDate = new Date(endDateForCalc);
      currentEndDate.setDate(endDateForCalc.getDate() - (index * 7));
      
      const startDateOfWeek = startOfWeek(currentEndDate, { weekStartsOn: 1 });
      const endDateOfWeek = endOfWeek(currentEndDate, { weekStartsOn: 1 });
      
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
    
    return weeklyPeriods.map(period => {
      const weekStats = campaign.statsHistory.filter(entry => {
        const entryDate = parseISO(entry.date);
        return isWithinInterval(entryDate, { 
          start: period.startDate, 
          end: period.endDate 
        });
      });
      
      console.log(`WeeklyPerformanceChart: ${period.label} (${format(period.startDate, 'MMM d')} - ${format(period.endDate, 'MMM d')}) has ${weekStats.length} stats entries`);
      
      const weeklyAdSpend = weekStats.reduce((sum, entry) => sum + entry.adSpend, 0);
      const weeklyLeads = weekStats.reduce((sum, entry) => sum + entry.leads, 0);
      const weeklyCases = weekStats.reduce((sum, entry) => sum + entry.cases, 0);
      const weeklyRevenue = weekStats.reduce((sum, entry) => sum + entry.revenue, 0);
      
      const adSpendPercentage = (weeklyAdSpend / weeklyAdSpendTarget) * 100;
      const leadsPercentage = (weeklyLeads / weeklyLeadsTarget) * 100;
      const casesPercentage = (weeklyCases / weeklyCasesTarget) * 100;
      const revenuePercentage = (weeklyRevenue / weeklyRevenueTarget) * 100;
      
      return {
        name: period.label,
        period: `${format(period.startDate, 'MMM d')} - ${format(period.endDate, 'MMM d')}`,
        adSpend: weeklyAdSpend,
        leads: weeklyLeads,
        cases: weeklyCases,
        revenue: weeklyRevenue,
        adSpendPercentage: Math.min(adSpendPercentage, 150),
        leadsPercentage: Math.min(leadsPercentage, 150),
        casesPercentage: Math.min(casesPercentage, 150),
        revenuePercentage: Math.min(revenuePercentage, 150),
        adSpendTarget: weeklyAdSpendTarget,
        leadsTarget: weeklyLeadsTarget,
        casesTarget: weeklyCasesTarget,
        revenueTarget: weeklyRevenueTarget
      };
    });
  }, [campaign.statsHistory, campaign.targets, dateRange.startDate, dateRange.endDate]);

  const dailyData = useMemo(() => {
    if (!campaign.statsHistory || campaign.statsHistory.length === 0) return [];
    
    const hasDateRange = dateRange.startDate && dateRange.endDate;
    let filteredStats = [...campaign.statsHistory];
    
    if (hasDateRange) {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      
      filteredStats = campaign.statsHistory.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
    }

    return filteredStats
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(entry => {
        const leads = entry.leads || 0;
        const revenue = entry.revenue || 0;
        const adSpend = entry.adSpend || 0;
        
        return {
          date: format(new Date(entry.date), 'MMM dd'),
          adSpend: adSpend,
          costPerLead: leads > 0 ? adSpend / leads : 0,
          earningsPerLead: leads > 0 ? revenue / leads : 0
        };
      });
  }, [campaign.statsHistory, dateRange]);

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
              </ChartContainer>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Average Daily Ad Spend</div>
                <div className="font-semibold mt-1">
                  {formatCurrency(dailyData.reduce((sum, day) => sum + day.adSpend, 0) / dailyData.length || 0)}
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Average Cost per Lead</div>
                <div className="font-semibold mt-1">
                  {formatCurrency(dailyData.reduce((sum, day) => sum + day.costPerLead, 0) / dailyData.length || 0)}
                </div>
              </div>
              <div className="bg-muted/50 p-3 rounded-md">
                <div className="text-sm text-muted-foreground">Average Earnings per Lead</div>
                <div className="font-semibold mt-1">
                  {formatCurrency(dailyData.reduce((sum, day) => sum + day.earningsPerLead, 0) / dailyData.length || 0)}
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
