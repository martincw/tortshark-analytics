import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { format } from "date-fns";
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
  TooltipProps
} from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isDateInRange, parseStoredDate, standardizeDateString } from "@/lib/utils/ManualDateUtils";
import { TrendingUp, TrendingDown, Eye, EyeOff } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface EnhancedPerformanceTrendsProps {
  campaign: Campaign;
}

interface DayData {
  date: string;
  rawDate: string;
  leads: number;
  cases: number;
  revenue: number;
  adSpend: number;
  cpl: number; // Cost Per Lead
  epl: number; // Earnings Per Lead
  conversionRate: number;
  roas: number; // Return on Ad Spend
  profitMargin: number;
  costPerCase: number;
  revenuePerCase: number;
  profit: number;
}

interface MetricToggle {
  key: keyof DayData;
  label: string;
  color: string;
  yAxis: 'left' | 'right';
  formatter: (value: number) => string;
  enabled: boolean;
}

export const EnhancedPerformanceTrends: React.FC<EnhancedPerformanceTrendsProps> = ({ campaign }) => {
  const { dateRange } = useCampaign();
  
  // Metric toggles state
  const [metricToggles, setMetricToggles] = useState<MetricToggle[]>([
    { key: 'cpl', label: 'Cost Per Lead', color: '#ef4444', yAxis: 'left', formatter: formatCurrency, enabled: true },
    { key: 'epl', label: 'Earnings Per Lead', color: '#10b981', yAxis: 'left', formatter: formatCurrency, enabled: true },
    { key: 'conversionRate', label: 'Conversion Rate', color: '#f59e0b', yAxis: 'right', formatter: (v) => formatPercent(v), enabled: true },
    { key: 'roas', label: 'ROAS', color: '#8b5cf6', yAxis: 'right', formatter: (v) => formatPercent(v), enabled: false },
    { key: 'profitMargin', label: 'Profit Margin', color: '#06b6d4', yAxis: 'right', formatter: (v) => formatPercent(v), enabled: false },
    { key: 'leads', label: 'Daily Leads', color: '#6366f1', yAxis: 'left', formatter: formatNumber, enabled: false },
  ]);

  const toggleMetric = (index: number) => {
    setMetricToggles(prev => 
      prev.map((toggle, i) => 
        i === index ? { ...toggle, enabled: !toggle.enabled } : toggle
      )
    );
  };

  // Generate trend data from campaign history
  const trendData = useMemo((): DayData[] => {
    if (!campaign.statsHistory || campaign.statsHistory.length === 0) {
      return [];
    }

    // Filter stats by date range
    const filteredStats = campaign.statsHistory.filter(entry => {
      if (!dateRange.startDate || !dateRange.endDate) return true;
      return isDateInRange(entry.date, dateRange.startDate, dateRange.endDate);
    });

    // Sort by date
    const sortedHistory = [...filteredStats].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Map to the trend data format and calculate metrics
    return sortedHistory.map(entry => {
      const date = format(parseStoredDate(standardizeDateString(entry.date)), 'MMM d');
      const leads = entry.leads || 0;
      const cases = entry.cases || 0;
      const revenue = entry.revenue || 0;
      const adSpend = entry.adSpend || 0;
      const profit = revenue - adSpend;
      
      // Calculate key metrics
      const cpl = leads > 0 ? adSpend / leads : 0;
      const epl = leads > 0 ? revenue / leads : 0;
      const conversionRate = leads > 0 ? (cases / leads) * 100 : 0;
      const roas = adSpend > 0 ? (revenue / adSpend) * 100 : 0;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
      const costPerCase = cases > 0 ? adSpend / cases : 0;
      const revenuePerCase = cases > 0 ? revenue / cases : 0;

      return {
        date,
        rawDate: entry.date,
        leads,
        cases,
        revenue,
        adSpend,
        cpl,
        epl,
        conversionRate,
        roas,
        profitMargin,
        costPerCase,
        revenuePerCase,
        profit,
      };
    });
  }, [campaign.statsHistory, dateRange]);

  // Calculate summary metrics for the selected period
  const summaryMetrics = useMemo(() => {
    if (trendData.length === 0) {
      return {
        avgCpl: 0,
        avgEpl: 0,
        avgConversionRate: 0,
        avgRoas: 0,
        avgProfitMargin: 0,
        totalLeads: 0,
        totalCases: 0,
        totalRevenue: 0,
        totalAdSpend: 0,
      };
    }

    const totals = trendData.reduce((acc, day) => ({
      leads: acc.leads + day.leads,
      cases: acc.cases + day.cases,
      revenue: acc.revenue + day.revenue,
      adSpend: acc.adSpend + day.adSpend,
    }), { leads: 0, cases: 0, revenue: 0, adSpend: 0 });

    // Calculate weighted averages
    const avgCpl = totals.leads > 0 ? totals.adSpend / totals.leads : 0;
    const avgEpl = totals.leads > 0 ? totals.revenue / totals.leads : 0;
    const avgConversionRate = totals.leads > 0 ? (totals.cases / totals.leads) * 100 : 0;
    const avgRoas = totals.adSpend > 0 ? (totals.revenue / totals.adSpend) * 100 : 0;
    const avgProfitMargin = totals.revenue > 0 ? ((totals.revenue - totals.adSpend) / totals.revenue) * 100 : 0;

    return {
      avgCpl,
      avgEpl,
      avgConversionRate,
      avgRoas,
      avgProfitMargin,
      totalLeads: totals.leads,
      totalCases: totals.cases,
      totalRevenue: totals.revenue,
      totalAdSpend: totals.adSpend,
    };
  }, [trendData]);

  // Calculate performance trends (comparing latest vs average)
  const performanceTrends = useMemo(() => {
    if (trendData.length < 2) {
      return {
        cplTrend: 0,
        eplTrend: 0,
        conversionTrend: 0,
        roasTrend: 0,
      };
    }

    const latest = trendData[trendData.length - 1];
    const previous = trendData[trendData.length - 2];

    return {
      cplTrend: previous.cpl > 0 ? ((latest.cpl - previous.cpl) / previous.cpl) * 100 : 0,
      eplTrend: previous.epl > 0 ? ((latest.epl - previous.epl) / previous.epl) * 100 : 0,
      conversionTrend: previous.conversionRate > 0 ? ((latest.conversionRate - previous.conversionRate) / previous.conversionRate) * 100 : 0,
      roasTrend: previous.roas > 0 ? ((latest.roas - previous.roas) / previous.roas) * 100 : 0,
    };
  }, [trendData]);

  const enabledMetrics = metricToggles.filter(m => m.enabled);

  const customTooltip = (props: TooltipProps<number, string>) => {
    const { active, payload, label } = props;
    
    if (!active || !payload || !payload.length) {
      return null;
    }

    const data = payload[0]?.payload as DayData;
    
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
        <p className="font-medium mb-2">{label}</p>
        <div className="space-y-1">
          {enabledMetrics.map(metric => {
            const value = data[metric.key] as number;
            return (
              <div key={metric.key} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: metric.color }}
                  />
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                </div>
                <span className="text-sm font-medium">{metric.formatter(value)}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricSummaryCard 
          title="Avg Cost/Lead" 
          value={formatCurrency(summaryMetrics.avgCpl)} 
          trend={performanceTrends.cplTrend}
          isGoodWhenDown={true}
        />
        <MetricSummaryCard 
          title="Avg Earnings/Lead" 
          value={formatCurrency(summaryMetrics.avgEpl)} 
          trend={performanceTrends.eplTrend}
          isGoodWhenDown={false}
        />
        <MetricSummaryCard 
          title="Avg Conversion %" 
          value={formatPercent(summaryMetrics.avgConversionRate)} 
          trend={performanceTrends.conversionTrend}
          isGoodWhenDown={false}
        />
        <MetricSummaryCard 
          title="Avg ROAS" 
          value={formatPercent(summaryMetrics.avgRoas)} 
          trend={performanceTrends.roasTrend}
          isGoodWhenDown={false}
        />
        <MetricSummaryCard 
          title="Profit Margin" 
          value={formatPercent(summaryMetrics.avgProfitMargin)} 
          trend={0}
          isGoodWhenDown={false}
        />
      </div>

      {/* Metric Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
          <CardDescription>
            Toggle metrics to customize your view and analyze trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            {metricToggles.map((toggle, index) => (
              <div key={toggle.key} className="flex items-center space-x-2">
                <Switch
                  id={`metric-${toggle.key}`}
                  checked={toggle.enabled}
                  onCheckedChange={() => toggleMetric(index)}
                />
                <Label 
                  htmlFor={`metric-${toggle.key}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: toggle.color }}
                  />
                  {toggle.label}
                </Label>
              </div>
            ))}
          </div>

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
                    tickFormatter={(value) => {
                      const leftMetrics = enabledMetrics.filter(m => m.yAxis === 'left');
                      if (leftMetrics.some(m => ['cpl', 'epl', 'revenue', 'adSpend', 'costPerCase', 'revenuePerCase'].includes(m.key))) {
                        return formatCurrency(value);
                      }
                      return formatNumber(value);
                    }}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tickFormatter={(value) => formatPercent(value)}
                  />
                  <Tooltip content={customTooltip} />
                  <Legend />
                  {enabledMetrics.map(metric => (
                    <Line
                      key={metric.key}
                      yAxisId={metric.yAxis}
                      type="monotone"
                      dataKey={metric.key}
                      name={metric.label}
                      stroke={metric.color}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
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
    </div>
  );
};

interface MetricSummaryCardProps {
  title: string;
  value: string;
  trend: number;
  isGoodWhenDown: boolean;
}

const MetricSummaryCard: React.FC<MetricSummaryCardProps> = ({ title, value, trend, isGoodWhenDown }) => {
  const trendDisplay = Math.abs(trend).toFixed(1);
  const isPositiveTrend = trend > 0;
  const isGoodTrend = isGoodWhenDown ? !isPositiveTrend : isPositiveTrend;
  const isNeutral = trend === 0;
  
  return (
    <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
      <span className="text-sm text-muted-foreground block mb-1">{title}</span>
      <span className="text-xl font-semibold">{value}</span>
      {!isNeutral && (
        <div className="flex items-center mt-1 gap-1 text-sm">
          {isPositiveTrend ? (
            <TrendingUp className={`h-3 w-3 ${isGoodTrend ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`} />
          ) : (
            <TrendingDown className={`h-3 w-3 ${isGoodTrend ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`} />
          )}
          <span className={isGoodTrend ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
            {trendDisplay}%
          </span>
        </div>
      )}
    </div>
  );
};