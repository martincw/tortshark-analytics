
import React, { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { CampaignLeaderboard } from "@/components/dashboard/CampaignLeaderboard";
import { AccountsOverview } from "@/components/dashboard/AccountsOverview";
import { useCampaign } from "@/contexts/CampaignContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoIcon, ArrowRight, DollarSign, Users, Flag, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, formatNumber } from "@/utils/campaignUtils";
import { StatCard } from "@/components/ui/stat-card";

const Index = () => {
  const { campaigns, selectedCampaignIds, dateRange } = useCampaign();
  const navigate = useNavigate();
  
  const showSelectionAlert = selectedCampaignIds.length > 0 && selectedCampaignIds.length < campaigns.length;

  // Add key prop with dateRange to force re-renders when date changes
  const dateKey = `${dateRange.startDate}-${dateRange.endDate}`;
  
  // Log date range for debugging
  useEffect(() => {
    console.log("Dashboard updating with date range:", dateRange);
  }, [dateRange]);

  const hasNoData = campaigns.length === 0;

  // Calculate aggregated metrics across all campaigns
  const aggregatedMetrics = React.useMemo(() => {
    if (campaigns.length === 0) return null;
    
    // Filter campaigns based on selection if needed
    const filteredCampaigns = selectedCampaignIds.length > 0
      ? campaigns.filter(camp => selectedCampaignIds.includes(camp.id))
      : campaigns;
      
    // Initialize metrics
    let totalLeads = 0;
    let totalCases = 0;
    let totalRevenue = 0;
    let totalAdSpend = 0;
    let totalTargetRetainers = 0;
    let totalTargetSpend = 0;
    let totalTargetIncome = 0;
    
    // Aggregate metrics
    filteredCampaigns.forEach(campaign => {
      totalLeads += campaign.manualStats.leads || 0;
      totalCases += campaign.manualStats.cases || 0;
      totalRevenue += campaign.manualStats.revenue || 0;
      totalAdSpend += campaign.stats.adSpend || 0;
      totalTargetRetainers += campaign.targets.monthlyRetainers || 0;
      totalTargetSpend += campaign.targets.monthlySpend || 0;
      totalTargetIncome += campaign.targets.monthlyIncome || 0;
    });
    
    // Calculate derived metrics
    const cpl = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
    const cpa = totalCases > 0 ? totalAdSpend / totalCases : 0;
    const profit = totalRevenue - totalAdSpend;
    const roi = totalAdSpend > 0 ? (totalRevenue / totalAdSpend) * 100 : 0;
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    
    // Calculate progress percentages
    const leadProgress = totalTargetRetainers > 0 ? Math.min(100, (totalCases / totalTargetRetainers) * 100) : 0;
    const spendProgress = totalTargetSpend > 0 ? Math.min(100, (totalAdSpend / totalTargetSpend) * 100) : 0;
    const revenueProgress = totalTargetIncome > 0 ? Math.min(100, (totalRevenue / totalTargetIncome) * 100) : 0;
    
    return {
      totalLeads,
      totalCases,
      totalRevenue,
      totalAdSpend,
      cpl,
      cpa, 
      profit,
      roi,
      profitMargin,
      leadProgress,
      spendProgress,
      revenueProgress,
      totalTargetRetainers,
      totalTargetSpend,
      totalTargetIncome
    };
  }, [campaigns, selectedCampaignIds]);

  return (
    <div className="space-y-6">
      <DashboardHeader />
      
      {showSelectionAlert && (
        <Alert variant="default" className="bg-primary/5 border border-primary/20">
          <InfoIcon className="h-4 w-4 mr-2 text-primary" />
          <AlertDescription>
            Showing metrics for {selectedCampaignIds.length} selected campaign{selectedCampaignIds.length > 1 ? 's' : ''}. 
            Use the Campaigns filter to adjust selection.
          </AlertDescription>
        </Alert>
      )}

      {hasNoData ? (
        <div className="border rounded-lg p-8 text-center bg-background">
          <h2 className="text-2xl font-bold mb-3">Welcome to Your Campaign Dashboard</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            To get started, add your first campaign to begin tracking performance metrics
            and making data-driven decisions for your mass tort advertising.
          </p>
          <Button onClick={() => navigate("/add-campaign")} size="lg">
            Add Your First Campaign
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {aggregatedMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard 
                  title="Total Revenue" 
                  value={formatCurrency(aggregatedMetrics.totalRevenue)}
                  description={`${formatPercent(aggregatedMetrics.revenueProgress)} of target`}
                  icon={<DollarSign className="h-5 w-5" />}
                  trend={aggregatedMetrics.revenueProgress >= 50 ? "up" : "neutral"}
                  trendValue={`Target: ${formatCurrency(aggregatedMetrics.totalTargetIncome)}`}
                  isHighlighted={true}
                />
                <StatCard 
                  title="Total Ad Spend" 
                  value={formatCurrency(aggregatedMetrics.totalAdSpend)}
                  description={`${formatPercent(aggregatedMetrics.spendProgress)} of budget`}
                  icon={<TrendingUp className="h-5 w-5" />}
                  trend={aggregatedMetrics.spendProgress <= 90 ? "neutral" : "down"}
                  trendValue={`Budget: ${formatCurrency(aggregatedMetrics.totalTargetSpend)}`}
                />
                <StatCard 
                  title="Total Profit" 
                  value={formatCurrency(aggregatedMetrics.profit)}
                  description={`${formatPercent(aggregatedMetrics.profitMargin)} margin`}
                  icon={<DollarSign className="h-5 w-5" />}
                  trend={aggregatedMetrics.profit > 0 ? "up" : "down"}
                  trendValue={aggregatedMetrics.profit > 0 ? "Profitable" : "Loss"}
                  valueClassName={aggregatedMetrics.profit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
                />
              </div>
            )}

            {aggregatedMetrics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard 
                  title="ROI" 
                  value={formatPercent(aggregatedMetrics.roi)}
                  icon={<TrendingUp className="h-4 w-4" />}
                  valueClassName={aggregatedMetrics.roi >= 200 ? "text-success-DEFAULT" : 
                                 aggregatedMetrics.roi >= 100 ? "text-secondary" : "text-error-DEFAULT"}
                />
                <StatCard 
                  title="Total Leads" 
                  value={formatNumber(aggregatedMetrics.totalLeads)}
                  icon={<Users className="h-4 w-4" />}
                />
                <StatCard 
                  title="Total Cases" 
                  value={formatNumber(aggregatedMetrics.totalCases)}
                  description={`${formatPercent(aggregatedMetrics.leadProgress)} of target`}
                  icon={<Flag className="h-4 w-4" />}
                />
                <StatCard 
                  title="Case Cost (CPA)" 
                  value={formatCurrency(aggregatedMetrics.cpa)}
                  description={`Lead Cost: ${formatCurrency(aggregatedMetrics.cpl)}`}
                  icon={<DollarSign className="h-4 w-4" />}
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <OverviewStats key={`overview-${dateKey}`} />
              </div>
              <div>
                <AccountsOverview />
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <CampaignLeaderboard key={`leaderboard-${dateKey}`} />
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignGrid key={`grid-${dateKey}`} />
          </TabsContent>

          <TabsContent value="insights">
            <div className="lg:col-span-2">
              <CampaignLeaderboard key={`leaderboard-${dateKey}`} />
            </div>
            <div className="mt-6">
              <CampaignGrid key={`grid-${dateKey}`} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Index;
