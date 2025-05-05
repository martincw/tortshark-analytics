
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet, AlertCircle, Users } from "lucide-react";
import { formatCurrency, formatPercent } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { isDateInRange, parseStoredDate } from "@/lib/utils/ManualDateUtils";
import { cn } from "@/lib/utils";

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
          partnerProfit
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div 
              className={cn(
                "p-4 rounded-lg shadow-sm",
                "bg-gradient-to-br from-sky-50 to-sky-100",
                "hover:shadow-md transition-shadow duration-300"
              )}
            >
              <div className="flex items-center gap-2 mb-1 text-sky-700 text-sm">
                <Wallet className="h-4 w-4" />
                Revenue
              </div>
              <div className="text-2xl font-bold text-sky-900">
                {formatCurrency(stats.revenue)}
              </div>
            </div>
            
            <div 
              className={cn(
                "p-4 rounded-lg shadow-sm",
                "bg-gradient-to-br from-rose-50 to-rose-100",
                "hover:shadow-md transition-shadow duration-300"
              )}
            >
              <div className="flex items-center gap-2 mb-1 text-rose-700 text-sm">
                <DollarSign className="h-4 w-4" />
                Cost
              </div>
              <div className="text-2xl font-bold text-rose-900">
                {formatCurrency(stats.cost)}
              </div>
            </div>
            
            <div 
              className={cn(
                "p-4 rounded-lg shadow-sm",
                stats.profit >= 0 
                  ? "bg-gradient-to-br from-emerald-50 to-emerald-100" 
                  : "bg-gradient-to-br from-red-50 to-red-100",
                "hover:shadow-md transition-shadow duration-300"
              )}
            >
              <div className={cn(
                "flex items-center gap-2 mb-1 text-sm",
                stats.profit >= 0 ? "text-emerald-700" : "text-red-700"
              )}>
                <TrendingUp className="h-4 w-4" />
                Profit
              </div>
              <div className={cn(
                "text-2xl font-bold",
                stats.profit >= 0 ? "text-emerald-900" : "text-red-900"
              )}>
                {formatCurrency(stats.profit)}
              </div>
            </div>

            {/* Performance Rates Card with CVR and ROAS - Updated with alternating rows */}
            <div 
              className={cn(
                "p-4 rounded-lg shadow-sm",
                "bg-gradient-to-br from-indigo-50 to-indigo-100",
                "hover:shadow-md transition-shadow duration-300"
              )}
            >
              <div className="flex items-center gap-2 mb-1 text-indigo-700 text-sm">
                <TrendingUp className="h-4 w-4" />
                Performance Rates
              </div>
              <div className="flex flex-col divide-y divide-indigo-100/30">
                <div className="flex justify-between items-center p-1.5 bg-white/80 rounded-md mb-1">
                  <span className="text-sm text-indigo-700">CVR:</span>
                  <span className="text-sm font-bold text-indigo-900">{formatPercent(stats.conversionRate)}</span>
                </div>
                <div className="flex justify-between items-center p-1.5">
                  <span className="text-sm text-indigo-700">ROAS:</span>
                  <span className={cn(
                    "text-sm font-bold",
                    stats.roas >= 200 ? "text-indigo-900" : 
                    stats.roas >= 100 ? "text-indigo-700" : "text-orange-700"
                  )}>
                    {formatPercent(stats.roas)}
                  </span>
                </div>
              </div>
            </div>

            {/* Lead Metrics Card - Updated with alternating row backgrounds */}
            <div 
              className={cn(
                "p-4 rounded-lg shadow-sm",
                "bg-gradient-to-br from-blue-50 to-blue-100",
                "hover:shadow-md transition-shadow duration-300"
              )}
            >
              <div className="flex items-center gap-2 mb-1 text-blue-700 text-sm">
                <Users className="h-4 w-4" />
                Lead Metrics
              </div>
              <div className="flex flex-col divide-y divide-blue-100/30">
                <div className="flex justify-between items-center p-1.5 bg-white/80 rounded-t-md">
                  <span className="text-sm text-blue-700">Leads:</span>
                  <span className="text-sm font-bold text-blue-900">{stats.leads}</span>
                </div>
                <div className="flex justify-between items-center p-1.5">
                  <span className="text-sm text-blue-700">CPL:</span>
                  <span className="text-sm font-bold text-blue-900">{formatCurrency(stats.costPerLead)}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-white/80">
                  <span className="text-sm text-blue-700">EPL:</span>
                  <span className="text-sm font-bold text-blue-900">{formatCurrency(stats.earningsPerLead)}</span>
                </div>
                <div className="flex justify-between items-center p-1.5">
                  <span className="text-sm text-blue-700">PPL:</span>
                  <span className="text-sm font-bold text-blue-900">{formatCurrency(stats.profitPerLead)}</span>
                </div>
                <div className="flex justify-between items-center p-1.5 bg-white/80 rounded-b-md">
                  <span className="text-sm text-blue-700">Cases:</span>
                  <span className="text-sm font-bold text-blue-900">{stats.cases}</span>
                </div>
              </div>
            </div>

            {/* Partner Profit Card */}
            <div 
              className={cn(
                "p-4 rounded-lg shadow-sm",
                stats.partnerProfit >= 0 
                  ? "bg-gradient-to-br from-green-50 to-green-100" 
                  : "bg-gradient-to-br from-red-50 to-red-100",
                "hover:shadow-md transition-shadow duration-300"
              )}
            >
              <div className={cn(
                "flex items-center gap-2 mb-1 text-sm",
                stats.partnerProfit >= 0 ? "text-green-700" : "text-red-700"
              )}>
                <DollarSign className="h-4 w-4" />
                Partner Profit
              </div>
              <div className={cn(
                "text-2xl font-bold",
                stats.partnerProfit >= 0 ? "text-green-900" : "text-red-900"
              )}>
                {formatCurrency(stats.partnerProfit)}
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
