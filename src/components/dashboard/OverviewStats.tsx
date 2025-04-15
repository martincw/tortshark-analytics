
import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Campaign } from "@/types/campaign";

interface ProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: "blue" | "green" | "amber" | "indigo" | "violet";
}

const colorClasses = {
  blue: "text-blue-500",
  green: "text-green-500",
  amber: "text-amber-500",
  indigo: "text-indigo-500",
  violet: "text-violet-500",
};

interface OverviewStatsProps {
  filteredCampaigns: Campaign[];
}

const CustomProgressBar: React.FC<ProgressBarProps> = ({ label, value, maxValue, color }) => {
  const progressColor = colorClasses[color] || "text-gray-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm font-medium ${progressColor}`}>{value}%</span>
      </div>
      <Progress value={value} max={maxValue} className="h-2" />
    </div>
  );
};

export function OverviewStats({ filteredCampaigns }: OverviewStatsProps) {
  console.log("OverviewStats component received filtered campaigns:", filteredCampaigns.length);
  
  // Calculate dashboard metrics based on filtered campaigns
  const dashboardMetrics = useMemo(() => {
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
    
    return {
      conversionRate: Math.round(conversionRate),
      costEfficiency: Math.round(costEfficiency),
      cpaScore: Math.round(cpaScore),
      roasScore: Math.round(roasScore),
      budgetUtilization: Math.round(budgetUtilization)
    };
  }, [filteredCampaigns]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Campaign Performance Overview</CardTitle>
        <CardDescription>Key metrics for your campaigns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CustomProgressBar label="Lead-to-Case Conversion"
                           value={dashboardMetrics.conversionRate}
                           maxValue={100}
                           color="blue" />

        <CustomProgressBar label="Cost Efficiency"
                           value={dashboardMetrics.costEfficiency}
                           maxValue={100}
                           color="green" />

        <CustomProgressBar label="Cost per Acquisition"
                           value={dashboardMetrics.cpaScore}
                           maxValue={100}
                           color="amber" />

        <CustomProgressBar label="Return on Ad Spend"
                           value={dashboardMetrics.roasScore}
                           maxValue={100}
                           color="indigo" />

        <CustomProgressBar label="Campaign Budget Utilization"
                           value={dashboardMetrics.budgetUtilization}
                           maxValue={100}
                           color="violet" />
      </CardContent>
    </Card>
  );
}
