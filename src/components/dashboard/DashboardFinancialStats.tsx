
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { isDateInRange, parseStoredDate } from "@/lib/utils/ManualDateUtils";

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
            <div className="bg-accent/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
                <Wallet className="h-4 w-4" />
                Revenue
              </div>
              <div className="text-xl font-bold">{formatCurrency(stats.revenue)}</div>
            </div>
            
            <div className="bg-accent/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
                <DollarSign className="h-4 w-4" />
                Cost
              </div>
              <div className="text-xl font-bold">{formatCurrency(stats.cost)}</div>
            </div>
            
            <div className="bg-accent/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-1 text-muted-foreground text-sm">
                <TrendingUp className="h-4 w-4" />
                Profit
              </div>
              <div className={`text-xl font-bold ${stats.profit >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`}>
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
