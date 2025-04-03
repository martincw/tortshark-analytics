
import React, { useMemo } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber } from "@/utils/campaignUtils";
import { DollarSign, Users, FileCheck, TrendingUp, ChevronsUp } from "lucide-react";

export function OverviewStats() {
  const { campaigns } = useCampaign();
  
  // Calculate aggregate metrics for all campaigns
  const aggregateStats = useMemo(() => {
    const stats = {
      totalAdSpend: 0,
      totalLeads: 0,
      totalCases: 0,
      totalRetainers: 0,
      totalRevenue: 0,
      totalProfit: 0,
    };
    
    campaigns.forEach(campaign => {
      stats.totalAdSpend += campaign.stats.adSpend;
      stats.totalLeads += campaign.manualStats.leads;
      stats.totalCases += campaign.manualStats.cases;
      stats.totalRetainers += campaign.manualStats.retainers;
      stats.totalRevenue += campaign.manualStats.revenue;
    });
    
    stats.totalProfit = stats.totalRevenue - stats.totalAdSpend;
    
    return stats;
  }, [campaigns]);
  
  // Calculate ROI percentage
  const roi = aggregateStats.totalAdSpend > 0
    ? ((aggregateStats.totalProfit / aggregateStats.totalAdSpend) * 100).toFixed(0)
    : "0";

  // Calculate average cost per lead
  const avgCostPerLead = aggregateStats.totalLeads > 0
    ? aggregateStats.totalAdSpend / aggregateStats.totalLeads
    : 0;

  // Calculate average cost per acquisition
  const avgCpa = aggregateStats.totalCases > 0
    ? aggregateStats.totalAdSpend / aggregateStats.totalCases
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <StatCard
        title="Total Ad Spend"
        value={formatCurrency(aggregateStats.totalAdSpend)}
        icon={<DollarSign className="h-5 w-5" />}
      />
      <StatCard
        title="Total Leads"
        value={formatNumber(aggregateStats.totalLeads)}
        icon={<Users className="h-5 w-5" />}
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
      />
      <StatCard
        title="Avg. Cost Per Case"
        value={formatCurrency(avgCpa)}
        valueClassName={avgCpa > 500 ? "text-warning-DEFAULT" : "text-foreground"}
      />
      <StatCard
        title="Total Profit"
        value={formatCurrency(aggregateStats.totalProfit)}
        valueClassName={aggregateStats.totalProfit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
        icon={<ChevronsUp className={`h-5 w-5 ${aggregateStats.totalProfit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`} />}
      />
      <StatCard
        title="ROI"
        value={`${roi}%`}
        valueClassName={Number(roi) > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
        trend={Number(roi) > 0 ? "up" : "down"}
        trendValue={Number(roi) > 200 ? "Excellent" : Number(roi) > 100 ? "Good" : Number(roi) > 0 ? "Positive" : "Negative"}
      />
    </div>
  );
}
