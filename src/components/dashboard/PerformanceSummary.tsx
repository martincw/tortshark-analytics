
import React, { useMemo } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { BarChart, DollarSign, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";
import { BadgeStat } from "@/components/ui/badge-stat";

export function PerformanceSummary() {
  const { campaigns, selectedCampaignIds, dateRange } = useCampaign();
  
  const summaryData = useMemo(() => {
    // Filter campaigns based on selection
    const filteredCampaigns = selectedCampaignIds.length > 0
      ? campaigns.filter(camp => selectedCampaignIds.includes(camp.id))
      : campaigns;
    
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
    
    // Get date range for filtering
    const startDateStr = dateRange.startDate;
    const endDateStr = dateRange.endDate;
    
    // Calculate total stats within date range
    let totalLeads = 0;
    let totalCases = 0;
    let totalRevenue = 0;
    let totalAdSpend = 0;
    
    if (startDateStr && endDateStr) {
      // Create date objects with time set to start/end of day
      const startDate = startOfDay(new Date(startDateStr + "T12:00:00Z"));
      const endDate = endOfDay(new Date(endDateStr + "T12:00:00Z"));
      
      // Aggregate metrics across campaigns with date filtering
      filteredCampaigns.forEach(campaign => {
        // Filter statsHistory by date range
        const filteredStats = campaign.statsHistory.filter(stat => {
          const statDate = parseISO(stat.date);
          return isWithinInterval(statDate, { start: startDate, end: endDate });
        });
        
        // Sum up filtered stats
        totalLeads += filteredStats.reduce((sum, stat) => sum + stat.leads, 0);
        totalCases += filteredStats.reduce((sum, stat) => sum + stat.cases, 0);
        totalRevenue += filteredStats.reduce((sum, stat) => sum + stat.revenue, 0);
        totalAdSpend += filteredStats.reduce((sum, stat) => sum + (stat.adSpend || 0), 0);
      });
    } else {
      // If no date range, use summary stats
      filteredCampaigns.forEach(campaign => {
        totalLeads += campaign.manualStats.leads || 0;
        totalCases += campaign.manualStats.cases || 0;
        totalRevenue += campaign.manualStats.revenue || 0;
        totalAdSpend += campaign.stats.adSpend || 0;
      });
    }
    
    // Calculate derived metrics
    const totalProfit = totalRevenue - totalAdSpend;
    const costPerLead = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
    const costPerCase = totalCases > 0 ? totalAdSpend / totalCases : 0;
    const revenuePerCase = totalCases > 0 ? totalRevenue / totalCases : 0;
    const conversionRate = totalLeads > 0 ? (totalCases / totalLeads) * 100 : 0;
    const roi = totalAdSpend > 0 ? (totalProfit / totalAdSpend) * 100 : 0;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    return {
      adSpend: totalAdSpend,
      leads: totalLeads,
      cases: totalCases,
      revenue: totalRevenue,
      profit: totalProfit,
      costPerLead,
      costPerCase,
      revenuePerCase,
      conversionRate,
      roi,
      profitMargin
    };
  }, [campaigns, selectedCampaignIds, dateRange]);
  
  if (campaigns.length === 0) {
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
