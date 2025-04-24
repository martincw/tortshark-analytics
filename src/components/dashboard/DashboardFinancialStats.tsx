
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useCampaign } from "@/contexts/CampaignContext";
import { formatDateForStorage, parseStoredDate, formatDisplayDate } from "@/lib/utils/ManualDateUtils";

interface FinancialStats {
  revenue: number;
  cost: number;
  profit: number;
}

const DashboardFinancialStats: React.FC = () => {
  const { dateRange } = useCampaign();
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDateString, setSelectedDateString] = useState<string>(formatDateForStorage(new Date()));
  
  useEffect(() => {
    if (dateRange.startDate) {
      console.log('DashboardFinancialStats: Using exact date string from context:', dateRange.startDate);
      
      const parsedDate = parseStoredDate(dateRange.startDate);
      setSelectedDate(parsedDate);
      
      setSelectedDateString(dateRange.startDate);
    }
  }, [dateRange]);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const dateStr = formatDateForStorage(date);
      console.log('Financial Stats - Selected date object:', date);
      console.log('Financial Stats - Formatted date string for storage:', dateStr);
      
      setSelectedDate(date);
      setSelectedDateString(dateStr);
    }
  };

  useEffect(() => {
    async function fetchFinancialStats() {
      if (!selectedDateString) return;
      
      setLoading(true);
      console.log('Fetching financial stats for exact date:', selectedDateString);
      
      const { data: adSpendData, error: adSpendError } = await supabase
        .from('campaign_stats')
        .select('ad_spend')
        .eq('date', selectedDateString);

      const { data: revenueData, error: revenueError } = await supabase
        .from('campaign_stats_history')
        .select('revenue')
        .eq('date', selectedDateString);

      if (adSpendError) {
        console.error('Error fetching ad spend data:', adSpendError);
        setLoading(false);
        return;
      }

      if (revenueError) {
        console.error('Error fetching revenue data:', revenueError);
        setLoading(false);
        return;
      }

      const totalCost = adSpendData?.reduce((sum, row) => sum + Number(row.ad_spend || 0), 0) || 0;
      const totalRevenue = revenueData?.reduce((sum, row) => sum + Number(row.revenue || 0), 0) || 0;
      const profit = totalRevenue - totalCost;

      console.log('Financial data for date', selectedDateString, {
        revenue: totalRevenue,
        cost: totalCost,
        profit,
        entries: {
          adSpend: adSpendData?.length || 0,
          revenue: revenueData?.length || 0
        }
      });

      setStats({
        revenue: totalRevenue,
        cost: totalCost,
        profit
      });
      
      setLoading(false);
    }

    fetchFinancialStats();
  }, [selectedDateString]);

  const formatDateForDisplay = (date: Date) => {
    return format(date, "MMMM d, yyyy");
  };

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="mb-4">
          <Label htmlFor="dashboardDate" className="mb-2 block">Select Date</Label>
          <DatePicker 
            date={selectedDate} 
            onSelect={handleDateChange}
            className="w-full" 
          />
        </div>
        
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading stats...</div>
        ) : selectedDate && stats ? (
          <div className="grid grid-cols-3 gap-4 mt-4">
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
            {selectedDate ? 
              `No stats available for ${formatDateForDisplay(selectedDate)}` : 
              'Please select a date to view stats'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardFinancialStats;
