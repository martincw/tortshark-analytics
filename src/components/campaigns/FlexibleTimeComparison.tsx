
import React, { useState } from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPeriodPresets, getComparisonData, getTrendColor, getTrendIcon, ComparisonPeriod } from "@/utils/timeComparisonUtils";
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

  const renderTrendIcon = (change: number, size = "h-4 w-4") => {
    if (change > 5) return <TrendingUp className={cn(size, "text-success-DEFAULT")} />;
    if (change < -5) return <TrendingDown className={cn(size, "text-error-DEFAULT")} />;
    return <Minus className={cn(size, "text-muted-foreground")} />;
  };

  const MetricCard = ({ 
    label, 
    baseValue, 
    compareValue, 
    change, 
    formatValue, 
    isInverted = false 
  }: {
    label: string;
    baseValue: number;
    compareValue: number;
    change: number;
    formatValue: (value: number) => string;
    isInverted?: boolean;
  }) => {
    const displayChange = isInverted ? -change : change;
    
    return (
      <Card className="border-accent/30">
        <CardContent className="p-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">{label}</h4>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-semibold">{formatValue(baseValue)}</span>
              <div className="flex items-center gap-1 text-sm">
                {renderTrendIcon(displayChange, "h-3 w-3")}
                <span className={getTrendColor(displayChange)}>
                  {Math.abs(displayChange).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              vs {formatValue(compareValue)} ({comparePeriod.label})
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="shadow-md border-accent/30">
      <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3">
        <CardTitle className="text-lg font-medium">Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Period Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Base Period</label>
            <Select value={basePeriod.label} onValueChange={handleBasePeriodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              {basePeriod.startDate} to {basePeriod.endDate}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Compare To</label>
            <Select value={comparePeriod.label} onValueChange={handleComparePeriodChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((preset) => (
                  <SelectItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">
              {comparePeriod.startDate} to {comparePeriod.endDate}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Ad Spend"
            baseValue={comparisonData.baseStats.adSpend}
            compareValue={comparisonData.compareStats.adSpend}
            change={comparisonData.changes.adSpend}
            formatValue={formatCurrency}
          />
          
          <MetricCard
            label="Leads"
            baseValue={comparisonData.baseStats.leads}
            compareValue={comparisonData.compareStats.leads}
            change={comparisonData.changes.leads}
            formatValue={formatNumber}
          />
          
          <MetricCard
            label="Cases"
            baseValue={comparisonData.baseStats.cases}
            compareValue={comparisonData.compareStats.cases}
            change={comparisonData.changes.cases}
            formatValue={formatNumber}
          />
          
          <MetricCard
            label="Revenue"
            baseValue={comparisonData.baseStats.revenue}
            compareValue={comparisonData.compareStats.revenue}
            change={comparisonData.changes.revenue}
            formatValue={formatCurrency}
          />
          
          <MetricCard
            label="Cost Per Lead"
            baseValue={comparisonData.baseStats.cpl}
            compareValue={comparisonData.compareStats.cpl}
            change={comparisonData.changes.cpl}
            formatValue={formatCurrency}
            isInverted={true}
          />
          
          <MetricCard
            label="Earnings Per Lead"
            baseValue={comparisonData.baseStats.epl}
            compareValue={comparisonData.compareStats.epl}
            change={comparisonData.changes.epl}
            formatValue={formatCurrency}
          />
          
          <MetricCard
            label="Profit"
            baseValue={comparisonData.baseStats.profit}
            compareValue={comparisonData.compareStats.profit}
            change={comparisonData.changes.profit}
            formatValue={formatCurrency}
          />
          
          <MetricCard
            label="ROI"
            baseValue={comparisonData.baseStats.roi}
            compareValue={comparisonData.compareStats.roi}
            change={comparisonData.changes.roi}
            formatValue={formatPercent}
          />
        </div>
      </CardContent>
    </Card>
  );
}
