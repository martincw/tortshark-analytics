
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, DollarSign, TrendingUp, Info } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { differenceInDays, parseISO, format } from "date-fns";
import { formatCurrency } from "@/utils/campaignUtils";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";

interface DailyAveragesSectionProps {
  filteredCampaigns: Campaign[];
}

export function DailyAveragesSection({ filteredCampaigns }: DailyAveragesSectionProps) {
  const { dateRange } = useCampaign();
  
  const averages = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate || !filteredCampaigns.length) {
      return {
        adSpend: 0,
        leads: 0,
        cases: 0,
        revenue: 0,
        profit: 0,
        roas: 0,
        conversionRate: 0,
        costPerLead: 0,
        earningsPerLead: 0,
        daysInRange: 1,
        excludesToday: false,
        displayDateRange: ""
      };
    }
    
    // Check if today falls within the date range
    const today = new Date();
    const todayString = format(today, 'yyyy-MM-dd');
    const todayInRange = isDateInRange(todayString, dateRange.startDate, dateRange.endDate);
    
    // Calculate total metrics within date range
    let totalAdSpend = 0;
    let totalLeads = 0;
    let totalCases = 0;
    let totalRevenue = 0;
    
    // Track which days have entries to calculate true average
    const daysWithEntries = new Set<string>();
    
    // Check if we have any entries for today
    let hasEntriesForToday = false;
    
    filteredCampaigns.forEach(campaign => {
      campaign.statsHistory.forEach(entry => {
        // Check if this entry is for today
        if (entry.date === todayString) {
          hasEntriesForToday = true;
        }
        
        // Only include entries within date range
        if (isDateInRange(entry.date, dateRange.startDate!, dateRange.endDate!)) {
          // If it's today and we don't have entries for today across any campaign, skip
          if (entry.date === todayString && todayInRange && !hasEntriesForToday) {
            return;
          }
          
          totalAdSpend += entry.adSpend || 0;
          totalLeads += entry.leads || 0;
          totalCases += entry.cases || 0;
          totalRevenue += entry.revenue || 0;
          daysWithEntries.add(entry.date);
        }
      });
    });
    
    // Calculate number of days in the selected range
    const startDate = parseISO(dateRange.startDate);
    const endDate = parseISO(dateRange.endDate);
    let daysInRange = differenceInDays(endDate, startDate) + 1;
    
    // If today is in range but has no entries, exclude it from days in range
    const excludesToday = todayInRange && !hasEntriesForToday;
    if (excludesToday) {
      daysInRange--;
    }
    
    // Calculate display date range for subtitle
    let displayDateRange = `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    if (excludesToday) {
      // If excluding today, show the updated end date
      const adjustedEndDate = new Date(today);
      adjustedEndDate.setDate(today.getDate() - 1);
      displayDateRange = `${format(startDate, 'MMM d')} - ${format(adjustedEndDate, 'MMM d, yyyy')}`;
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
      earningsPerLead,
      daysInRange: effectiveDays,
      excludesToday,
      displayDateRange
    };
  }, [filteredCampaigns, dateRange]);

  // Helper function to determine ROAS color class
  const getRoasColorClass = (roas: number) => {
    if (roas >= 300) return "from-success-DEFAULT/5 to-success-DEFAULT/15 border-success-DEFAULT/20 text-success-DEFAULT";
    if (roas >= 200) return "from-warning-DEFAULT/5 to-warning-DEFAULT/15 border-warning-DEFAULT/20 text-warning-DEFAULT";
    return "from-error-DEFAULT/5 to-error-DEFAULT/15 border-error-DEFAULT/20 text-error-DEFAULT";
  };

  // Helper function to determine CVR color class
  const getCvrColorClass = (cvr: number) => {
    if (cvr >= 30) return "from-success-DEFAULT/5 to-success-DEFAULT/15 border-success-DEFAULT/20 text-success-DEFAULT";
    if (cvr >= 15) return "from-warning-DEFAULT/5 to-warning-DEFAULT/15 border-warning-DEFAULT/20 text-warning-DEFAULT";
    return "from-error-DEFAULT/5 to-error-DEFAULT/15 border-error-DEFAULT/20 text-error-DEFAULT";
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <BarChart className="h-5 w-5 text-primary" />
          Daily Performance Averages
          {averages.excludesToday && (
            <div className="ml-2 text-xs text-muted-foreground flex items-center">
              <Info className="h-3 w-3 mr-1" />
              Today excluded (no data)
            </div>
          )}
        </CardTitle>
        {averages.displayDateRange && (
          <p className="text-xs text-muted-foreground mt-1">
            Based on data from {averages.displayDateRange}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Cost Metrics - Red gradient theme */}
          <div className="bg-gradient-to-br from-error-DEFAULT/5 to-error-DEFAULT/15 p-4 rounded-lg border border-error-DEFAULT/20 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-error-DEFAULT" />
              Daily Ad Spend
            </div>
            <div className="text-xl font-bold text-error-DEFAULT">
              {formatCurrency(averages.adSpend)}
            </div>
          </div>
          
          {/* Volume Metrics - Purple/blue gradient theme */}
          <div className="bg-gradient-to-br from-primary/5 to-primary/15 p-4 rounded-lg border border-primary/20 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <BarChart className="h-4 w-4 text-primary" />
              Daily Leads
            </div>
            <div className="text-xl font-bold text-primary">
              {averages.leads.toFixed(1)}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-primary/5 to-primary/15 p-4 rounded-lg border border-primary/20 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <BarChart className="h-4 w-4 text-primary" />
              Daily Cases
            </div>
            <div className="text-xl font-bold text-primary">
              {averages.cases.toFixed(1)}
            </div>
          </div>
          
          {/* Performance Metrics - Conditional styling based on values */}
          <div className="bg-gradient-to-br from-success-DEFAULT/5 to-success-DEFAULT/15 p-4 rounded-lg border border-success-DEFAULT/20 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-success-DEFAULT" />
              Daily Revenue
            </div>
            <div className="text-xl font-bold text-success-DEFAULT">
              {formatCurrency(averages.revenue)}
            </div>
          </div>
          
          <div className={`bg-gradient-to-br ${averages.profit >= 0 
            ? "from-success-DEFAULT/5 to-success-DEFAULT/15 border-success-DEFAULT/20" 
            : "from-error-DEFAULT/5 to-error-DEFAULT/15 border-error-DEFAULT/20"} 
            p-4 rounded-lg border shadow-sm`}>
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-foreground" />
              Daily Profit
            </div>
            <div className={`text-xl font-bold ${averages.profit >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
              {formatCurrency(averages.profit)}
            </div>
          </div>
          
          <div className={`bg-gradient-to-br ${getRoasColorClass(averages.roas)} 
            p-4 rounded-lg border shadow-sm`}>
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Daily ROAS
            </div>
            <div className="text-xl font-bold">
              {(averages.roas || 0).toFixed(1)}%
            </div>
            {averages.roas >= 300 && (
              <div className="text-xs mt-1 text-success-DEFAULT">Excellent</div>
            )}
            {averages.roas >= 200 && averages.roas < 300 && (
              <div className="text-xs mt-1 text-warning-DEFAULT">Good</div>
            )}
          </div>
          
          {/* New row for CVR, CPL, and EPL with updated styling */}
          <div className={`bg-gradient-to-br ${getCvrColorClass(averages.conversionRate)} 
            p-4 rounded-lg border shadow-sm`}>
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              CVR
            </div>
            <div className="text-xl font-bold">
              {(averages.conversionRate || 0).toFixed(1)}%
            </div>
            {averages.conversionRate >= 30 && (
              <div className="text-xs mt-1 text-success-DEFAULT">High</div>
            )}
          </div>
          
          <div className="bg-gradient-to-br from-error-DEFAULT/5 to-error-DEFAULT/15 p-4 rounded-lg border border-error-DEFAULT/20 shadow-sm">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-error-DEFAULT" />
              CPL
            </div>
            <div className="text-xl font-bold text-error-DEFAULT">
              {formatCurrency(averages.costPerLead)}
            </div>
          </div>
          
          <div className={`bg-gradient-to-br ${averages.earningsPerLead > averages.costPerLead 
            ? "from-success-DEFAULT/5 to-success-DEFAULT/15 border-success-DEFAULT/20" 
            : "from-warning-DEFAULT/5 to-warning-DEFAULT/15 border-warning-DEFAULT/20"} 
            p-4 rounded-lg border shadow-sm`}>
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4 text-foreground" />
              EPL
            </div>
            <div className={`text-xl font-bold ${averages.earningsPerLead > averages.costPerLead ? "text-success-DEFAULT" : ""}`}>
              {formatCurrency(averages.earningsPerLead)}
            </div>
            {averages.earningsPerLead > averages.costPerLead && (
              <div className="text-xs mt-1 text-success-DEFAULT">Profitable</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
