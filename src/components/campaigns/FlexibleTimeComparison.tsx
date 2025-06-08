
import React, { useState } from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPeriodPresets, getComparisonData, ComparisonPeriod } from "@/utils/timeComparisonUtils";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlexibleTimeComparisonProps {
  campaign: Campaign;
}

export function FlexibleTimeComparison({ campaign }: FlexibleTimeComparisonProps) {
  const presets = getPeriodPresets();
  const [basePeriod, setBasePeriod] = useState<ComparisonPeriod>(presets[0]); // This Week
  const [comparePeriod, setComparePeriod] = useState<ComparisonPeriod>(presets[1]); // Last Week
  
  const comparisonData = getComparisonData(campaign, basePeriod, comparePeriod);
  
  const handleBasePeriodChange = (value: string) => {
    const selected = presets.find(p => p.label === value);
    if (selected) setBasePeriod(selected);
  };
  
  const handleComparePeriodChange = (value: string) => {
    const selected = presets.find(p => p.label === value);
    if (selected) setComparePeriod(selected);
  };

  const renderTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-success-DEFAULT" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-error-DEFAULT" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getTrendColor = (change: number, isInverted = false) => {
    const actualChange = isInverted ? -change : change;
    if (actualChange > 0) return "text-success-DEFAULT";
    if (actualChange < 0) return "text-error-DEFAULT";
    return "text-muted-foreground";
  };

  const formatChange = (change: number, isInverted = false) => {
    const displayChange = isInverted ? -change : change;
    const sign = displayChange > 0 ? "+" : "";
    return `${sign}${displayChange.toFixed(1)}%`;
  };

  const metrics = [
    {
      label: "Ad Spend",
      key: "adSpend" as keyof typeof comparisonData.baseStats,
      formatter: formatCurrency,
      isInverted: false,
      colorClass: "text-metric-cost-DEFAULT"
    },
    {
      label: "Leads",
      key: "leads" as keyof typeof comparisonData.baseStats,
      formatter: formatNumber,
      isInverted: false,
      colorClass: "text-metric-volume-DEFAULT"
    },
    {
      label: "Cases",
      key: "cases" as keyof typeof comparisonData.baseStats,
      formatter: formatNumber,
      isInverted: false,
      colorClass: "text-metric-volume-DEFAULT"
    },
    {
      label: "Close Rate",
      key: "closeRate" as keyof typeof comparisonData.baseStats,
      formatter: (value: number) => `${value.toFixed(1)}%`,
      isInverted: false,
      colorClass: "text-metric-rate-DEFAULT"
    },
    {
      label: "Revenue",
      key: "revenue" as keyof typeof comparisonData.baseStats,
      formatter: formatCurrency,
      isInverted: false,
      colorClass: "text-metric-revenue-DEFAULT"
    },
    {
      label: "Cost Per Lead",
      key: "cpl" as keyof typeof comparisonData.baseStats,
      formatter: formatCurrency,
      isInverted: true,
      colorClass: "text-metric-cost-DEFAULT"
    },
    {
      label: "Earnings Per Lead",
      key: "epl" as keyof typeof comparisonData.baseStats,
      formatter: formatCurrency,
      isInverted: false,
      colorClass: "text-metric-revenue-DEFAULT"
    },
    {
      label: "Profit",
      key: "profit" as keyof typeof comparisonData.baseStats,
      formatter: formatCurrency,
      isInverted: false,
      colorClass: "text-metric-profit-DEFAULT"
    },
    {
      label: "ROI",
      key: "roi" as keyof typeof comparisonData.baseStats,
      formatter: formatPercent,
      isInverted: false,
      colorClass: "text-metric-performance-DEFAULT"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Period Selectors */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-foreground">Performance Comparison</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Base Period</label>
                <Select value={basePeriod.label} onValueChange={handleBasePeriodChange}>
                  <SelectTrigger className="h-11 bg-background border-border/50 hover:border-border transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border/50">
                    {presets.map((preset) => (
                      <SelectItem key={preset.label} value={preset.label} className="focus:bg-accent/50">
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground font-mono">
                  {basePeriod.startDate} to {basePeriod.endDate}
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Compare To</label>
                <Select value={comparePeriod.label} onValueChange={handleComparePeriodChange}>
                  <SelectTrigger className="h-11 bg-background border-border/50 hover:border-border transition-colors">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border/50">
                    {presets.map((preset) => (
                      <SelectItem key={preset.label} value={preset.label} className="focus:bg-accent/50">
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground font-mono">
                  {comparePeriod.startDate} to {comparePeriod.endDate}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const baseValue = comparisonData.baseStats[metric.key];
          const compareValue = comparisonData.compareStats[metric.key];
          const change = comparisonData.changes[metric.key];
          
          return (
            <Card key={metric.key} className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", metric.colorClass.replace('text-', 'bg-'))} />
                      <h3 className="font-medium text-foreground">{metric.label}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderTrendIcon(metric.isInverted ? -change : change)}
                      <span className={cn("text-sm font-medium", getTrendColor(change, metric.isInverted))}>
                        {formatChange(change, metric.isInverted)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{basePeriod.label}</div>
                      <div className="text-2xl font-bold text-foreground">
                        {metric.formatter(baseValue as number)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">{comparePeriod.label}</div>
                      <div className="text-lg text-muted-foreground">
                        {metric.formatter(compareValue as number)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
