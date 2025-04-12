import React, { useMemo } from "react";
import { StatCard } from "@/components/ui/stat-card";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber, formatCurrencyCompact, getTrendDirection } from "@/utils/campaignUtils";
import { 
  DollarSign, Users, FileCheck, TrendingUp, ChevronsUp, Percent,
  Target, CircleDollarSign, CreditCard, FileText, Wallet, 
  TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { CustomProgressBar } from "@/components/ui/custom-progress-bar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function OverviewStats() {
  const { campaigns, selectedCampaignIds } = useCampaign();
  
  const filteredCampaigns = useMemo(() => {
    if (selectedCampaignIds.length === 0) {
      return campaigns;
    }
    return campaigns.filter(campaign => selectedCampaignIds.includes(campaign.id));
  }, [campaigns, selectedCampaignIds]);
  
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
      // Previous period data (mock for now - would come from actual historical data)
      previousAdSpend: 0,
      previousLeads: 0,
      previousCases: 0,
      previousRevenue: 0
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
      
      // Mock previous period data (for demonstration)
      // In a real app, this would come from historical data
      stats.previousAdSpend += campaign.stats.adSpend * 0.85;
      stats.previousLeads += campaign.manualStats.leads * 0.9;
      stats.previousCases += campaign.manualStats.cases * 0.8;
      stats.previousRevenue += campaign.manualStats.revenue * 0.75;
    });
    
    stats.totalProfit = stats.totalRevenue - stats.totalAdSpend;
    const previousProfit = stats.previousRevenue - stats.previousAdSpend;
    
    // Calculate period-over-period changes
    const adSpendChange = stats.previousAdSpend > 0 
      ? ((stats.totalAdSpend - stats.previousAdSpend) / stats.previousAdSpend) * 100 
      : 0;
      
    const leadsChange = stats.previousLeads > 0 
      ? ((stats.totalLeads - stats.previousLeads) / stats.previousLeads) * 100 
      : 0;
      
    const casesChange = stats.previousCases > 0 
      ? ((stats.totalCases - stats.previousCases) / stats.previousCases) * 100 
      : 0;
      
    const profitChange = previousProfit > 0 
      ? ((stats.totalProfit - previousProfit) / previousProfit) * 100 
      : 0;
    
    return {
      ...stats,
      adSpendChange,
      leadsChange,
      casesChange,
      profitChange
    };
  }, [filteredCampaigns]);
  
  const roi = aggregateStats.totalAdSpend > 0
    ? ((aggregateStats.totalRevenue / aggregateStats.totalAdSpend) * 100) - 100
    : 0;

  const avgCostPerLead = aggregateStats.totalLeads > 0
    ? aggregateStats.totalAdSpend / aggregateStats.totalLeads
    : 0;

  const avgCpa = aggregateStats.totalCases > 0
    ? aggregateStats.totalAdSpend / aggregateStats.totalCases
    : 0;
    
  const profitPerCase = aggregateStats.totalCases > 0
    ? aggregateStats.totalProfit / aggregateStats.totalCases
    : 0;

  const leadsTrend = getTrendDirection(aggregateStats.leadsChange);
  const profitTrend = getTrendDirection(aggregateStats.profitChange);
  const roiTrend = getTrendDirection(roi);
  
  const profitProgress = useMemo(() => {
    if (aggregateStats.totalTargetProfit <= 0) return 0;
    
    const percentage = (aggregateStats.totalProfit / aggregateStats.totalTargetProfit) * 100;
    return Math.max(Math.min(percentage, 100), 0);
  }, [aggregateStats.totalProfit, aggregateStats.totalTargetProfit]);
  
  const getProfitVariant = () => {
    if (profitProgress >= 100) return "success";
    if (profitProgress >= 50) return "warning";
    return "error";
  };

  // Convert values to percentages for the decision matrix
  const getEfficiencyScore = () => {
    const costPerCaseRatio = avgCpa > 0 ? (avgCpa / profitPerCase) * 100 : 0;
    const normalizedScore = 100 - Math.min(costPerCaseRatio, 100);
    return normalizedScore;
  };

  const getConversionEfficiencyScore = () => {
    if (aggregateStats.totalLeads === 0) return 0;
    
    const conversionRate = (aggregateStats.totalCases / aggregateStats.totalLeads) * 100;
    return Math.min(conversionRate * 5, 100); // Scale it so 20% conversion = 100% score
  };

  const efficiencyScore = getEfficiencyScore();
  const conversionScore = getConversionEfficiencyScore();

  return (
    <div>
      {/* Primary KPIs with targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Profit Progress Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Profit Progress
              </CardTitle>
              <span className="text-lg font-medium">
                {formatCurrency(aggregateStats.totalProfit)} of {formatCurrency(aggregateStats.totalTargetProfit)}
              </span>
            </div>
            <CardDescription>
              {profitProgress >= 100 
                ? "Target achieved! Consider increasing your target."
                : profitProgress >= 70
                ? "On track to hit target"
                : "Needs attention to meet targets"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomProgressBar 
              value={profitProgress} 
              size="lg" 
              variant={getProfitVariant()} 
              className="w-full" 
              showValue 
              target={100}
              showTarget
            />
            
            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="font-medium">Period change:</span>
                <span className={`flex items-center ${aggregateStats.profitChange >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
                  {aggregateStats.profitChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                  {Math.abs(aggregateStats.profitChange).toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">Current ROI:</span>
                <span className={roi >= 100 ? "text-success-DEFAULT font-medium" : "text-warning-DEFAULT"}>
                  {roi.toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Efficiency Matrix */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Campaign Efficiency Metrics
            </CardTitle>
            <CardDescription>
              Key metrics to optimize your ad spend and conversion
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <CustomProgressBar 
                  value={efficiencyScore} 
                  size="md" 
                  variant={efficiencyScore >= 70 ? "success" : efficiencyScore >= 40 ? "warning" : "error"} 
                  showValue 
                  label="Cost Efficiency"
                  target={70}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {efficiencyScore >= 70 
                    ? "Good cost efficiency - maintain current cost-per-case ratio" 
                    : "Opportunity to improve cost per case ratio"}
                </p>
              </div>
              
              <div>
                <CustomProgressBar 
                  value={conversionScore} 
                  size="md" 
                  variant={conversionScore >= 70 ? "success" : conversionScore >= 40 ? "warning" : "error"} 
                  showValue 
                  label="Lead-to-Case Conversion" 
                  target={70}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {conversionScore >= 70 
                    ? "Strong lead qualification - focus on scaling volume" 
                    : "Lead quality may need attention - review qualification criteria"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrencyCompact(aggregateStats.totalRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          description="Gross revenue from all campaigns"
          valueClassName="text-primary"
          trend={getTrendDirection(aggregateStats.previousRevenue > 0 ? ((aggregateStats.totalRevenue - aggregateStats.previousRevenue) / aggregateStats.previousRevenue) * 100 : 0)}
          trendValue={`${Math.abs(((aggregateStats.totalRevenue - aggregateStats.previousRevenue) / (aggregateStats.previousRevenue || 1) * 100).toFixed(1))}% from previous period`}
          className="shadow-sm border-accent/20 bg-gradient-to-br from-background to-accent/5"
        />
        
        <StatCard
          title="Total Ad Spend"
          value={formatCurrencyCompact(aggregateStats.totalAdSpend)}
          icon={<CreditCard className="h-5 w-5" />}
          description="Total advertising budget spent"
          trend={getTrendDirection(aggregateStats.adSpendChange * -1)} // Invert so that lower spend is "up"
          trendValue={`${Math.abs(aggregateStats.adSpendChange.toFixed(1))}% ${aggregateStats.adSpendChange > 0 ? 'higher' : 'lower'} than previous`}
          className="shadow-sm border-accent/20 bg-gradient-to-br from-background to-accent/5"
        />
        
        <StatCard
          title="Total Profit"
          value={formatCurrencyCompact(aggregateStats.totalProfit)}
          valueClassName={aggregateStats.totalProfit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
          icon={<ChevronsUp className={`h-5 w-5 ${aggregateStats.totalProfit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`} />}
          trend={profitTrend}
          trendValue={`${Math.abs(aggregateStats.profitChange.toFixed(1))}% ${aggregateStats.profitChange >= 0 ? 'increase' : 'decrease'}`}
          isHighlighted={true}
          className="shadow-sm border-accent/20 bg-gradient-to-br from-background to-accent/5"
        />
        
        <StatCard
          title="ROI"
          value={`${roi.toFixed(0)}%`}
          valueClassName={Number(roi) > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
          icon={<Percent className="h-5 w-5" />}
          trend={roiTrend}
          trendValue={Number(roi) > 200 ? "Excellent" : Number(roi) > 100 ? "Good" : Number(roi) > 0 ? "Positive" : "Negative"}
          isHighlighted={true}
          className="shadow-sm border-accent/20 bg-gradient-to-br from-background to-accent/5"
        />

        <StatCard
          title="Total Leads"
          value={formatNumber(aggregateStats.totalLeads)}
          icon={<Users className="h-5 w-5" />}
          trend={leadsTrend}
          trendValue={`${Math.abs(aggregateStats.leadsChange.toFixed(1))}% ${aggregateStats.leadsChange >= 0 ? 'more' : 'fewer'} leads`}
          className="shadow-sm border-accent/20 bg-gradient-to-br from-background to-accent/5"
        />
        
        <StatCard
          title="Total Cases"
          value={formatNumber(aggregateStats.totalCases)}
          icon={<FileCheck className="h-5 w-5" />}
          trend={getTrendDirection(aggregateStats.casesChange)}
          trendValue={`${Math.abs(aggregateStats.casesChange.toFixed(1))}% ${aggregateStats.casesChange >= 0 ? 'increase' : 'decrease'}`}
          className="shadow-sm border-accent/20 bg-gradient-to-br from-background to-accent/5"
        />
        
        <StatCard
          title="Profit Per Case"
          value={formatCurrency(profitPerCase)}
          icon={<CircleDollarSign className="h-5 w-5" />}
          valueClassName={profitPerCase > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
          description={profitPerCase > 5000 ? "Excellent case value" : "Average profit per acquired case"}
          className="shadow-sm border-accent/20 bg-gradient-to-br from-background to-accent/5"
        />
        
        <StatCard
          title="Avg. Cost Per Lead"
          value={formatCurrency(avgCostPerLead)}
          icon={<FileText className="h-5 w-5" />}
          valueClassName={avgCostPerLead > 50 ? "text-warning-DEFAULT" : "text-foreground"}
          description={avgCostPerLead > 50 ? "Above target threshold" : "Within target range"}
          trend={avgCostPerLead > 50 ? "down" : "up"}
          trendValue={avgCostPerLead > 50 ? "Needs Optimization" : "Cost-Effective"}
          className="shadow-sm border-accent/20 bg-gradient-to-br from-background to-accent/5"
        />
      </div>
      
      {/* Decision Support Insights */}
      <Card className="mb-6 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Decision Insights
          </CardTitle>
          <CardDescription>
            Actionable recommendations based on campaign performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-accent/5 p-4 rounded-md border">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <CircleDollarSign className="h-4 w-4 text-primary" />
                Budget Allocation
              </h3>
              <p className="text-sm text-muted-foreground">
                {avgCostPerLead > 70 
                  ? "Consider reallocating budget from high-CPL campaigns to better performing channels" 
                  : "Current budget allocation is efficient - consider increasing spend on top performers"}
              </p>
            </div>
            
            <div className="bg-accent/5 p-4 rounded-md border">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <FileCheck className="h-4 w-4 text-primary" />
                Lead Qualification
              </h3>
              <p className="text-sm text-muted-foreground">
                {aggregateStats.totalLeads > 0 && (aggregateStats.totalCases / aggregateStats.totalLeads) < 0.2
                  ? "Lead-to-case conversion is below target - review lead qualification criteria"
                  : "Lead quality is strong - focus on maintaining qualification standards"}
              </p>
            </div>
            
            <div className="bg-accent/5 p-4 rounded-md border">
              <h3 className="font-medium flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                Growth Strategy
              </h3>
              <p className="text-sm text-muted-foreground">
                {roi > 150
                  ? "Strong ROI indicates opportunity to scale - consider increasing ad spend by 20-30%"
                  : roi > 50
                  ? "Maintain current spend and optimize underperforming campaigns" 
                  : "Focus on optimizing existing campaigns before scaling"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
