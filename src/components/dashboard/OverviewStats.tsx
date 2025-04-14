
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCampaign } from "@/contexts/CampaignContext";
import { CirclePercent, TrendingUp, DollarSign, Target, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: "blue" | "green" | "amber" | "indigo" | "violet" | "pink" | "cyan";
  icon?: React.ReactNode;
}

const colorClasses = {
  blue: "text-blue-500",
  green: "text-green-500",
  amber: "text-amber-500",
  indigo: "text-indigo-500",
  violet: "text-violet-500",
  pink: "text-pink-500",
  cyan: "text-cyan-500"
};

const bgColorClasses = {
  blue: "bg-blue-100",
  green: "bg-green-100",
  amber: "bg-amber-100",
  indigo: "bg-indigo-100",
  violet: "bg-violet-100",
  pink: "bg-pink-100",
  cyan: "bg-cyan-100"
};

const CustomProgressBar: React.FC<ProgressBarProps> = ({ label, value, maxValue, color, icon }) => {
  const progressColor = colorClasses[color] || "text-gray-500";
  const bgColor = bgColorClasses[color] || "bg-gray-100";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={`text-sm font-medium ${progressColor}`}>{value}%</span>
      </div>
      <Progress value={value} max={maxValue} className={`h-2.5 ${color !== 'blue' ? 'bg-opacity-30' : ''}`} />
    </div>
  );
};

export function OverviewStats() {
  const { campaigns, selectedCampaignIds } = useCampaign();
  
  // Calculate dashboard metrics based on selected campaigns or all campaigns
  const dashboardMetrics = useMemo(() => {
    // If we have selected campaigns, use those, otherwise use all campaigns
    const filteredCampaigns = selectedCampaignIds.length > 0
      ? campaigns.filter(camp => selectedCampaignIds.includes(camp.id))
      : campaigns;
    
    if (filteredCampaigns.length === 0) {
      return {
        conversionRate: 0,
        costEfficiency: 0,
        cpaScore: 0,
        roasScore: 0,
        budgetUtilization: 0
      };
    }
    
    // Calculate aggregate metrics across campaigns
    let totalLeads = 0;
    let totalCases = 0;
    let totalRetainers = 0;
    let totalRevenue = 0;
    let totalAdSpend = 0;
    let totalBudget = 0;
    
    filteredCampaigns.forEach(campaign => {
      totalLeads += campaign.manualStats.leads || 0;
      totalCases += campaign.manualStats.cases || 0;
      totalRetainers += campaign.manualStats.retainers || 0;
      totalRevenue += campaign.manualStats.revenue || 0;
      totalAdSpend += campaign.stats.adSpend || 0;
      totalBudget += campaign.targets.monthlySpend || 0;
    });
    
    // Calculate metrics
    const conversionRate = totalLeads > 0 ? (totalCases / totalLeads) * 100 : 0;
    const costEfficiency = totalAdSpend > 0 ? Math.min(100, (totalRevenue / totalAdSpend) * 50) : 0;
    const cpaScore = totalCases > 0 ? Math.min(100, 100 - ((totalAdSpend / totalCases) / 100)) : 0;
    const roasScore = totalAdSpend > 0 ? Math.min(100, (totalRevenue / totalAdSpend) * 25) : 0;
    const budgetUtilization = totalBudget > 0 ? (totalAdSpend / totalBudget) * 100 : 0;
    const roasMultiplier = totalAdSpend > 0 ? (totalRevenue / totalAdSpend) : 0;
    
    return {
      conversionRate: Math.round(conversionRate),
      costEfficiency: Math.round(costEfficiency),
      cpaScore: Math.round(cpaScore),
      roasScore: Math.round(roasScore),
      budgetUtilization: Math.round(budgetUtilization),
      roasMultiplier: roasMultiplier.toFixed(1)
    };
  }, [campaigns, selectedCampaignIds]);

  return (
    <Card className="bg-gradient-to-br from-background to-accent/5 border-accent/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Campaign Performance Overview</CardTitle>
        <CardDescription>Key metrics across your selected campaigns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <CustomProgressBar 
          label="Lead-to-Case Conversion"
          value={dashboardMetrics.conversionRate}
          maxValue={100}
          color="cyan" 
          icon={<CirclePercent className="h-4 w-4 text-cyan-500" />}
        />

        <CustomProgressBar 
          label={`ROAS (${dashboardMetrics.roasMultiplier}x)`}
          value={dashboardMetrics.roasScore}
          maxValue={100}
          color="green"
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
        />

        <CustomProgressBar 
          label="Cost per Acquisition"
          value={dashboardMetrics.cpaScore}
          maxValue={100}
          color="amber"
          icon={<DollarSign className="h-4 w-4 text-amber-500" />}
        />

        <CustomProgressBar 
          label="Budget Utilization"
          value={dashboardMetrics.budgetUtilization}
          maxValue={100}
          color="indigo"
          icon={<Target className="h-4 w-4 text-indigo-500" />}
        />

        <CustomProgressBar 
          label="Cost Efficiency"
          value={dashboardMetrics.costEfficiency}
          maxValue={100}
          color="pink"
          icon={<ShoppingBag className="h-4 w-4 text-pink-500" />}
        />
      </CardContent>
    </Card>
  );
}
