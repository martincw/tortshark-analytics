
import React, { useMemo } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber, formatCurrencyCompact, getTrendDirection } from "@/utils/campaignUtils";
import { DollarSign, Users, FileCheck, TrendingUp, ChevronsUp, Percent } from "lucide-react";

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
    ? ((aggregateStats.totalProfit / aggregateStats.totalAdSpend) * 100)
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

  return (
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
      <StatCard
        title="Avg. Cost Per Case"
        value={formatCurrency(avgCpa)}
        valueClassName={avgCpa > 500 ? "text-warning-DEFAULT" : "text-foreground"}
        description={avgCpa > 500 ? "Above target threshold" : "Within target range"}
      />
    </div>
  );
}
