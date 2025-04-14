
import React, { useMemo } from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from "recharts";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart";
import { formatCurrency, formatPercent } from "@/utils/campaignUtils";
import { format, subDays, parseISO } from "date-fns";

interface PerformanceTrendsProps {
  campaign: Campaign;
}

export function PerformanceTrends({ campaign }: PerformanceTrendsProps) {
  // Prepare data for week-over-week and month-over-month trends
  const trends = useMemo(() => {
    // Create a sorted copy of the history data
    const sortedHistory = [...campaign.statsHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    if (sortedHistory.length === 0) {
      return {
        weeklyData: [],
        monthlyData: [],
        weekOverWeekChanges: {
          leads: 0,
          costPerLead: 0,
          cases: 0,
          cpa: 0,
          conversionRate: 0,
        },
        monthOverMonthChanges: {
          leads: 0,
          costPerLead: 0,
          cases: 0,
          cpa: 0,
          conversionRate: 0,
        }
      };
    }
    
    // Prepare daily data with moving averages for last 30 days
    const today = new Date();
    const dailyData = [];
    
    // Generate dates for last 30 days
    for (let i = 30; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "yyyy-MM-dd");
      
      // Find matching entry in history
      const dayData = sortedHistory.find(d => 
        format(parseISO(d.date), "yyyy-MM-dd") === dateStr
      );
      
      if (dayData) {
        const leads = dayData.leads;
        const cases = dayData.cases;
        const adSpend = dayData.adSpend || 0;
        const costPerLead = leads > 0 ? adSpend / leads : 0;
        const costPerCase = cases > 0 ? adSpend / cases : 0;
        const conversionRate = leads > 0 ? (cases / leads) * 100 : 0;
        
        dailyData.push({
          date: dateStr,
          leads,
          cases,
          adSpend,
          costPerLead,
          costPerCase,
          conversionRate,
        });
      }
    }
    
    // Calculate week-over-week changes
    const currentWeekData = dailyData.slice(-7);
    const prevWeekData = dailyData.slice(-14, -7);
    
    const currentWeekTotals = currentWeekData.reduce(
      (acc, day) => {
        acc.leads += day.leads;
        acc.cases += day.cases;
        acc.adSpend += day.adSpend;
        return acc;
      },
      { leads: 0, cases: 0, adSpend: 0 }
    );
    
    const prevWeekTotals = prevWeekData.reduce(
      (acc, day) => {
        acc.leads += day.leads;
        acc.cases += day.cases;
        acc.adSpend += day.adSpend;
        return acc;
      },
      { leads: 0, cases: 0, adSpend: 0 }
    );
    
    // Calculate metrics for this week and previous week
    const thisWeekCostPerLead = currentWeekTotals.leads > 0 
      ? currentWeekTotals.adSpend / currentWeekTotals.leads 
      : 0;
    
    const prevWeekCostPerLead = prevWeekTotals.leads > 0 
      ? prevWeekTotals.adSpend / prevWeekTotals.leads 
      : 0;
    
    const thisWeekCPA = currentWeekTotals.cases > 0 
      ? currentWeekTotals.adSpend / currentWeekTotals.cases 
      : 0;
    
    const prevWeekCPA = prevWeekTotals.cases > 0 
      ? prevWeekTotals.adSpend / prevWeekTotals.cases 
      : 0;
    
    const thisWeekConversionRate = currentWeekTotals.leads > 0 
      ? (currentWeekTotals.cases / currentWeekTotals.leads) * 100 
      : 0;
    
    const prevWeekConversionRate = prevWeekTotals.leads > 0 
      ? (prevWeekTotals.cases / prevWeekTotals.leads) * 100 
      : 0;
    
    // Calculate week-over-week percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };
    
    const weekOverWeekChanges = {
      leads: calculateChange(currentWeekTotals.leads, prevWeekTotals.leads),
      costPerLead: calculateChange(thisWeekCostPerLead, prevWeekCostPerLead),
      cases: calculateChange(currentWeekTotals.cases, prevWeekTotals.cases),
      cpa: calculateChange(thisWeekCPA, prevWeekCPA),
      conversionRate: calculateChange(thisWeekConversionRate, prevWeekConversionRate),
    };
    
    // Prepare chart data for weekly trends (last 4 weeks)
    const weeklyData = [];
    for (let i = 4; i >= 0; i--) {
      // Get data for the week starting i weeks ago
      const startIdx = Math.max(0, dailyData.length - (i+1)*7);
      const endIdx = Math.min(dailyData.length, dailyData.length - i*7);
      
      if (startIdx < endIdx) {
        const weekData = dailyData.slice(startIdx, endIdx);
        const weekTotals = weekData.reduce(
          (acc, day) => {
            acc.leads += day.leads;
            acc.cases += day.cases;
            acc.adSpend += day.adSpend;
            return acc;
          },
          { leads: 0, cases: 0, adSpend: 0 }
        );
        
        const weekCostPerLead = weekTotals.leads > 0 
          ? weekTotals.adSpend / weekTotals.leads 
          : 0;
        
        const weekCPA = weekTotals.cases > 0 
          ? weekTotals.adSpend / weekTotals.cases 
          : 0;
        
        const weekConversionRate = weekTotals.leads > 0 
          ? (weekTotals.cases / weekTotals.leads) * 100 
          : 0;
        
        const weekStart = format(parseISO(weekData[0]?.date || today.toISOString()), "MMM d");
        const weekEnd = format(parseISO(weekData[weekData.length-1]?.date || today.toISOString()), "MMM d");
        
        weeklyData.push({
          name: `${weekStart}-${weekEnd}`,
          leads: weekTotals.leads,
          cases: weekTotals.cases,
          adSpend: weekTotals.adSpend,
          costPerLead: weekCostPerLead,
          costPerCase: weekCPA,
          conversionRate: weekConversionRate,
        });
      }
    }
    
    // Calculate month-over-month changes (similar approach)
    // Simplifying by using the last 30 days vs the 30 days before that
    const currentMonthData = dailyData.slice(-30);
    const prevMonthData = dailyData.slice(-60, -30);
    
    const currentMonthTotals = currentMonthData.reduce(
      (acc, day) => {
        acc.leads += day.leads;
        acc.cases += day.cases;
        acc.adSpend += day.adSpend;
        return acc;
      },
      { leads: 0, cases: 0, adSpend: 0 }
    );
    
    const prevMonthTotals = prevMonthData.reduce(
      (acc, day) => {
        acc.leads += day.leads;
        acc.cases += day.cases;
        acc.adSpend += day.adSpend;
        return acc;
      },
      { leads: 0, cases: 0, adSpend: 0 }
    );
    
    // Calculate monthly metrics
    const thisMonthCostPerLead = currentMonthTotals.leads > 0 
      ? currentMonthTotals.adSpend / currentMonthTotals.leads 
      : 0;
    
    const prevMonthCostPerLead = prevMonthTotals.leads > 0 
      ? prevMonthTotals.adSpend / prevMonthTotals.leads 
      : 0;
    
    const thisMonthCPA = currentMonthTotals.cases > 0 
      ? currentMonthTotals.adSpend / currentMonthTotals.cases 
      : 0;
    
    const prevMonthCPA = prevMonthTotals.cases > 0 
      ? prevMonthTotals.adSpend / prevMonthTotals.cases 
      : 0;
    
    const thisMonthConversionRate = currentMonthTotals.leads > 0 
      ? (currentMonthTotals.cases / currentMonthTotals.leads) * 100 
      : 0;
    
    const prevMonthConversionRate = prevMonthTotals.leads > 0 
      ? (prevMonthTotals.cases / prevMonthTotals.leads) * 100 
      : 0;
    
    // Calculate month-over-month changes
    const monthOverMonthChanges = {
      leads: calculateChange(currentMonthTotals.leads, prevMonthTotals.leads),
      costPerLead: calculateChange(thisMonthCostPerLead, prevMonthCostPerLead),
      cases: calculateChange(currentMonthTotals.cases, prevMonthTotals.cases),
      cpa: calculateChange(thisMonthCPA, prevMonthCPA),
      conversionRate: calculateChange(thisMonthConversionRate, prevMonthConversionRate),
    };
    
    return {
      weeklyData,
      monthlyData: [], // We'll just use the change metrics for now
      weekOverWeekChanges,
      monthOverMonthChanges
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
  
  // Generate change indicators
  const renderChangeIndicator = (change: number, invertColors = false) => {
    const isPositive = invertColors ? change < 0 : change > 0;
    const isNegative = invertColors ? change > 0 : change < 0;
    
    return (
      <div className={`flex items-center ${
        isPositive ? "text-success-DEFAULT" : 
        isNegative ? "text-error-DEFAULT" : 
        "text-muted-foreground"
      }`}>
        {change > 0 && "▲"}
        {change < 0 && "▼"}
        {change === 0 && "—"}
        <span className="ml-1">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Week-over-Week Changes</h3>
            <div className="space-y-2 bg-accent/10 p-4 rounded-lg">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Leads</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.weekOverWeekChanges.leads)}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Cost Per Lead</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.weekOverWeekChanges.costPerLead, true)}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Cases</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.weekOverWeekChanges.cases)}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Cost Per Case</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.weekOverWeekChanges.cpa, true)}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.weekOverWeekChanges.conversionRate)}
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium mb-3">Month-over-Month Changes</h3>
            <div className="space-y-2 bg-accent/10 p-4 rounded-lg">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Leads</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.monthOverMonthChanges.leads)}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Cost Per Lead</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.monthOverMonthChanges.costPerLead, true)}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Cases</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.monthOverMonthChanges.cases)}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Cost Per Case</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.monthOverMonthChanges.cpa, true)}
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
                <div className="text-sm font-medium">
                  {renderChangeIndicator(trends.monthOverMonthChanges.conversionRate)}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="h-[350px] w-full">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={trends.weeklyData} 
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
                  tickFormatter={(value) => value.toLocaleString()}
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
                
                <Line 
                  type="monotone"
                  dataKey="leads"
                  name="leads"
                  yAxisId="primary"
                  stroke="var(--color-leads)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                
                <Line 
                  type="monotone"
                  dataKey="cases"
                  name="cases"
                  yAxisId="primary"
                  stroke="var(--color-cases)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                
                <Line 
                  type="monotone"
                  dataKey="costPerLead"
                  name="costPerLead"
                  yAxisId="primary"
                  stroke="var(--color-costPerLead)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                
                <Line 
                  type="monotone"
                  dataKey="costPerCase"
                  name="costPerCase"
                  yAxisId="primary"
                  stroke="var(--color-costPerCase)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                
                <Line 
                  type="monotone"
                  dataKey="conversionRate"
                  name="conversionRate"
                  yAxisId="secondary"
                  stroke="var(--color-conversionRate)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
        
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <h3 className="text-sm font-medium mb-2">Performance Insights</h3>
          <p className="text-sm text-muted-foreground">
            {Math.abs(trends.weekOverWeekChanges.costPerLead) > 10 && 
              (trends.weekOverWeekChanges.costPerLead > 0 
                ? "⚠️ Cost per lead has increased significantly week-over-week. Consider reviewing ad targeting and bidding strategies. " 
                : "✅ Cost per lead has decreased week-over-week, indicating improving ad efficiency. ")}
            
            {Math.abs(trends.weekOverWeekChanges.conversionRate) > 10 && 
              (trends.weekOverWeekChanges.conversionRate > 0 
                ? "✅ Lead-to-case conversion rate has improved. Your qualification process is working better. " 
                : "⚠️ Lead-to-case conversion rate has decreased. Review lead quality and intake process. ")}
            
            {Math.abs(trends.monthOverMonthChanges.cpa) > 15 && 
              (trends.monthOverMonthChanges.cpa > 0 
                ? "⚠️ Month-over-month acquisition costs have risen. Evaluate your campaign targeting and creative. " 
                : "✅ Month-over-month acquisition costs have decreased. Current strategy is improving efficiency. ")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
