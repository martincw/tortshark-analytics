import React from "react";
import { Percent, DollarSign, Users, AlertCircle, TrendingUp } from "lucide-react";
import { BadgeStat } from "@/components/ui/badge-stat";
import { CampaignMetrics } from "@/types/metrics";
import { getPerformanceBgClass } from "@/utils/campaignUtils";
import { formatCurrency, formatNumber } from "@/utils/campaignUtils";

interface MetricsOverviewProps {
  metrics: CampaignMetrics;
  campaignStats: {
    adSpend: number;
  };
  manualStats: {
    leads: number;
    cases: number;
    revenue: number;
  };
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metrics,
  campaignStats,
  manualStats
}) => {
  // Calculate profit directly from the core values
  const profit = manualStats.revenue - campaignStats.adSpend;
  
  console.log(`MetricsOverview - Campaign revenue: ${manualStats.revenue}, adSpend: ${campaignStats.adSpend}, calculated profit: ${profit}`);
  
  const getProfitabilityClass = () => {
    // Handle zero ad spend case - check profit directly
    if (campaignStats.adSpend === 0) {
      if (profit > 0) return "text-success-DEFAULT";
      if (profit < 0) return "text-error-DEFAULT";
      return "text-secondary";
    }
    
    if (metrics.roi > 300) return "text-success-DEFAULT";
    if (metrics.roi > 200) return "text-secondary"; 
    return "text-error-DEFAULT";
  };
  
  const getRoasDisplay = () => {
    if (campaignStats.adSpend === 0) {
      if (manualStats.revenue > 0) return "∞";
      return "N/A";
    }
    return ((manualStats.revenue / campaignStats.adSpend) * 100).toFixed(0);
  };
  
  const costPerLead = manualStats.leads > 0 ? campaignStats.adSpend / manualStats.leads : 0;
  const earningsPerLead = manualStats.leads > 0 ? manualStats.revenue / manualStats.leads : 0;
  const conversionRate = manualStats.leads > 0 
    ? ((manualStats.cases / manualStats.leads) * 100).toFixed(1) 
    : "0";
  const profitPerCase = manualStats.cases > 0 
    ? profit / manualStats.cases 
    : 0;

  return (
    <>
      <div className={`grid grid-cols-2 gap-1 mb-4 p-3 rounded-md ${getPerformanceBgClass(metrics.roi, profit, campaignStats.adSpend)}`}>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">ROAS</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Percent className="h-4 w-4 text-secondary" />
            <span className={`text-xl font-bold ${getProfitabilityClass()}`}>
              {getRoasDisplay()}%
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">Profit</span>
          <div className="flex items-center gap-1.5 mt-1">
            <DollarSign className="h-4 w-4 text-secondary" />
            <span className={`text-xl font-bold ${profit >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`}>
              {Math.abs(profit) >= 1000 
                ? `${profit >= 0 ? '' : '-'}$${(Math.abs(profit) / 1000).toFixed(1)}K` 
                : formatCurrency(profit)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <BadgeStat 
            label="Ad Spend" 
            value={formatCurrency(campaignStats.adSpend)} 
          />
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <BadgeStat 
            label="Revenue" 
            value={formatCurrency(manualStats.revenue)} 
          />
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <BadgeStat 
            label="Leads" 
            value={formatNumber(manualStats.leads)} 
          />
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <BadgeStat 
            label="Cases" 
            value={formatNumber(manualStats.cases)} 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-2 border-t pt-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <BadgeStat 
            label="Cost Per Lead" 
            value={formatCurrency(costPerLead)} 
          />
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <BadgeStat 
            label="CPA" 
            value={formatCurrency(metrics.cpa)} 
          />
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <BadgeStat 
            label="Earnings Per Lead" 
            value={formatCurrency(earningsPerLead)} 
            className={earningsPerLead > costPerLead ? "text-success-DEFAULT" : ""}
          />
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <BadgeStat 
            label="Conv. Rate" 
            value={`${conversionRate}%`} 
          />
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <BadgeStat 
            label="Profit Per Case" 
            value={formatCurrency(profitPerCase)} 
            className={profitPerCase > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
          />
        </div>
      </div>
      
    </>
  );
};
