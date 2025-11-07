import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Campaign } from "@/types/campaign";
import { format, parseISO, isWithinInterval } from "date-fns";
import { formatCurrency } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";

interface DailyRevenueChartProps {
  campaigns: Campaign[];
}

export const DailyRevenueChart = ({ campaigns }: DailyRevenueChartProps) => {
  const { dateRange } = useCampaign();

  const chartData = useMemo(() => {
    // Aggregate revenue by date across all campaigns
    const revenueByDate = new Map<string, number>();

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
        const currentRevenue = revenueByDate.get(dateStr) || 0;
        revenueByDate.set(dateStr, currentRevenue + (stat.revenue || 0));
      });
    });

    // Convert to array and sort by date
    const data = Array.from(revenueByDate.entries())
      .map(([date, revenue]) => ({
        date,
        revenue,
        formattedDate: format(parseISO(date), "MMM dd")
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return data;
  }, [campaigns, dateRange]);

  const totalRevenue = useMemo(() => {
    return chartData.reduce((sum, day) => sum + day.revenue, 0);
  }, [chartData]);

  const averageDailyRevenue = useMemo(() => {
    return chartData.length > 0 ? totalRevenue / chartData.length : 0;
  }, [totalRevenue, chartData.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Revenue Trend</CardTitle>
        <CardDescription>
          Revenue performance over the selected date range
        </CardDescription>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Daily Average</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(averageDailyRevenue)}</p>
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
                formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};
