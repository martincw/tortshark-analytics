
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, DollarSign, TrendingUp, Info, Users, BriefcaseBusiness, Percent, Calculator } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { differenceInDays, parseISO, format, isToday } from "date-fns";
import { formatCurrency } from "@/utils/campaignUtils";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";

interface CampaignDailyAveragesProps {
  campaign: Campaign;
}

const CampaignDailyAverages: React.FC<CampaignDailyAveragesProps> = ({ campaign }) => {
  const { dateRange } = useCampaign();
  
  const averages = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return {
        adSpend: 0,
        leads: 0,
        cases: 0,
        revenue: 0,
        profit: 0,
        roas: 0,
        conversionRate: 0,
        costPerLead: 0,
        cpa: 0,
        earningsPerLead: 0,
        daysInRange: 1,
        displayDateRange: ""
      };
    }
    
    // Get today's date for filtering
    const today = new Date();
    const todayString = format(today, 'yyyy-MM-dd');
    
    // Calculate total metrics within date range, excluding today
    let totalAdSpend = 0;
    let totalLeads = 0;
    let totalCases = 0;
    let totalRevenue = 0;
    
    // Track which days have entries to calculate true average
    const daysWithEntries = new Set<string>();
    
    campaign.statsHistory.forEach(entry => {
      // Skip today's entries completely
      if (entry.date === todayString) {
        return;
      }
      
      // Only include entries within date range
      if (isDateInRange(entry.date, dateRange.startDate!, dateRange.endDate!)) {
        totalAdSpend += entry.adSpend || 0;
        totalLeads += entry.leads || 0;
        totalCases += entry.cases || 0;
        totalRevenue += entry.revenue || 0;
        daysWithEntries.add(entry.date);
      }
    });
    
    // Calculate number of days in the selected range
    const startDate = parseISO(dateRange.startDate);
    const endDate = parseISO(dateRange.endDate);
    
    // Always exclude today from the range if today is the end date
    const effectiveEndDate = isToday(endDate) ? 
      new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1) : 
      endDate;
    
    let daysInRange = differenceInDays(effectiveEndDate, startDate) + 1;
    
    // Ensure we don't have negative or zero days
    daysInRange = Math.max(daysInRange, 1);
    
    // Calculate display date range for subtitle
    let displayDateRange = `${format(startDate, 'MMM d')} - `;
    
    // If today is in the original range, show that it's excluded
    if (isToday(endDate)) {
      displayDateRange += `${format(effectiveEndDate, 'MMM d, yyyy')}`;
    } else {
      displayDateRange += `${format(endDate, 'MMM d, yyyy')}`;
    }
    
    // Use days with entries for average calculation if available, otherwise use adjusted days in range
    const effectiveDays = daysWithEntries.size > 0 ? daysWithEntries.size : daysInRange;
    
    // Calculate daily averages
    const dailyAdSpend = effectiveDays > 0 ? totalAdSpend / effectiveDays : 0;
    const dailyLeads = effectiveDays > 0 ? totalLeads / effectiveDays : 0;
    const dailyCases = effectiveDays > 0 ? totalCases / effectiveDays : 0;
    const dailyRevenue = effectiveDays > 0 ? totalRevenue / effectiveDays : 0;
    const dailyProfit = dailyRevenue - dailyAdSpend;
    const roas = dailyAdSpend > 0 ? (dailyRevenue / dailyAdSpend) * 100 : 0;
    
    // Calculate additional metrics
    const conversionRate = dailyLeads > 0 ? (dailyCases / dailyLeads) * 100 : 0;
    const costPerLead = dailyLeads > 0 ? dailyAdSpend / dailyLeads : 0;
    const cpa = dailyCases > 0 ? dailyAdSpend / dailyCases : 0;
    const earningsPerLead = dailyLeads > 0 ? dailyRevenue / dailyLeads : 0;
    
    return {
      adSpend: dailyAdSpend,
      leads: dailyLeads,
      cases: dailyCases,
      revenue: dailyRevenue,
      profit: dailyProfit,
      roas,
      conversionRate,
      costPerLead,
      cpa,
      earningsPerLead,
      daysInRange: effectiveDays,
      displayDateRange,
      todayExcluded: isToday(endDate)
    };
  }, [campaign, dateRange]);

  // Helper function to determine ROAS color class
  const getRoasColorClass = (roas: number) => {
    if (roas >= 300) return "text-metric-revenue-dark";
    if (roas >= 200) return "text-metric-ratio";
    return "text-metric-cost";
  };

  // Helper function to determine CVR color class
  const getCvrColorClass = (cvr: number) => {
    if (cvr >= 30) return "text-metric-revenue-dark";
    if (cvr >= 15) return "text-metric-ratio";
    return "text-metric-cost";
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <BarChart className="h-5 w-5 text-primary" />
          Daily Performance Averages
          <div className="ml-2 text-xs text-muted-foreground flex items-center">
            <Info className="h-3 w-3 mr-1" />
            Today's data always excluded
          </div>
        </CardTitle>
        {averages.displayDateRange && (
          <p className="text-xs text-muted-foreground mt-1">
            Based on data from {averages.displayDateRange}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Cost Metrics - Red */}
          <div className="metric-card-cost p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-metric-cost" />
              Daily Ad Spend
            </div>
            <div className="text-xl font-bold text-metric-cost">
              {formatCurrency(averages.adSpend)}
            </div>
          </div>
          
          {/* Volume Metrics - Blue */}
          <div className="metric-card-volume p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <Users className="h-4 w-4 text-metric-volume" />
              Daily Leads
            </div>
            <div className="text-xl font-bold text-metric-volume">
              {averages.leads.toFixed(1)}
            </div>
          </div>
          
          <div className="metric-card-volume p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <BriefcaseBusiness className="h-4 w-4 text-metric-volume-dark" />
              Daily Cases
            </div>
            <div className="text-xl font-bold text-metric-volume-dark">
              {averages.cases.toFixed(1)}
            </div>
          </div>
          
          {/* Revenue Metrics - Green */}
          <div className="metric-card-revenue p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-metric-revenue" />
              Daily Revenue
            </div>
            <div className="text-xl font-bold text-metric-revenue">
              {formatCurrency(averages.revenue)}
            </div>
          </div>
          
          {/* Profit Metrics - Teal */}
          <div className={`p-4 rounded-lg border shadow-sm ${
            averages.profit >= 0 ? "metric-card-profit" : "metric-card-cost"
          }`}>
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-foreground" />
              Daily Profit
            </div>
            <div className={`text-xl font-bold ${
              averages.profit >= 0 ? "text-metric-profit-dark" : "text-metric-cost"
            }`}>
              {formatCurrency(averages.profit)}
            </div>
          </div>
          
          {/* ROAS - Ratio Metrics - Orange with conditional styling */}
          <div className="metric-card-ratio p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <Percent className="h-4 w-4 text-metric-ratio" />
              Daily ROAS
            </div>
            <div className={`text-xl font-bold ${getRoasColorClass(averages.roas)}`}>
              {(averages.roas || 0).toFixed(1)}%
            </div>
            {averages.roas >= 300 && (
              <div className="text-xs mt-1 text-metric-revenue">Excellent</div>
            )}
            {averages.roas >= 200 && averages.roas < 300 && (
              <div className="text-xs mt-1 text-metric-ratio">Good</div>
            )}
            {averages.roas < 200 && (
              <div className="text-xs mt-1 text-metric-cost">Low</div>
            )}
          </div>
          
          {/* CVR - Rate Metrics - Purple with conditional styling */}
          <div className="metric-card-rate p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <Calculator className="h-4 w-4 text-metric-rate" />
              CVR
            </div>
            <div className={`text-xl font-bold ${getCvrColorClass(averages.conversionRate)}`}>
              {(averages.conversionRate || 0).toFixed(1)}%
            </div>
            {averages.conversionRate >= 30 && (
              <div className="text-xs mt-1 text-metric-revenue">High</div>
            )}
            {averages.conversionRate >= 15 && averages.conversionRate < 30 && (
              <div className="text-xs mt-1 text-metric-ratio">Medium</div>
            )}
            {averages.conversionRate < 15 && (
              <div className="text-xs mt-1 text-metric-cost">Low</div>
            )}
          </div>
          
          {/* CPL - Cost Metric (darker red) */}
          <div className="metric-card-cost p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-metric-cost-dark" />
              CPL
            </div>
            <div className="text-xl font-bold text-metric-cost-dark">
              {formatCurrency(averages.costPerLead)}
            </div>
          </div>
          
          {/* CPA - Cost Per Acquisition (darker red) */}
          <div className="metric-card-cost p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-metric-cost-dark" />
              CPA
            </div>
            <div className="text-xl font-bold text-metric-cost-dark">
              {formatCurrency(averages.cpa)}
            </div>
          </div>
          
          {/* EPL - Performance Metric (amber) */}
          <div className="metric-card-performance p-4 rounded-lg border shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-metric-performance" />
              EPL
            </div>
            <div className={`text-xl font-bold ${
              averages.earningsPerLead > averages.costPerLead 
                ? "text-metric-performance-dark" 
                : "text-foreground"
            }`}>
              {formatCurrency(averages.earningsPerLead)}
            </div>
            {averages.earningsPerLead > averages.costPerLead && (
              <div className="text-xs mt-1 text-metric-revenue">Profitable</div>
            )}
            {averages.earningsPerLead <= averages.costPerLead && (
              <div className="text-xs mt-1 text-metric-cost">Unprofitable</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CampaignDailyAverages;
