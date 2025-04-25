
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, DollarSign, TrendingUp } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { differenceInDays, parseISO } from "date-fns";
import { formatCurrency, formatNumber } from "@/utils/campaignUtils";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";

interface DailyAveragesSectionProps {
  filteredCampaigns: Campaign[];
}

export function DailyAveragesSection({ filteredCampaigns }: DailyAveragesSectionProps) {
  const { dateRange } = useCampaign();
  
  const averages = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate || !filteredCampaigns) {
      return {
        adSpend: 0,
        leads: 0,
        cases: 0,
        revenue: 0,
        profit: 0,
        roi: 0,
        daysInRange: 1
      };
    }
    
    // Calculate total metrics within date range
    let totalAdSpend = 0;
    let totalLeads = 0;
    let totalCases = 0;
    let totalRevenue = 0;
    
    filteredCampaigns.forEach(campaign => {
      campaign.statsHistory.forEach(entry => {
        if (isDateInRange(entry.date, dateRange.startDate!, dateRange.endDate!)) {
          totalAdSpend += entry.adSpend || 0;
          totalLeads += entry.leads || 0;
          totalCases += entry.cases || 0;
          totalRevenue += entry.revenue || 0;
        }
      });
    });
    
    // Calculate number of days in the selected range
    const startDate = parseISO(dateRange.startDate);
    const endDate = parseISO(dateRange.endDate);
    const daysInRange = differenceInDays(endDate, startDate) + 1;
    
    // Calculate daily averages
    const dailyAdSpend = totalAdSpend / daysInRange;
    const dailyLeads = totalLeads / daysInRange;
    const dailyCases = totalCases / daysInRange;
    const dailyRevenue = totalRevenue / daysInRange;
    const dailyProfit = dailyRevenue - dailyAdSpend;
    const roi = dailyAdSpend > 0 ? (dailyProfit / dailyAdSpend) * 100 : 0;
    
    return {
      adSpend: dailyAdSpend,
      leads: dailyLeads,
      cases: dailyCases,
      revenue: dailyRevenue,
      profit: dailyProfit,
      roi,
      daysInRange
    };
  }, [filteredCampaigns, dateRange]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <BarChart className="h-5 w-5 text-primary" />
          Daily Performance Averages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-error-DEFAULT/10 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Daily Ad Spend
            </div>
            <div className="text-xl font-bold text-error-DEFAULT">
              {formatCurrency(averages.adSpend)}
            </div>
          </div>
          
          <div className="bg-accent/10 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <BarChart className="h-4 w-4" />
              Daily Leads
            </div>
            <div className="text-xl font-bold">
              {averages.leads.toFixed(1)}
            </div>
          </div>
          
          <div className="bg-accent/10 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <BarChart className="h-4 w-4" />
              Daily Cases
            </div>
            <div className="text-xl font-bold">
              {averages.cases.toFixed(1)}
            </div>
          </div>
          
          <div className="bg-success-DEFAULT/10 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Daily Revenue
            </div>
            <div className="text-xl font-bold text-success-DEFAULT">
              {formatCurrency(averages.revenue)}
            </div>
          </div>
          
          <div className="bg-success-DEFAULT/10 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Daily Profit
            </div>
            <div className="text-xl font-bold text-success-DEFAULT">
              {formatCurrency(averages.profit)}
            </div>
          </div>
          
          <div className="bg-accent/10 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Daily ROI
            </div>
            <div className="text-xl font-bold">
              {averages.roi.toFixed(1)}%
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
