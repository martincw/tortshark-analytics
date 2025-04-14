
import React, { useMemo } from "react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign } from "@/types/campaign";
import { format, subDays, startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useCampaign } from "@/contexts/CampaignContext";

interface WeeklyPerformanceChartProps {
  campaign: Campaign;
}

export function WeeklyPerformanceChart({ campaign }: WeeklyPerformanceChartProps) {
  const { dateRange } = useCampaign();
  
  const chartData = useMemo(() => {
    // Use the selected date range if available, otherwise use the last 4 weeks
    const hasDateRange = dateRange.startDate && dateRange.endDate;
    
    // Set proper time values to get full day coverage
    const endDateForCalc = hasDateRange ? new Date(dateRange.endDate) : new Date();
    if (hasDateRange) endDateForCalc.setHours(23, 59, 59, 999);
    
    const startDateForCalc = hasDateRange ? new Date(dateRange.startDate) : subDays(endDateForCalc, 28);
    if (hasDateRange) startDateForCalc.setHours(0, 0, 0, 0);
    
    console.log(`WeeklyPerformanceChart generating chart data from ${startDateForCalc.toISOString()} to ${endDateForCalc.toISOString()}`);
    
    // Calculate number of weeks in the range
    const weeksToShow = Math.ceil((endDateForCalc.getTime() - startDateForCalc.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const adjustedWeeksToShow = Math.max(1, Math.min(weeksToShow, 8)); // Cap at 8 weeks
    
    // Generate weekly periods
    const weeklyPeriods = Array.from({ length: adjustedWeeksToShow }).map((_, index) => {
      const currentEndDate = new Date(endDateForCalc);
      currentEndDate.setDate(endDateForCalc.getDate() - (index * 7));
      
      const startDateOfWeek = startOfWeek(currentEndDate, { weekStartsOn: 1 }); // Monday as start of week
      const endDateOfWeek = endOfWeek(currentEndDate, { weekStartsOn: 1 });
      
      return {
        startDate: startDateOfWeek,
        endDate: endDateOfWeek,
        label: `Week ${adjustedWeeksToShow - index}`
      };
    }).reverse();
    
    // Calculate weekly targets
    const monthlyAdSpendTarget = campaign.targets.monthlySpend;
    const monthlyRevenueTarget = campaign.targets.monthlyIncome;
    const weeklyAdSpendTarget = monthlyAdSpendTarget / 4.33; // Average weeks in a month
    const weeklyRevenueTarget = monthlyRevenueTarget / 4.33;
    const weeklyLeadsTarget = campaign.targets.monthlyRetainers * 30 / 4.33; // Estimate leads needed
    const weeklyCasesTarget = campaign.targets.monthlyRetainers / 4.33;
    
    // Process stats history by week
    return weeklyPeriods.map(period => {
      // Filter stats for this week
      const weekStats = campaign.statsHistory.filter(entry => {
        const entryDate = parseISO(entry.date);
        return isWithinInterval(entryDate, { 
          start: period.startDate, 
          end: period.endDate 
        });
      });
      
      console.log(`WeeklyPerformanceChart: ${period.label} (${format(period.startDate, 'MMM d')} - ${format(period.endDate, 'MMM d')}) has ${weekStats.length} stats entries`);
      
      // Aggregate stats for the week
      const weeklyAdSpend = weekStats.reduce((sum, entry) => sum + entry.adSpend, 0);
      const weeklyLeads = weekStats.reduce((sum, entry) => sum + entry.leads, 0);
      const weeklyCases = weekStats.reduce((sum, entry) => sum + entry.cases, 0);
      const weeklyRevenue = weekStats.reduce((sum, entry) => sum + entry.revenue, 0);
      
      // Calculate percentages of targets
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
        adSpendPercentage: Math.min(adSpendPercentage, 150), // Cap for display
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
        <CardTitle>Weekly Target Progress</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
