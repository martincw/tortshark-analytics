
import React, { useMemo } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { BarChart, Calendar, DollarSign, ArrowUpDown, Users, LineChart, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { isWithinInterval, parseISO, startOfDay, endOfDay, differenceInDays, format } from "date-fns";

export function DailyAveragesSection() {
  const { campaigns, selectedCampaignIds, dateRange } = useCampaign();
  
  const dailyAverages = useMemo(() => {
    // Filter campaigns based on selection
    const filteredCampaigns = selectedCampaignIds.length > 0
      ? campaigns.filter(camp => selectedCampaignIds.includes(camp.id))
      : campaigns;
    
    if (filteredCampaigns.length === 0) {
      return {
        dates: {
          startDate: "N/A",
          endDate: "N/A",
          daysInRange: 0
        },
        metrics: {
          adSpend: 0,
          leads: 0,
          cases: 0,
          revenue: 0,
          profit: 0,
          costPerLead: 0,
          costPerCase: 0,
          revenuePerCase: 0,
          conversionRate: 0,
          roi: 0
        }
      };
    }
    
    // Get date range for filtering
    const startDateStr = dateRange.startDate;
    const endDateStr = dateRange.endDate;
    let totalDays = 1; // Default to 1 to avoid division by zero
    
    // Calculate total stats within date range
    let totalLeads = 0;
    let totalCases = 0;
    let totalRevenue = 0;
    let totalAdSpend = 0;
    
    if (startDateStr && endDateStr) {
      // Create date objects with time set to start/end of day
      const startDate = startOfDay(new Date(startDateStr + "T12:00:00Z"));
      const endDate = endOfDay(new Date(endDateStr + "T12:00:00Z"));
      
      // Calculate number of days in the range (add 1 because it's inclusive)
      totalDays = Math.max(1, differenceInDays(endDate, startDate) + 1);
      
      // Aggregate metrics across campaigns with date filtering
      filteredCampaigns.forEach(campaign => {
        // Filter statsHistory by date range
        const filteredStats = campaign.statsHistory.filter(stat => {
          const statDate = parseISO(stat.date);
          return isWithinInterval(statDate, { start: startDate, end: endDate });
        });
        
        // Sum up filtered stats
        totalLeads += filteredStats.reduce((sum, stat) => sum + stat.leads, 0);
        totalCases += filteredStats.reduce((sum, stat) => sum + stat.cases, 0);
        totalRevenue += filteredStats.reduce((sum, stat) => sum + stat.revenue, 0);
        totalAdSpend += filteredStats.reduce((sum, stat) => sum + (stat.adSpend || 0), 0);
      });
    } else {
      // If no date range, use summary stats
      filteredCampaigns.forEach(campaign => {
        totalLeads += campaign.manualStats.leads || 0;
        totalCases += campaign.manualStats.cases || 0;
        totalRevenue += campaign.manualStats.revenue || 0;
        totalAdSpend += campaign.stats.adSpend || 0;
      });
      
      // Default to 30 days for summary view
      totalDays = 30;
    }
    
    // Calculate derived metrics
    const totalProfit = totalRevenue - totalAdSpend;
    
    // Calculate daily averages
    const dailyAdSpend = totalAdSpend / totalDays;
    const dailyLeads = totalLeads / totalDays;
    const dailyCases = totalCases / totalDays;
    const dailyRevenue = totalRevenue / totalDays;
    const dailyProfit = totalProfit / totalDays;
    
    // Calculate efficiency metrics
    const costPerLead = dailyLeads > 0 ? dailyAdSpend / dailyLeads : 0;
    const costPerCase = dailyCases > 0 ? dailyAdSpend / dailyCases : 0;
    const revenuePerCase = dailyCases > 0 ? dailyRevenue / dailyCases : 0;
    const conversionRate = dailyLeads > 0 ? (dailyCases / dailyLeads) * 100 : 0;
    const roi = dailyAdSpend > 0 ? (dailyProfit / dailyAdSpend) * 100 : 0;
    
    return {
      dates: {
        startDate: startDateStr ? format(new Date(startDateStr), "MMM d, yyyy") : "N/A",
        endDate: endDateStr ? format(new Date(endDateStr), "MMM d, yyyy") : "N/A",
        daysInRange: totalDays
      },
      metrics: {
        adSpend: dailyAdSpend,
        leads: dailyLeads,
        cases: dailyCases,
        revenue: dailyRevenue,
        profit: dailyProfit,
        costPerLead,
        costPerCase,
        revenuePerCase,
        conversionRate,
        roi
      }
    };
  }, [campaigns, selectedCampaignIds, dateRange]);

  if (campaigns.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Daily Averages 
          <span className="text-sm font-normal text-muted-foreground ml-auto">
            {dailyAverages.dates.daysInRange} day{dailyAverages.dates.daysInRange !== 1 ? 's' : ''} 
            {dailyAverages.dates.startDate !== "N/A" && ` (${dailyAverages.dates.startDate} - ${dailyAverages.dates.endDate})`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Daily Financial Metrics */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground mb-3">
              <DollarSign className="h-4 w-4" />
              Daily Financial Metrics
            </h3>
            
            <div className="bg-accent/10 p-4 rounded-lg space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Daily Ad Spend</div>
                <div className="text-xl font-semibold">{formatCurrency(dailyAverages.metrics.adSpend)}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Daily Revenue</div>
                <div className="text-xl font-semibold">{formatCurrency(dailyAverages.metrics.revenue)}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Daily Profit</div>
                <div className={cn(
                  "text-xl font-semibold",
                  dailyAverages.metrics.profit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"
                )}>
                  {formatCurrency(dailyAverages.metrics.profit)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Daily Acquisition Metrics */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground mb-3">
              <Users className="h-4 w-4" />
              Daily Acquisition Metrics
            </h3>
            
            <div className="bg-accent/10 p-4 rounded-lg space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Daily Leads</div>
                <div className="text-xl font-semibold">{formatNumber(dailyAverages.metrics.leads, 1)}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Daily Cases</div>
                <div className="text-xl font-semibold">{formatNumber(dailyAverages.metrics.cases, 1)}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Conversion Rate</div>
                <div className="text-xl font-semibold">
                  {formatPercent(dailyAverages.metrics.conversionRate)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Cost Efficiency Metrics */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground mb-3">
              <Target className="h-4 w-4" />
              Cost Efficiency Metrics
            </h3>
            
            <div className="bg-accent/10 p-4 rounded-lg space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Cost Per Lead (CPL)</div>
                <div className="text-xl font-semibold">{formatCurrency(dailyAverages.metrics.costPerLead)}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Cost Per Case (CPA)</div>
                <div className="text-xl font-semibold">{formatCurrency(dailyAverages.metrics.costPerCase)}</div>
              </div>
              
              <div>
                <div className="text-sm text-muted-foreground">Return on Investment (ROI)</div>
                <div className={cn(
                  "text-xl font-semibold",
                  dailyAverages.metrics.roi > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"
                )}>
                  {formatPercent(dailyAverages.metrics.roi)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
