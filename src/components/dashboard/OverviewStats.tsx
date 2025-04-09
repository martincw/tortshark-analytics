
import React, { useMemo } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber, formatCurrencyCompact, getTrendDirection } from "@/utils/campaignUtils";
import { DollarSign, Users, FileCheck, TrendingUp, ChevronsUp, Percent, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export function OverviewStats() {
  const { campaigns, selectedCampaignIds } = useCampaign();
  
  // Filter campaigns based on selection, or use all if none selected
  const filteredCampaigns = useMemo(() => {
    if (selectedCampaignIds.length === 0) {
      return campaigns;
    }
    return campaigns.filter(campaign => selectedCampaignIds.includes(campaign.id));
  }, [campaigns, selectedCampaignIds]);
  
  // Calculate aggregate metrics for selected campaigns
  const aggregateStats = useMemo(() => {
    const stats = {
      totalAdSpend: 0,
      totalLeads: 0,
      totalCases: 0,
      totalRetainers: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalTargetRetainers: 0,
      totalTargetROAS: 0,
      totalTargetProfit: 0,
    };
    
    filteredCampaigns.forEach(campaign => {
      stats.totalAdSpend += campaign.stats.adSpend;
      stats.totalLeads += campaign.manualStats.leads;
      stats.totalCases += campaign.manualStats.cases;
      stats.totalRetainers += campaign.manualStats.retainers;
      stats.totalRevenue += campaign.manualStats.revenue;
      stats.totalTargetRetainers += campaign.targets.monthlyRetainers;
      stats.totalTargetROAS += campaign.targets.targetROAS;
      stats.totalTargetProfit += campaign.targets.targetProfit;
    });
    
    stats.totalProfit = stats.totalRevenue - stats.totalAdSpend;
    
    return stats;
  }, [filteredCampaigns]);
  
  // Calculate ROI percentage
  const roi = aggregateStats.totalAdSpend > 0
    ? ((aggregateStats.totalRevenue / aggregateStats.totalAdSpend) * 100) - 100
    : 0;

  // Calculate average cost per lead
  const avgCostPerLead = aggregateStats.totalLeads > 0
    ? aggregateStats.totalAdSpend / aggregateStats.totalLeads
    : 0;

  // Calculate average cost per acquisition
  const avgCpa = aggregateStats.totalCases > 0
    ? aggregateStats.totalAdSpend / aggregateStats.totalCases
    : 0;

  // Calculate month-over-month changes (placeholder for real data)
  const leadsTrend = getTrendDirection(5);
  const profitTrend = getTrendDirection(aggregateStats.totalProfit);
  const roiTrend = getTrendDirection(roi);
  
  // Calculate progress percentages for targets
  const averageTargetROAS = filteredCampaigns.length > 0 
    ? aggregateStats.totalTargetROAS / filteredCampaigns.length
    : 200; // Default target ROI if no campaigns
  
  // Fix: Correctly calculate ROI progress percentage
  const roiProgress = averageTargetROAS > 0
    ? Math.min(Math.round((roi / averageTargetROAS) * 100), 100)
    : 0;
  
  // Fix: Correctly calculate cases progress percentage
  const casesProgress = aggregateStats.totalTargetRetainers > 0
    ? Math.min(Math.round((aggregateStats.totalRetainers / aggregateStats.totalTargetRetainers) * 100), 100)
    : 0;
  
  // Fix: Correctly calculate profit progress percentage
  const profitProgress = aggregateStats.totalTargetProfit > 0
    ? Math.min(Math.round((aggregateStats.totalProfit / aggregateStats.totalTargetProfit) * 100), 100)
    : 0;
  
  // Determine progress bar variants based on completion percentage
  const getRoiVariant = () => {
    if (roiProgress >= 100) return "success";
    if (roiProgress >= 50) return "warning";
    return "error";
  };
  
  const getCasesVariant = () => {
    if (casesProgress >= 100) return "success";
    if (casesProgress >= 50) return "warning";
    return "error";
  };
  
  const getProfitVariant = () => {
    if (profitProgress >= 100) return "success";
    if (profitProgress >= 50) return "warning";
    return "error";
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrencyCompact(aggregateStats.totalRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          description="Gross revenue from all campaigns"
          valueClassName="text-primary"
        />
        <StatCard
          title="Total Ad Spend"
          value={formatCurrencyCompact(aggregateStats.totalAdSpend)}
          icon={<DollarSign className="h-5 w-5" />}
          description="Total advertising budget spent"
        />
        
        <StatCard
          title="Total Profit"
          value={formatCurrencyCompact(aggregateStats.totalProfit)}
          valueClassName={aggregateStats.totalProfit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
          icon={<ChevronsUp className={`h-5 w-5 ${aggregateStats.totalProfit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`} />}
          trend={profitTrend}
          trendValue={`${profitTrend === "up" ? "Profitable" : "Loss"}`}
          isHighlighted={true}
        />
        
        <StatCard
          title="ROI"
          value={`${roi.toFixed(0)}%`}
          valueClassName={Number(roi) > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
          icon={<Percent className="h-5 w-5" />}
          trend={roiTrend}
          trendValue={Number(roi) > 200 ? "Excellent" : Number(roi) > 100 ? "Good" : Number(roi) > 0 ? "Positive" : "Negative"}
          isHighlighted={true}
        />

        <StatCard
          title="Total Leads"
          value={formatNumber(aggregateStats.totalLeads)}
          icon={<Users className="h-5 w-5" />}
          trend={leadsTrend}
          trendValue="From last month"
        />
        <StatCard
          title="Total Cases"
          value={formatNumber(aggregateStats.totalCases)}
          icon={<FileCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Total Retainers"
          value={formatNumber(aggregateStats.totalRetainers)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        
        <StatCard
          title="Avg. Cost Per Lead"
          value={formatCurrency(avgCostPerLead)}
          valueClassName={avgCostPerLead > 50 ? "text-warning-DEFAULT" : "text-foreground"}
          description={avgCostPerLead > 50 ? "Above target threshold" : "Within target range"}
        />
      </div>
      
      {/* Add progress bars for targets */}
      <div className="border p-4 rounded-lg mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">Campaign Targets Progress</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">ROI Progress</span>
              <span className="font-medium">{roi.toFixed(0)}% of {averageTargetROAS.toFixed(0)}%</span>
            </div>
            <Progress 
              value={roiProgress} 
              size="md" 
              variant={getRoiVariant()} 
              className="w-full" 
              showValue 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cases Progress</span>
              <span className="font-medium">{formatNumber(aggregateStats.totalCases)} of {formatNumber(aggregateStats.totalTargetRetainers)}</span>
            </div>
            <Progress 
              value={casesProgress} 
              size="md" 
              variant={getCasesVariant()} 
              className="w-full" 
              showValue 
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Profit Progress</span>
              <span className="font-medium">{formatCurrency(aggregateStats.totalProfit)} of {formatCurrency(aggregateStats.totalTargetProfit)}</span>
            </div>
            <Progress 
              value={profitProgress} 
              size="md" 
              variant={getProfitVariant()} 
              className="w-full" 
              showValue 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
