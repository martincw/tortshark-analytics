
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { isDateInRange, parseStoredDate } from "@/lib/utils/ManualDateUtils";
import { cn } from "@/lib/utils";

interface FinancialStats {
  revenue: number;
  cost: number;
  profit: number;
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
        
        relevantCampaigns.forEach(campaign => {
          campaign.statsHistory.forEach(entry => {
            if (isDateInRange(entry.date, dateRange.startDate!, dateRange.endDate!)) {
              totalRevenue += entry.revenue || 0;
              totalCost += entry.adSpend || 0;
            }
          });
        });
        
        const profit = totalRevenue - totalCost;
        
        console.log('Financial data calculated:', {
          revenue: totalRevenue,
          cost: totalCost,
          profit,
          dateRange,
          campaignsCount: relevantCampaigns.length
        });
        
        setStats({
          revenue: totalRevenue,
          cost: totalCost,
          profit
        });
      } catch (error) {
        console.error('Error calculating financial stats:', error);
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
          <div className="grid grid-cols-3 gap-4">
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
