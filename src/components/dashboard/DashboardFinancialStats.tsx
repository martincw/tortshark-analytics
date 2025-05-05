import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet, Users, BriefcaseBusiness } from "lucide-react";
import { formatCurrency, formatPercent } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { isDateInRange, parseStoredDate } from "@/lib/utils/ManualDateUtils";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/ui/stat-card";

interface FinancialStats {
  revenue: number;
  cost: number;
  profit: number;
  roas: number;
  cases: number;
  leads: number;
  conversionRate: number;
  earningsPerLead: number;
  costPerLead: number;
  profitPerLead: number;
  partnerProfit: number;
  dailyProfit: number;
  hourlyOpportunityCost: number;
}

const DashboardFinancialStats: React.FC = () => {
  const { dateRange, selectedCampaignIds, campaigns } = useCampaign();
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  useEffect(() => {
    async function calculateFinancialStats() {
      if (!dateRange.startDate || !dateRange.endDate) return;
      
      setLoading(true);
      console.log('Calculating financial stats for date range:', dateRange);
      
      try {
        // Filter campaigns if specific ones are selected
        const relevantCampaigns = selectedCampaignIds.length > 0
          ? campaigns.filter(campaign => selectedCampaignIds.includes(campaign.id))
          : campaigns;
        
        // Calculate totals from campaign history within date range
        let totalRevenue = 0;
        let totalCost = 0;
        let totalLeads = 0;
        let totalCases = 0;
        
        relevantCampaigns.forEach(campaign => {
          campaign.statsHistory.forEach(entry => {
            if (isDateInRange(entry.date, dateRange.startDate!, dateRange.endDate!)) {
              totalRevenue += entry.revenue || 0;
              totalCost += entry.adSpend || 0;
              totalLeads += entry.leads || 0;
              totalCases += entry.cases || 0;
            }
          });
        });
        
        const profit = totalRevenue - totalCost;
        const roas = totalCost > 0 ? (totalRevenue / totalCost) * 100 : 0;
        const conversionRate = totalLeads > 0 ? (totalCases / totalLeads) * 100 : 0;
        const earningsPerLead = totalLeads > 0 ? totalRevenue / totalLeads : 0;
        const costPerLead = totalLeads > 0 ? totalCost / totalLeads : 0;
        const profitPerLead = totalLeads > 0 ? profit / totalLeads : 0;
        const partnerProfit = profit / 2;
        
        // Calculate number of days in the date range
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Calculate daily profit
        const dailyProfit = daysDiff > 0 ? partnerProfit / daysDiff : 0;
        
        // Calculate hourly opportunity cost (8-hour workday, 5-day workweek)
        const workdayHours = 8;
        const workdaysPerWeek = 5;
        const totalDays = daysDiff;
        const totalWeeks = totalDays / 7;
        const totalWorkdays = Math.min(totalDays, Math.ceil(totalWeeks * workdaysPerWeek)); // Cap at 5 days per week
        const totalWorkHours = totalWorkdays * workdayHours;
        
        // Then calculate hourly opportunity cost
        const hourlyOpportunityCost = totalWorkHours > 0 ? partnerProfit / totalWorkHours : 0;
        
        console.log('Financial data calculated:', {
          revenue: totalRevenue,
          cost: totalCost,
          profit,
          roas,
          conversionRate,
          leads: totalLeads,
          cases: totalCases,
          earningsPerLead,
          costPerLead,
          profitPerLead,
          partnerProfit,
          dailyProfit,
          hourlyOpportunityCost,
          dateRange,
          campaignsCount: relevantCampaigns.length
        });
        
        setStats({
          revenue: totalRevenue,
          cost: totalCost,
          profit,
          roas,
          conversionRate,
          leads: totalLeads,
          cases: totalCases,
          earningsPerLead,
          costPerLead,
          profitPerLead,
          partnerProfit,
          dailyProfit,
          hourlyOpportunityCost
        });
      } catch (error) {
        console.error('Error calculating financial stats:', error);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }

    calculateFinancialStats();
  }, [dateRange, campaigns, selectedCampaignIds]);

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading stats...</div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* First row: Revenue, Cost, Profit */}
            <div className="metric-card-revenue p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
                <Wallet className="h-4 w-4 text-metric-revenue" />
                Revenue
              </div>
              <div className="text-xl font-bold text-metric-revenue-dark">
                {formatCurrency(stats.revenue)}
              </div>
            </div>
            
            <div className="metric-card-cost p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
                <DollarSign className="h-4 w-4 text-metric-cost" />
                Cost
              </div>
              <div className="text-xl font-bold text-metric-cost-dark">
                {formatCurrency(stats.cost)}
              </div>
            </div>
            
            <div className={`p-4 rounded-lg border shadow-sm ${
              stats.profit >= 0 ? "metric-card-profit" : "metric-card-cost"
            }`}>
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4 text-foreground" />
                Profit
              </div>
              <div className={`text-xl font-bold ${
                stats.profit >= 0 ? "text-metric-profit-dark" : "text-metric-cost"
              }`}>
                {formatCurrency(stats.profit)}
              </div>
            </div>

            {/* Second row: Leads, Cases, Partner Profit */}
            <div className="metric-card-volume p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
                <Users className="h-4 w-4 text-metric-volume" />
                Leads
              </div>
              <div className="text-xl font-bold text-metric-volume-dark">
                {stats.leads.toString()}
              </div>
              <div className="text-xs mt-1 text-muted-foreground">
                Total leads generated in period
              </div>
            </div>
            
            <div className="metric-card-volume p-4 rounded-lg border shadow-sm">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
                <BriefcaseBusiness className="h-4 w-4 text-metric-volume-dark" />
                Cases
              </div>
              <div className="text-xl font-bold text-metric-volume-dark">
                {stats.cases.toString()}
              </div>
              <div className="text-xs mt-1 text-muted-foreground">
                Converted cases in period
              </div>
            </div>

            {/* Partner Profit Card with daily and hourly metrics */}
            <div className={`p-4 rounded-lg border shadow-sm ${
              stats.partnerProfit >= 0 ? "metric-card-profit" : "metric-card-cost"
            }`}>
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
                <DollarSign className="h-4 w-4 text-foreground" />
                Partner Profit
              </div>
              <div className={`text-xl font-bold ${
                stats.partnerProfit >= 0 ? "text-metric-profit-dark" : "text-metric-cost"
              }`}>
                {formatCurrency(stats.partnerProfit)}
              </div>
              <div className="text-xs mt-1 text-muted-foreground">
                Daily: {formatCurrency(stats.dailyProfit)} | Hourly: {formatCurrency(stats.hourlyOpportunityCost)}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            {dateRange.startDate ? 
              `No stats available for selected date range` : 
              'Please select a date range to view stats'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardFinancialStats;
