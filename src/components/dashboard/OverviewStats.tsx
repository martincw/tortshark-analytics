import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCampaign } from "@/contexts/CampaignContext";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";

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

export function OverviewStats() {
  const { campaigns, selectedCampaignIds, dateRange } = useCampaign();
  
  React.useEffect(() => {
    console.log("OverviewStats component received campaigns:", campaigns.length);
    console.log("OverviewStats date range:", dateRange);
  }, [campaigns, dateRange]);
  
  // Calculate dashboard metrics based on selected campaigns and date range
  const dashboardMetrics = useMemo(() => {
    // Filter campaigns based on selection
    const filteredCampaigns = selectedCampaignIds.length > 0
      ? campaigns.filter(camp => selectedCampaignIds.includes(camp.id))
      : campaigns;
    
    console.log(`OverviewStats working with ${filteredCampaigns.length} filtered campaigns`);
    
    if (filteredCampaigns.length === 0) {
      return {
        conversionRate: 0,
        costEfficiency: 0,
        cpaScore: 0,
        roasScore: 0,
        budgetUtilization: 0
      };
    }
    
    // Parse date strings to Date objects for filtering
    const startDateStr = dateRange.startDate;
    const endDateStr = dateRange.endDate;
    
    console.log(`OverviewStats filtering by date range: ${startDateStr} to ${endDateStr}`);
    
    // If we have both dates, filter by them
    if (startDateStr && endDateStr) {
      // Create date objects with time set to start/end of day to ensure full day coverage
      const startDate = startOfDay(new Date(startDateStr + "T12:00:00Z"));
      const endDate = endOfDay(new Date(endDateStr + "T12:00:00Z"));
      
      console.log(`OverviewStats date objects: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Calculate aggregate metrics across campaigns
      let totalLeads = 0;
      let totalCases = 0;
      let totalRetainers = 0;
      let totalRevenue = 0;
      let totalAdSpend = 0;
      let totalBudget = 0;
      
      filteredCampaigns.forEach(campaign => {
        // Filter statsHistory by date range
        const filteredStats = campaign.statsHistory.filter(stat => {
          // Ensure consistent date parsing by using ISO format with fixed time
          const statDateStr = stat.date.split('T')[0]; // Get YYYY-MM-DD part
          const statDate = parseISO(`${statDateStr}T12:00:00Z`);
          
          // Check if the date is within our range
          const isInRange = isWithinInterval(statDate, { start: startDate, end: endDate });
          
          if (isInRange) {
            console.log(`Including stat entry for ${campaign.name} on ${statDateStr}`);
          }
          
          return isInRange;
        });
        
        console.log(`Campaign ${campaign.name}: Found ${filteredStats.length} stats entries in date range`);
        
        // Aggregate filtered stats
        totalLeads += filteredStats.reduce((sum, stat) => sum + stat.leads, 0);
        totalCases += filteredStats.reduce((sum, stat) => sum + stat.cases, 0);
        totalRetainers += filteredStats.reduce((sum, stat) => sum + stat.retainers, 0);
        totalRevenue += filteredStats.reduce((sum, stat) => sum + stat.revenue, 0);
        totalAdSpend += filteredStats.reduce((sum, stat) => sum + (stat.adSpend || 0), 0);
        
        totalBudget += campaign.targets.monthlySpend || 0;
      });
      
      console.log(`OverviewStats metrics for date range: Leads=${totalLeads}, Cases=${totalCases}, Revenue=${totalRevenue}, AdSpend=${totalAdSpend}`);
      
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
    } else {
      // If no date range, use the summary stats (fallback)
      let totalLeads = 0;
      let totalCases = 0;
      let totalAdSpend = 0;
      let totalRevenue = 0;
      let totalBudget = 0;
      
      filteredCampaigns.forEach(campaign => {
        totalLeads += campaign.manualStats.leads || 0;
        totalCases += campaign.manualStats.cases || 0;
        totalRevenue += campaign.manualStats.revenue || 0;
        totalAdSpend += campaign.stats.adSpend || 0;
        totalBudget += campaign.targets.monthlySpend || 0;
      });
      
      console.log(`OverviewStats fallback metrics: Leads=${totalLeads}, Cases=${totalCases}, Revenue=${totalRevenue}, AdSpend=${totalAdSpend}`);
      
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
    }
  }, [campaigns, selectedCampaignIds, dateRange.startDate, dateRange.endDate]);

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
