import React, { useMemo } from "react";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { BarChart, DollarSign, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BadgeStat } from "@/components/ui/badge-stat";
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";

interface PerformanceSummaryProps {
  filteredCampaigns: Campaign[];
}

export function PerformanceSummary({ filteredCampaigns }: PerformanceSummaryProps) {
  const { dateRange } = useCampaign();

  const summaryData = useMemo(() => {
    if (filteredCampaigns.length === 0) {
      return {
        adSpend: 0,
        leads: 0,
        cases: 0,
        revenue: 0,
        profit: 0,
        costPerLead: 0,
        costPerCase: 0,
        revenuePerCase: 0,
        conversionRate: 0,
        roi: 0,
        profitMargin: 0
      };
    }
    
    console.log('PerformanceSummary - Calculating metrics for', filteredCampaigns.length, 'campaigns with date range:', dateRange);
    
    // Calculate metrics for each campaign using the date range
    const campaignsMetrics = filteredCampaigns.map(campaign => calculateMetrics(campaign, dateRange));
    
    // Aggregate metrics across all campaigns
    const totals = campaignsMetrics.reduce((acc, metrics) => ({
      leads: acc.leads + (metrics.leads || 0),
      cases: acc.cases + (metrics.cases || 0),
      revenue: acc.revenue + (metrics.revenue || 0),
      adSpend: acc.adSpend + (metrics.adSpend || 0),
      profit: acc.profit + metrics.profit
    }), { leads: 0, cases: 0, revenue: 0, adSpend: 0, profit: 0 });
    
    console.log('PerformanceSummary - Aggregated totals:', totals);
    
    // Calculate derived metrics
    const costPerLead = totals.leads > 0 ? totals.adSpend / totals.leads : 0;
    const costPerCase = totals.cases > 0 ? totals.adSpend / totals.cases : 0;
    const revenuePerCase = totals.cases > 0 ? totals.revenue / totals.cases : 0;
    const conversionRate = totals.leads > 0 ? (totals.cases / totals.leads) * 100 : 0;
    const roi = totals.adSpend > 0 ? (totals.profit / totals.adSpend) * 100 : 0;
    const profitMargin = totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
    
    return {
      ...totals,
      costPerLead,
      costPerCase,
      revenuePerCase,
      conversionRate,
      roi,
      profitMargin
    };
  }, [filteredCampaigns, dateRange]);

  if (filteredCampaigns.length === 0) {
    return null;
  }

  return (
    <Card className="shadow-md border-accent/30 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <BarChart className="h-5 w-5 text-primary" />
          Performance Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
            <span className="text-sm text-muted-foreground block mb-1">Ad Spend</span>
            <span className="text-xl font-semibold">{formatCurrency(summaryData.adSpend)}</span>
          </div>
          <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
            <span className="text-sm text-muted-foreground block mb-1">Revenue</span>
            <span className="text-xl font-semibold">{formatCurrency(summaryData.revenue)}</span>
          </div>
          <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
            <span className="text-sm text-muted-foreground block mb-1">Profit</span>
            <span className={cn(
              "text-xl font-semibold",
              summaryData.profit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"
            )}>
              {formatCurrency(summaryData.profit)}
            </span>
          </div>
          <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
            <span className="text-sm text-muted-foreground block mb-1">ROI</span>
            <span className={cn(
              "text-xl font-semibold",
              summaryData.roi > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"
            )}>
              {formatPercent(summaryData.roi)}
            </span>
          </div>
          <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
            <span className="text-sm text-muted-foreground block mb-1">Leads</span>
            <span className="text-xl font-semibold">{formatNumber(summaryData.leads)}</span>
          </div>
          <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
            <span className="text-sm text-muted-foreground block mb-1">Cases</span>
            <span className="text-xl font-semibold">{formatNumber(summaryData.cases)}</span>
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Key Metrics</h4>
          <div className="grid grid-cols-3 gap-4">
            <BadgeStat
              label="Cost Per Lead"
              value={formatCurrency(summaryData.costPerLead)}
              className="bg-background/50"
            />
            <BadgeStat
              label="Cost Per Case"
              value={formatCurrency(summaryData.costPerCase)}
              className="bg-background/50"
            />
            <BadgeStat
              label="Revenue Per Case"
              value={formatCurrency(summaryData.revenuePerCase)}
              className="bg-background/50"
            />
            <BadgeStat
              label="Lead to Case %"
              value={formatPercent(summaryData.conversionRate)}
              className="bg-background/50"
            />
            <BadgeStat
              label="ROI"
              value={formatPercent(summaryData.roi)}
              className="bg-background/50"
            />
            <BadgeStat
              label="Profit Margin"
              value={formatPercent(summaryData.profitMargin)}
              className="bg-background/50"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
