import React, { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { CampaignLeaderboard } from "@/components/dashboard/CampaignLeaderboard";
import { PerformanceSummary } from "@/components/dashboard/PerformanceSummary";
import { DailyAveragesSection } from "@/components/dashboard/DailyAveragesSection";
import { useCampaign } from "@/contexts/CampaignContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  InfoIcon, ArrowRight, DollarSign, Users, FileCheck, TrendingUp, 
  Clock, FileText, Wallet, Target, Calendar, PlusCircle, BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, formatNumber, getTrendDirection } from "@/utils/campaignUtils";
import { StatCard } from "@/components/ui/stat-card";
import { BadgeStat } from "@/components/ui/badge-stat";
import { CustomProgressBar } from "@/components/ui/custom-progress-bar";
import { CampaignPerformanceSection } from "@/components/campaigns/CampaignPerformanceSection";
import { parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";

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
    
    // Get date range for filtering
    const startDateStr = dateRange.startDate;
    const endDateStr = dateRange.endDate;
    
    if (startDateStr && endDateStr) {
      // Create proper date objects with start/end of day to ensure full day coverage
      const startDate = startOfDay(new Date(startDateStr));
      const endDate = endOfDay(new Date(endDateStr));
      
      console.log(`Index aggregatedMetrics: Using date range ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Aggregate metrics with date filtering
      filteredCampaigns.forEach(campaign => {
        // Filter statsHistory by date range
        const filteredStats = campaign.statsHistory.filter(stat => {
          const statDate = parseISO(stat.date);
          return isWithinInterval(statDate, { start: startDate, end: endDate });
        });
        
        console.log(`Index: Campaign ${campaign.name} has ${filteredStats.length} stats entries in date range`);
        
        // Aggregate filtered stats
        totalLeads += filteredStats.reduce((sum, stat) => sum + stat.leads, 0);
        totalCases += filteredStats.reduce((sum, stat) => sum + stat.cases, 0);
        totalRevenue += filteredStats.reduce((sum, stat) => sum + stat.revenue, 0);
        totalAdSpend += filteredStats.reduce((sum, stat) => sum + stat.adSpend, 0);
      });
    } else {
      // If no date filtering, use summary stats
      filteredCampaigns.forEach(campaign => {
        totalLeads += campaign.manualStats.leads || 0;
        totalCases += campaign.manualStats.cases || 0;
        totalRevenue += campaign.manualStats.revenue || 0;
        totalAdSpend += campaign.stats.adSpend || 0;
      });
    }
    
    filteredCampaigns.forEach(campaign => {
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
    const roiProgress = 200 > 0 ? Math.min(100, (roi / 200) * 100) : 0;
    const profitProgress = totalTargetIncome > 0 ? Math.min(100, (profit / (totalTargetIncome * 0.5)) * 100) : 0;
    
    // Get variant classes for progress bars
    const getRoiVariant = () => {
      if (roiProgress >= 100) return "success";
      if (roiProgress >= 70) return "warning";
      return "error";
    };
    
    const getCasesVariant = () => {
      if (leadProgress >= 100) return "success";
      if (leadProgress >= 70) return "warning";
      return "error";
    };
    
    const getProfitVariant = () => {
      if (profitProgress >= 100) return "success";
      if (profitProgress >= 70) return "warning";
      return "error";
    };
    
    const profitPerCase = totalCases > 0 ? profit / totalCases : 0;
    
    // Get color class based on ROI
    const getRoiClass = () => {
      if (roi > 200) return "text-success-DEFAULT";
      if (roi > 0) return "text-secondary"; 
      return "text-error-DEFAULT";
    };
    
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
      totalTargetIncome,
      roiProgress,
      profitProgress,
      profitPerCase,
      getRoiVariant,
      getCasesVariant,
      getProfitVariant,
      getRoiClass
    };
  }, [campaigns, selectedCampaignIds, dateRange.startDate, dateRange.endDate]);

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
              <div className="bg-gradient-to-br from-card/90 to-accent/10 rounded-xl p-6 shadow-md border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="space-y-2 bg-background/50 p-5 rounded-lg shadow-sm border border-accent/20">
                    <div className="flex items-center gap-2 mb-3">
                      <DollarSign className="h-6 w-6 text-primary opacity-80" />
                      <h3 className="text-lg font-semibold">Financial Overview</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground block">Revenue</span>
                        <span className="text-2xl font-bold">{formatCurrency(aggregatedMetrics.totalRevenue)}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">Ad Spend</span>
                        <span className="text-2xl font-bold">{formatCurrency(aggregatedMetrics.totalAdSpend)}</span>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Profit</span>
                        <span className={`font-bold ${aggregatedMetrics.getRoiClass()}`}>{formatCurrency(aggregatedMetrics.profit)}</span>
                      </div>
                      <CustomProgressBar
                        value={aggregatedMetrics.profitProgress}
                        variant={aggregatedMetrics.getProfitVariant()}
                        size="md"
                        showValue
                        valuePosition="right"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 bg-background/50 p-5 rounded-lg shadow-sm border border-accent/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="h-6 w-6 text-primary opacity-80" />
                      <h3 className="text-lg font-semibold">Case Acquisition</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground block">Leads</span>
                        <span className="text-2xl font-bold">{formatNumber(aggregatedMetrics.totalLeads)}</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">Cases</span>
                        <span className="text-2xl font-bold">{formatNumber(aggregatedMetrics.totalCases)}</span>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Target Cases</span>
                        <span className="font-bold">{aggregatedMetrics.totalCases} of {aggregatedMetrics.totalTargetRetainers}</span>
                      </div>
                      <CustomProgressBar
                        value={aggregatedMetrics.leadProgress}
                        variant={aggregatedMetrics.getCasesVariant()}
                        size="md"
                        showValue
                        valuePosition="right"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2 bg-background/50 p-5 rounded-lg shadow-sm border border-accent/20">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="h-6 w-6 text-primary opacity-80" />
                      <h3 className="text-lg font-semibold">ROI Performance</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground block">ROI</span>
                        <span className={`text-2xl font-bold ${aggregatedMetrics.getRoiClass()}`}>{aggregatedMetrics.roi.toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground block">Profit Per Case</span>
                        <span className={`text-2xl font-bold ${aggregatedMetrics.profitPerCase > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
                          {formatCurrency(aggregatedMetrics.profitPerCase)}
                        </span>
                      </div>
                    </div>
                    <div className="pt-4 mt-4 border-t">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium">Target ROI</span>
                        <span className="font-bold">{aggregatedMetrics.roi.toFixed(1)}% of 200%</span>
                      </div>
                      <CustomProgressBar
                        value={aggregatedMetrics.roiProgress}
                        variant={aggregatedMetrics.getRoiVariant()}
                        size="md"
                        showValue
                        valuePosition="right"
                      />
                    </div>
                  </div>
                
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t md:col-span-3">
                    <div className="flex flex-col items-center bg-background/60 p-4 rounded-lg border border-accent/10">
                      <Clock className="h-5 w-5 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Cost Per Lead</span>
                      <span className={`text-xl font-semibold ${aggregatedMetrics.cpl > 50 ? "text-warning-DEFAULT" : ""}`}>
                        {formatCurrency(aggregatedMetrics.cpl)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center bg-background/60 p-4 rounded-lg border border-accent/10">
                      <FileText className="h-5 w-5 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Cost Per Case</span>
                      <span className="text-xl font-semibold">
                        {formatCurrency(aggregatedMetrics.cpa)}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center bg-background/60 p-4 rounded-lg border border-accent/10">
                      <Wallet className="h-5 w-5 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Earnings Per Lead</span>
                      <span className="text-xl font-semibold">
                        {aggregatedMetrics.totalLeads > 0 
                          ? formatCurrency(aggregatedMetrics.totalRevenue / aggregatedMetrics.totalLeads) 
                          : "$0.00"}
                      </span>
                    </div>
                    
                    <div className="flex flex-col items-center bg-background/60 p-4 rounded-lg border border-accent/10">
                      <Target className="h-5 w-5 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Conversion Rate</span>
                      <span className="text-xl font-semibold">
                        {aggregatedMetrics.totalLeads > 0 
                          ? `${((aggregatedMetrics.totalCases / aggregatedMetrics.totalLeads) * 100).toFixed(1)}%` 
                          : "0%"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {aggregatedMetrics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                  title="Return on Investment"
                  value={`${aggregatedMetrics.roi.toFixed(1)}%`}
                  icon={<Target className="h-5 w-5" />}
                  trend={aggregatedMetrics.roi > 0 ? "up" : "down"}
                  trendValue={aggregatedMetrics.roi > 200 ? "Excellent" : aggregatedMetrics.roi > 100 ? "Good" : aggregatedMetrics.roi > 0 ? "Positive" : "Needs Attention"}
                  className="shadow-md border-2 border-accent/20 bg-gradient-to-br from-background to-accent/5"
                  isHighlighted={true}
                  valueClassName={aggregatedMetrics.getRoiClass()}
                />
                
                <StatCard
                  title="Total Profit"
                  value={formatCurrency(aggregatedMetrics.profit)}
                  icon={<DollarSign className="h-5 w-5" />}
                  trend={aggregatedMetrics.profit > 0 ? "up" : "down"}
                  trendValue={aggregatedMetrics.profit > 5000 ? "High Performer" : aggregatedMetrics.profit > 0 ? "Profitable" : "Loss"}
                  className="shadow-md border-2 border-accent/20 bg-gradient-to-br from-background to-accent/5"
                  isHighlighted={true}
                  valueClassName={aggregatedMetrics.getRoiClass()}
                />
                
                <StatCard
                  title="Profit Per Case"
                  value={formatCurrency(aggregatedMetrics.profitPerCase)}
                  icon={<FileCheck className="h-5 w-5" />}
                  trend={aggregatedMetrics.profitPerCase > 0 ? "up" : "down"}
                  trendValue={aggregatedMetrics.profitPerCase > 500 ? "Excellent" : "Average"}
                  className="shadow-md border-2 border-accent/20 bg-gradient-to-br from-background to-accent/5"
                  isHighlighted={true}
                  valueClassName={aggregatedMetrics.profitPerCase > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
                />
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {aggregatedMetrics && (
                <PerformanceSummary key={`performance-${dateKey}`} />
              )}
              
              {aggregatedMetrics && (
                <Card className="shadow-md border-accent/30 overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Target Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                        <span className="text-sm text-muted-foreground block mb-1">Cases Target</span>
                        <span className="text-xl font-semibold">{formatNumber(aggregatedMetrics.totalTargetRetainers)}</span>
                      </div>
                      <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                        <span className="text-sm text-muted-foreground block mb-1">Target Ad Spend</span>
                        <span className="text-xl font-semibold">{formatCurrency(aggregatedMetrics.totalTargetSpend)}</span>
                      </div>
                      <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                        <span className="text-sm text-muted-foreground block mb-1">Target Revenue</span>
                        <span className="text-xl font-semibold">{formatCurrency(aggregatedMetrics.totalTargetIncome)}</span>
                      </div>
                      <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                        <span className="text-sm text-muted-foreground block mb-1">Target ROI</span>
                        <span className="text-xl font-semibold">200%</span>
                      </div>
                    </div>
                    
                    <div className="mt-6 bg-gradient-to-br from-background to-accent/10 rounded-lg p-6 border shadow-sm">
                      <h4 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Performance vs. Targets</h4>
                      
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium flex items-center gap-1">
                              <TrendingUp className="h-4 w-4 text-muted-foreground" />
                              ROAS
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={aggregatedMetrics.roi >= 200 ? "text-success-DEFAULT font-bold" : "text-error-DEFAULT font-bold"}>
                                {aggregatedMetrics.roi.toFixed(1)}%
                              </span>
                              <span className="text-muted-foreground text-xs">vs 200%</span>
                            </div>
                          </div>
                          <CustomProgressBar 
                            value={aggregatedMetrics.roiProgress} 
                            variant={aggregatedMetrics.getRoiVariant()} 
                            size="md" 
                            showValue 
                            valuePosition="inside"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium flex items-center gap-1">
                              <FileCheck className="h-4 w-4 text-muted-foreground" />
                              Cases
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={aggregatedMetrics.totalCases >= aggregatedMetrics.totalTargetRetainers ? "text-success-DEFAULT font-bold" : "text-error-DEFAULT font-bold"}>
                                {aggregatedMetrics.totalCases}
                              </span>
                              <span className="text-muted-foreground text-xs">vs {aggregatedMetrics.totalTargetRetainers}</span>
                            </div>
                          </div>
                          <CustomProgressBar 
                            value={aggregatedMetrics.leadProgress} 
                            variant={aggregatedMetrics.getCasesVariant()} 
                            size="md" 
                            showValue 
                            valuePosition="inside"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-medium flex items-center gap-1">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              Profit
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={aggregatedMetrics.profit >= aggregatedMetrics.totalTargetIncome * 0.5 ? "text-success-DEFAULT font-bold" : "text-error-DEFAULT font-bold"}>
                                {formatCurrency(aggregatedMetrics.profit)}
                              </span>
                              <span className="text-muted-foreground text-xs">vs {formatCurrency(aggregatedMetrics.totalTargetIncome * 0.5)}</span>
                            </div>
                          </div>
                          <CustomProgressBar 
                            value={aggregatedMetrics.profitProgress} 
                            variant={aggregatedMetrics.getProfitVariant()} 
                            size="md" 
                            showValue 
                            valuePosition="inside"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <DailyAveragesSection key={`averages-${dateKey}`} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3">
                <OverviewStats key={`overview-${dateKey}`} />
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
