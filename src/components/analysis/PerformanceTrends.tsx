
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign, TrendData, DateRange } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { format, subDays } from "date-fns";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  TooltipProps
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";
import { TrendingUp, TrendingDown, Target, ArrowRight, AlertCircle, Info } from "lucide-react";

interface PerformanceTrendsProps {
  campaign: Campaign;
}

export const PerformanceTrends: React.FC<PerformanceTrendsProps> = ({ campaign }) => {
  const { dateRange } = useCampaign();
  
  const metrics = useMemo(() => {
    return calculateMetrics(campaign, dateRange);
  }, [campaign, dateRange]);

  // Generate trend data from campaign history
  const trendData = useMemo(() => {
    if (!campaign.statsHistory || campaign.statsHistory.length === 0) {
      return [];
    }

    // Sort by date
    const sortedHistory = [...campaign.statsHistory].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Map to the trend data format and calculate metrics
    return sortedHistory.map(entry => {
      const date = format(new Date(entry.date), 'MMM d');
      const revenue = entry.revenue || 0;
      const adSpend = entry.adSpend || 0;
      const profit = revenue - adSpend;
      const roi = adSpend > 0 ? (profit / adSpend) * 100 : 0;
      const leads = entry.leads || 0;
      const cases = entry.cases || 0;
      const conversionRate = leads > 0 ? (cases / leads) * 100 : 0;

      return {
        date,
        rawDate: entry.date,
        revenue,
        adSpend,
        profit,
        roi,
        leads,
        cases,
        conversionRate,
        costPerLead: leads > 0 ? adSpend / leads : 0,
        costPerCase: cases > 0 ? adSpend / cases : 0,
      };
    });
  }, [campaign.statsHistory]);

  // Calculate performance change percentages
  const performanceChanges = useMemo(() => {
    if (trendData.length < 2) {
      return {
        revenue: 0,
        profit: 0,
        roi: 0,
        leads: 0,
        conversionRate: 0
      };
    }

    // Get the last two points to calculate the change
    const lastIndex = trendData.length - 1;
    const current = trendData[lastIndex];
    const previous = trendData[lastIndex - 1];

    return {
      revenue: previous.revenue > 0 
        ? ((current.revenue - previous.revenue) / previous.revenue) * 100 
        : 0,
      profit: previous.profit > 0 
        ? ((current.profit - previous.profit) / previous.profit) * 100 
        : 0,
      roi: previous.roi > 0 
        ? ((current.roi - previous.roi) / previous.roi) * 100 
        : 0,
      leads: previous.leads > 0 
        ? ((current.leads - previous.leads) / previous.leads) * 100 
        : 0,
      conversionRate: previous.conversionRate > 0 
        ? ((current.conversionRate - previous.conversionRate) / previous.conversionRate) * 100 
        : 0
    };
  }, [trendData]);

  // Detect anomalies in the data
  const anomalies = useMemo(() => {
    if (trendData.length < 3) {
      return [];
    }

    const result = [];
    
    // Simple anomaly detection: look for values that are significantly different from the average
    const metrics = ['revenue', 'adSpend', 'leads', 'cases', 'conversionRate'];
    
    metrics.forEach(metric => {
      const values = trendData.map(item => item[metric as keyof typeof item] as number);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);
      
      // Threshold for anomaly: 2 standard deviations from the mean
      const threshold = 2;
      
      trendData.forEach((item, index) => {
        const value = item[metric as keyof typeof item] as number;
        const zscore = Math.abs(value - avg) / (stdDev || 1); // Avoid division by zero
        
        if (zscore > threshold) {
          result.push({
            date: item.date,
            metric,
            value,
            zscore,
            avg,
            message: `Unusual ${metric} value on ${item.date}`
          });
        }
      });
    });

    return result.slice(0, 2); // Limit to top 2 anomalies
  }, [trendData]);

  const getTrendIcon = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="h-4 w-4 text-success-DEFAULT" />;
    }
    if (value < 0) {
      return <TrendingDown className="h-4 w-4 text-error-DEFAULT" />;
    }
    return null;
  };

  const getTrendClass = (value: number) => {
    if (value > 0) {
      return "text-success-DEFAULT";
    }
    if (value < 0) {
      return "text-error-DEFAULT";
    }
    return "";
  };

  // Custom tooltip formatter that uses our consistent formatting utilities
  const tooltipFormatter = (value: number, name: string) => {
    switch (name) {
      case 'revenue':
      case 'adSpend':
      case 'profit':
      case 'costPerLead':
      case 'costPerCase':
        return [formatCurrency(value), name];
      case 'roi':
      case 'conversionRate':
        return [formatPercent(value), name];
      default:
        return [formatNumber(value), name];
    }
  };

  return (
    <div className="space-y-6">
      {/* Key metrics summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard 
          title="Revenue" 
          value={formatCurrency(metrics.revenue || 0)} 
          trend={performanceChanges.revenue} 
        />
        <MetricCard 
          title="Profit" 
          value={formatCurrency(metrics.profit)} 
          trend={performanceChanges.profit} 
        />
        <MetricCard 
          title="ROI" 
          value={formatPercent(metrics.roi)} 
          trend={performanceChanges.roi} 
        />
        <MetricCard 
          title="Leads" 
          value={formatNumber(metrics.leads || 0)} 
          trend={performanceChanges.leads} 
        />
        <MetricCard 
          title="Lead to Case %" 
          value={formatPercent((metrics.cases || 0) > 0 && (metrics.leads || 0) > 0 ? 
            ((metrics.cases || 0) / (metrics.leads || 0)) * 100 : 0)} 
          trend={performanceChanges.conversionRate} 
        />
      </div>

      {/* Revenue vs Cost Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs. Ad Spend Trend</CardTitle>
          <CardDescription>
            Comparing revenue earned against ad spend over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="colorAdSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip
                    formatter={tooltipFormatter}
                    labelFormatter={(value) => `Date: ${value}`}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#8884d8"
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                  <Area
                    type="monotone"
                    dataKey="adSpend"
                    name="Ad Spend"
                    stroke="#82ca9d"
                    fillOpacity={1}
                    fill="url(#colorAdSpend)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No trend data available for the selected date range.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversion Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Conversion Metrics</CardTitle>
          <CardDescription>
            Leads, cases, and conversion rate over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left" 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={tooltipFormatter}
                    labelFormatter={(value) => `Date: ${value}`}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="leads" 
                    name="Leads" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="cases" 
                    name="Cases" 
                    stroke="#82ca9d" 
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="conversionRate" 
                    name="Conversion Rate (%)" 
                    stroke="#ffc658" 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No trend data available for the selected date range.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Anomaly Detection */}
      {anomalies.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Anomaly Detection
            </CardTitle>
            <CardDescription>
              Unusual patterns detected in your campaign data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {anomalies.map((anomaly, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg shadow-sm">
                  <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium">
                      {anomaly.metric.charAt(0).toUpperCase() + anomaly.metric.slice(1)} anomaly detected
                    </h4>
                    <p className="text-sm text-muted-foreground">{anomaly.message}</p>
                    <div className="flex gap-2 items-center mt-1">
                      <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30">
                        {typeof anomaly.value === 'number' && anomaly.metric.includes('rate') 
                          ? formatPercent(anomaly.value) 
                          : anomaly.metric.includes('spend') || anomaly.metric.includes('revenue')
                            ? formatCurrency(anomaly.value) 
                            : formatNumber(anomaly.value)}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Average: {
                        typeof anomaly.avg === 'number' && anomaly.metric.includes('rate') 
                          ? formatPercent(anomaly.avg) 
                          : anomaly.metric.includes('spend') || anomaly.metric.includes('revenue')
                            ? formatCurrency(anomaly.avg) 
                            : formatNumber(anomaly.avg)
                      }</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend }) => {
  const trendDisplay = Math.abs(trend).toFixed(1);
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  const isNeutral = trend === 0;
  
  return (
    <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
      <span className="text-sm text-muted-foreground block mb-1">{title}</span>
      <span className="text-xl font-semibold">{value}</span>
      {!isNeutral && (
        <div className="flex items-center mt-1 gap-1 text-sm">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-success-DEFAULT" />
          ) : (
            <TrendingDown className="h-3 w-3 text-error-DEFAULT" />
          )}
          <span className={isPositive ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
            {trendDisplay}%
          </span>
        </div>
      )}
    </div>
  );
};
