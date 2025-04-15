
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { Campaign } from "@/types/campaign";

interface DailyAveragesSectionProps {
  filteredCampaigns: Campaign[];
}

export function DailyAveragesSection({ filteredCampaigns }: DailyAveragesSectionProps) {
  console.log(`DailyAveragesSection received ${filteredCampaigns.length} filtered campaigns`);
  
  const averages = useMemo(() => {
    if (filteredCampaigns.length === 0) {
      return {
        adSpend: 0,
        leads: 0,
        cases: 0,
        revenue: 0,
        profit: 0,
        roi: 0,
        daysInRange: 1 // Prevent division by zero
      };
    }
    
    // Calculate aggregated metrics
    let totalAdSpend = 0;
    let totalLeads = 0;
    let totalCases = 0;
    let totalRevenue = 0;
    
    filteredCampaigns.forEach(campaign => {
      totalAdSpend += campaign.stats.adSpend || 0;
      totalLeads += campaign.manualStats.leads || 0;
      totalCases += campaign.manualStats.cases || 0;
      totalRevenue += campaign.manualStats.revenue || 0;
    });
    
    // Assuming the filtered data represents the date range
    // If only one campaign, default to 1 day range
    const daysInRange = 1; // Fixed for daily average
    
    // Calculate daily averages
    const dailyAdSpend = totalAdSpend / daysInRange;
    const dailyLeads = totalLeads / daysInRange;
    const dailyCases = totalCases / daysInRange;
    const dailyRevenue = totalRevenue / daysInRange;
    const dailyProfit = dailyRevenue - dailyAdSpend;
    const roi = dailyAdSpend > 0 ? (dailyProfit / dailyAdSpend) * 100 : 0;
    
    return {
      adSpend: dailyAdSpend,
      leads: dailyLeads,
      cases: dailyCases,
      revenue: dailyRevenue,
      profit: dailyProfit,
      roi,
      daysInRange
    };
  }, [filteredCampaigns]);
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-md font-medium flex items-center gap-2">
          <BarChart className="h-5 w-5 text-primary" />
          Daily Performance Averages
        </CardTitle>
        <div className="text-xs text-muted-foreground">
          {averages.daysInRange > 1 
            ? `Averaged across ${averages.daysInRange} days` 
            : "Daily performance metrics"}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-accent/5 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-xs text-muted-foreground">Daily Ad Spend</span>
            <span className="text-lg font-semibold">{formatCurrency(averages.adSpend)}</span>
          </div>
          
          <div className="bg-accent/5 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-xs text-muted-foreground">Daily Leads</span>
            <span className="text-lg font-semibold">{formatNumber(averages.leads)}</span>
          </div>
          
          <div className="bg-accent/5 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-xs text-muted-foreground">Daily Cases</span>
            <span className="text-lg font-semibold">{formatNumber(averages.cases)}</span>
          </div>
          
          <div className="bg-accent/5 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-xs text-muted-foreground">Daily Revenue</span>
            <span className="text-lg font-semibold">{formatCurrency(averages.revenue)}</span>
          </div>
          
          <div className="bg-accent/5 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-xs text-muted-foreground">Daily Profit</span>
            <span className={cn(
              "text-lg font-semibold",
              averages.profit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"
            )}>
              {formatCurrency(averages.profit)}
            </span>
          </div>
          
          <div className="bg-accent/5 rounded-lg p-4 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-xs text-muted-foreground flex items-center justify-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              Daily ROI
            </span>
            <span className={cn(
              "text-lg font-semibold",
              averages.roi > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"
            )}>
              {formatPercent(averages.roi)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
