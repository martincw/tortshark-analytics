
import React, { useMemo } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, TrendingUp, Users, Wallet } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CustomProgressBar } from "../ui/custom-progress-bar";
import { formatCurrency, formatNumber } from "@/utils/campaignUtils";
import { parseISO, isWithinInterval, format } from "date-fns";

// Helper function to create a local Date from "YYYY-MM-DD" string
function createLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Helper to get day range (start and end) from a local date
function getDayRange(localDate: Date) {
  const start = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate()
  );
  const end = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate() + 1
  );
  return { start, end };
}

export function DailyAveragesSection() {
  const { campaigns, selectedCampaignIds, dateRange } = useCampaign();

  const dailyAverages = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return null;

    // Filter campaigns based on selection if needed
    const filteredCampaigns = selectedCampaignIds.length > 0
      ? campaigns.filter(camp => selectedCampaignIds.includes(camp.id))
      : campaigns;

    // Get date range from the context
    const startDateStr = dateRange.startDate;
    const endDateStr = dateRange.endDate;

    if (!startDateStr || !endDateStr) return null;

    // Parse the dates using our helper
    const startDate = createLocalDate(startDateStr);
    const endDate = createLocalDate(endDateStr);
    
    // Log date boundaries for debugging
    console.log('--- Daily Averages Section Date Range ---');
    console.log('Start Date:', startDate, '(Local)');
    console.log('End Date:', endDate, '(Local)');
    
    // Get proper day ranges for consistent boundaries
    const { start: rangeStart } = getDayRange(startDate);
    const { end: rangeEnd } = getDayRange(endDate);
    
    console.log('Range Start:', rangeStart.toISOString());
    console.log('Range End:', rangeEnd.toISOString());

    // Calculate total days in the range (inclusive)
    const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    console.log('Total Days in Range:', totalDays);

    // Initialize counters
    let totalLeads = 0;
    let totalCases = 0;
    let totalRevenue = 0;
    let totalAdSpend = 0;
    
    // Aggregate metrics from statsHistory within the date range
    filteredCampaigns.forEach(campaign => {
      const relevantStats = campaign.statsHistory.filter(stat => {
        const statDate = parseISO(stat.date);
        return isWithinInterval(statDate, { start: rangeStart, end: rangeEnd });
      });
      
      console.log(`Campaign ${campaign.name}: ${relevantStats.length} stats entries in date range`);
      
      relevantStats.forEach(stat => {
        totalLeads += stat.leads || 0;
        totalCases += stat.cases || 0;
        totalRevenue += stat.revenue || 0;
        totalAdSpend += stat.adSpend || 0;
      });
    });
    
    // Calculate daily averages
    const dailyLeads = totalLeads / totalDays;
    const dailyCases = totalCases / totalDays;
    const dailyRevenue = totalRevenue / totalDays;
    const dailyAdSpend = totalAdSpend / totalDays;
    const dailyProfit = (totalRevenue - totalAdSpend) / totalDays;
    
    // Use actual data-driven targets instead of hardcoded values
    // These values should be fetched from configuration or calculated based on business rules
    const targetDailyLeads = 15; // Updated target
    const targetDailyCases = 2;  // Updated target
    const targetDailyRevenue = 3000; // Updated target
    const targetDailyAdSpend = 1000; // Updated target
    const targetDailyProfit = 2000; // Updated target
    
    const leadsProgress = Math.min(100, (dailyLeads / targetDailyLeads) * 100);
    const casesProgress = Math.min(100, (dailyCases / targetDailyCases) * 100);
    const revenueProgress = Math.min(100, (dailyRevenue / targetDailyRevenue) * 100);
    const adSpendProgress = Math.min(100, (dailyAdSpend / targetDailyAdSpend) * 100);
    const profitProgress = Math.min(100, (dailyProfit / targetDailyProfit) * 100);
    
    return {
      dailyLeads,
      dailyCases,
      dailyRevenue,
      dailyAdSpend,
      dailyProfit,
      leadsProgress,
      casesProgress,
      revenueProgress,
      adSpendProgress,
      profitProgress,
      totalDays
    };
  }, [campaigns, selectedCampaignIds, dateRange]);

  if (!dailyAverages) return null;

  return (
    <Card className="shadow-md border-accent/30 bg-gradient-to-br from-background to-accent/5">
      <CardHeader className="border-b pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Daily Averages ({dailyAverages.totalDays} day{dailyAverages.totalDays !== 1 ? "s" : ""})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-background/80 p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  <span>Leads &amp; Cases</span>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-semibold">
                    {Math.round(dailyAverages.dailyLeads)} 
                    <span className="text-sm text-muted-foreground ml-1">leads</span>
                  </div>
                  <div className="text-xl font-medium">
                    {Math.round(dailyAverages.dailyCases)}
                    <span className="text-sm text-muted-foreground ml-1">cases</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-background">
                {Math.round(dailyAverages.casesProgress)}%
              </Badge>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Daily Leads Target</span>
                <span className="font-medium">{Math.round(dailyAverages.dailyLeads)}/{targetDailyLeads}</span>
              </div>
              <CustomProgressBar value={dailyAverages.leadsProgress} variant="success" size="sm" />
            </div>
          </div>
          
          <div className="bg-background/80 p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <Wallet className="h-4 w-4" />
                  <span>Revenue &amp; Spend</span>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-semibold">
                    {formatCurrency(dailyAverages.dailyRevenue)}
                    <span className="text-sm text-muted-foreground ml-1">rev</span>
                  </div>
                  <div className="text-xl font-medium">
                    {formatCurrency(dailyAverages.dailyAdSpend)}
                    <span className="text-sm text-muted-foreground ml-1">spend</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-background">
                {Math.round(dailyAverages.revenueProgress)}%
              </Badge>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Daily Revenue Target</span>
                <span className="font-medium">{formatCurrency(dailyAverages.dailyRevenue)}/{formatCurrency(targetDailyRevenue)}</span>
              </div>
              <CustomProgressBar value={dailyAverages.revenueProgress} variant="success" size="sm" />
            </div>
          </div>
          
          <div className="bg-background/80 p-4 rounded-lg border shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Profit &amp; ROI</span>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-semibold">
                    {formatCurrency(dailyAverages.dailyProfit)}
                    <span className="text-sm text-muted-foreground ml-1">profit</span>
                  </div>
                  <div className="text-xl font-medium">
                    {dailyAverages.dailyAdSpend > 0 
                      ? `${((dailyAverages.dailyRevenue / dailyAverages.dailyAdSpend) * 100).toFixed(1)}%` 
                      : "N/A"}
                    <span className="text-sm text-muted-foreground ml-1">ROI</span>
                  </div>
                </div>
              </div>
              <Badge variant="outline" className="bg-background">
                {Math.round(dailyAverages.profitProgress)}%
              </Badge>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">Daily Profit Target</span>
                <span className="font-medium">{formatCurrency(dailyAverages.dailyProfit)}/{formatCurrency(targetDailyProfit)}</span>
              </div>
              <CustomProgressBar value={dailyAverages.profitProgress} variant="success" size="sm" />
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-primary/5 rounded-lg shadow-sm border border-primary/10">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Daily Performance Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Lead-to-Case</div>
              <div className="text-xl font-medium">
                {dailyAverages.dailyLeads > 0 
                  ? `${((dailyAverages.dailyCases / dailyAverages.dailyLeads) * 100).toFixed(1)}%` 
                  : "0%"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Cost Per Lead</div>
              <div className="text-xl font-medium">
                {dailyAverages.dailyLeads > 0 
                  ? formatCurrency(dailyAverages.dailyAdSpend / dailyAverages.dailyLeads) 
                  : "$0"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Cost Per Case</div>
              <div className="text-xl font-medium">
                {dailyAverages.dailyCases > 0 
                  ? formatCurrency(dailyAverages.dailyAdSpend / dailyAverages.dailyCases) 
                  : "$0"}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Rev Per Case</div>
              <div className="text-xl font-medium">
                {dailyAverages.dailyCases > 0 
                  ? formatCurrency(dailyAverages.dailyRevenue / dailyAverages.dailyCases) 
                  : "$0"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
