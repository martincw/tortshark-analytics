import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Campaign } from "@/types/campaign";
import { format, parseISO, isWithinInterval } from "date-fns";
import { formatCurrency } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DailyRevenueChartProps {
  campaigns: Campaign[];
}

type MetricType = "revenue" | "adSpend" | "profit";

export const DailyRevenueChart = ({ campaigns }: DailyRevenueChartProps) => {
  const { dateRange } = useCampaign();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("revenue");

  const chartData = useMemo(() => {
    // Aggregate metrics by date across all campaigns
    const metricsByDate = new Map<string, { revenue: number; adSpend: number; profit: number }>();

    campaigns.forEach(campaign => {
      campaign.statsHistory.forEach(stat => {
        const statDate = parseISO(stat.date);
        
        // Filter by date range if provided
        if (dateRange?.startDate && dateRange?.endDate) {
          const isInRange = isWithinInterval(statDate, {
            start: parseISO(dateRange.startDate),
            end: parseISO(dateRange.endDate)
          });
          if (!isInRange) return;
        }
        
        const dateStr = format(statDate, "yyyy-MM-dd");
        const current = metricsByDate.get(dateStr) || { revenue: 0, adSpend: 0, profit: 0 };
        const revenue = stat.revenue || 0;
        const adSpend = stat.adSpend || 0;
        
        metricsByDate.set(dateStr, {
          revenue: current.revenue + revenue,
          adSpend: current.adSpend + adSpend,
          profit: current.profit + (revenue - adSpend)
        });
      });
    });

    // Convert to array and sort by date
    const data = Array.from(metricsByDate.entries())
      .map(([date, metrics]) => ({
        date,
        revenue: metrics.revenue,
        adSpend: metrics.adSpend,
        profit: metrics.profit,
        formattedDate: format(parseISO(date), "MMM dd")
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return data;
  }, [campaigns, dateRange]);

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, day) => ({
        revenue: acc.revenue + day.revenue,
        adSpend: acc.adSpend + day.adSpend,
        profit: acc.profit + day.profit
      }),
      { revenue: 0, adSpend: 0, profit: 0 }
    );
  }, [chartData]);

  const averages = useMemo(() => {
    const count = chartData.length || 1;
    return {
      revenue: totals.revenue / count,
      adSpend: totals.adSpend / count,
      profit: totals.profit / count
    };
  }, [totals, chartData.length]);

  const metricConfig = {
    revenue: {
      title: "Daily Revenue Trend",
      description: "Revenue performance over the selected date range",
      dataKey: "revenue",
      label: "Revenue",
      color: "hsl(var(--primary))",
      total: totals.revenue,
      average: averages.revenue
    },
    adSpend: {
      title: "Daily Ad Spend Trend",
      description: "Ad spend over the selected date range",
      dataKey: "adSpend",
      label: "Ad Spend",
      color: "hsl(var(--destructive))",
      total: totals.adSpend,
      average: averages.adSpend
    },
    profit: {
      title: "Daily Profit Trend",
      description: "Profit (revenue - ad spend) over the selected date range",
      dataKey: "profit",
      label: "Profit",
      color: "hsl(var(--chart-2))",
      total: totals.profit,
      average: averages.profit
    }
  };

  const currentConfig = metricConfig[selectedMetric];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between mb-4">
          <div>
            <CardTitle>{currentConfig.title}</CardTitle>
            <CardDescription>{currentConfig.description}</CardDescription>
          </div>
          <Tabs value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
            <TabsList>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="adSpend">Ad Spend</TabsTrigger>
              <TabsTrigger value="profit">Profit</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-muted-foreground">Total {currentConfig.label}</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(currentConfig.total)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Daily Average</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(currentConfig.average)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Days</p>
            <p className="text-2xl font-bold text-foreground">{chartData.length}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            No revenue data available for the selected date range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="formattedDate" 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                className="text-xs"
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                  color: "hsl(var(--popover-foreground))"
                }}
                formatter={(value: number) => [formatCurrency(value), currentConfig.label]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey={currentConfig.dataKey} 
                stroke={currentConfig.color} 
                strokeWidth={2}
                dot={{ fill: currentConfig.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
