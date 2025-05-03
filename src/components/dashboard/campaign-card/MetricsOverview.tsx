
import React from "react";
import { Percent, DollarSign, Users, AlertCircle, TrendingUp } from "lucide-react";
import { BadgeStat } from "@/components/ui/badge-stat";
import { CampaignMetrics } from "@/types/metrics";
import { getPerformanceBgClass } from "@/utils/campaignUtils";
import { CustomProgressBar } from "@/components/ui/custom-progress-bar";
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
  targetProfit: number;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({
  metrics,
  campaignStats,
  manualStats,
  targetProfit
}) => {
  const profitProgress = targetProfit > 0 
    ? Math.max(Math.min((metrics.profit / targetProfit) * 100, 100), 0)
    : 0;
    
  const getProfitVariant = () => {
    if (profitProgress >= 100) return "success";
    if (profitProgress >= 50) return "warning";
    return "error";
  };
  
  const getProfitabilityClass = () => {
    if (metrics.roi > 300) return "text-success-DEFAULT";
    if (metrics.roi > 200) return "text-secondary"; 
    return "text-error-DEFAULT";
  };
  
  const costPerLead = manualStats.leads > 0 ? campaignStats.adSpend / manualStats.leads : 0;
  const earningsPerLead = manualStats.leads > 0 ? manualStats.revenue / manualStats.leads : 0;
  const conversionRate = manualStats.leads > 0 
    ? ((manualStats.cases / manualStats.leads) * 100).toFixed(1) 
    : "0";
  const profitPerCase = manualStats.cases > 0 
    ? metrics.profit / manualStats.cases 
    : 0;

  return (
    <>
      <div className={`grid grid-cols-2 gap-1 mb-4 p-3 rounded-md ${getPerformanceBgClass(metrics.roi)}`}>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">ROAS</span>
          <div className="flex items-center gap-1.5 mt-1">
            <Percent className="h-4 w-4 text-secondary" />
            <span className={`text-xl font-bold ${getProfitabilityClass()}`}>
              {((manualStats.revenue / campaignStats.adSpend) * 100).toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium text-muted-foreground">Profit</span>
          <div className="flex items-center gap-1.5 mt-1">
            <DollarSign className="h-4 w-4 text-secondary" />
            <span className={`text-xl font-bold ${getProfitabilityClass()}`}>
              {metrics.profit >= 1000 
                ? `$${(metrics.profit / 1000).toFixed(1)}K` 
                : formatCurrency(metrics.profit)}
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
      
      <div className="border-t pt-2 mt-2">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Profit Progress</span>
            <span className="font-medium">
              {formatCurrency(metrics.profit)} of {formatCurrency(targetProfit)}
            </span>
          </div>
          <CustomProgressBar 
            value={profitProgress} 
            size="sm" 
            variant={getProfitVariant()} 
            className="w-full" 
          />
        </div>
      </div>
    </>
  );
};
