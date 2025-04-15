
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { useCampaign } from "@/contexts/CampaignContext";

//
// Financial Stats Data Type
//
interface FinancialStats {
  revenue: number;
  cost: number;
  profit: number;
}

// Helper function to format a Date to YYYY-MM-DD string
function formatDateToString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper function to get start and end timestamps for a day
// This completely eliminates timezone issues by using date strings
function getDayRangeAsStrings(dateStr: string) {
  // Start of day is the dateStr at 00:00:00
  const startStr = `${dateStr}T00:00:00`;
  
  // End of day is the dateStr at 23:59:59
  const endStr = `${dateStr}T23:59:59`;
  
  console.log('Financial Stats query boundaries:');
  console.log('Start:', startStr);
  console.log('End:', endStr);
  
  return { startStr, endStr };
}

//
// Dashboard Financial Stats Component
//
const DashboardFinancialStats: React.FC = () => {
  const { dateRange } = useCampaign();
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedDateString, setSelectedDateString] = useState<string>(formatDateToString(new Date()));

  // Sync with the global date range
  useEffect(() => {
    if (dateRange.startDate) {
      console.log('DashboardFinancialStats: Using date from context:', dateRange.startDate);
      
      // Create a date object from the string (which already has the correct date)
      const newDate = new Date(dateRange.startDate);
      setSelectedDate(newDate);
      
      // Store the date string directly
      setSelectedDateString(dateRange.startDate);
    }
  }, [dateRange]);

  // Handles changes in the date selection
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      console.log('Selected date in DatePicker:', date);
      setSelectedDate(date);
      
      // Extract and store the date string (YYYY-MM-DD)
      const dateString = formatDateToString(date);
      setSelectedDateString(dateString);
      console.log('Extracted date string:', dateString);
    }
  };

  // UseEffect to fetch and aggregate financial stats for the selected date
  useEffect(() => {
    async function fetchFinancialStats() {
      // Do nothing if no date string is selected
      if (!selectedDateString) return;

      setLoading(true);
      
      console.log('Fetching financial stats for date:', selectedDateString);
      
      // Get the query boundaries as strings
      const { startStr, endStr } = getDayRangeAsStrings(selectedDateString);

      // Query Supabase for campaign_stats that fall within the date range for ad spend
      const { data: adSpendData, error: adSpendError } = await supabase
        .from('campaign_stats')
        .select('ad_spend')
        .gte('date', startStr)
        .lte('date', endStr);

      // Query Supabase for campaign_stats_history that fall within the date range for revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from('campaign_stats_history')
        .select('revenue')
        .gte('date', startStr)
        .lte('date', endStr);

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

      // Calculate total ad spend
      const totalCost = adSpendData?.reduce((sum, row) => sum + Number(row.ad_spend || 0), 0) || 0;
      
      // Calculate total revenue
      const totalRevenue = revenueData?.reduce((sum, row) => sum + Number(row.revenue || 0), 0) || 0;
      
      // Calculate profit
      const profit = totalRevenue - totalCost;

      console.log('Financial data fetched:', {
        revenue: totalRevenue,
        cost: totalCost,
        profit: profit,
        date: selectedDateString,
        entries: {
          adSpend: adSpendData?.length || 0,
          revenue: revenueData?.length || 0
        }
      });

      setStats({
        revenue: totalRevenue,
        cost: totalCost,
        profit: profit
      });
      
      setLoading(false);
    }

    fetchFinancialStats();
  }, [selectedDateString]);

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
              `No stats available for ${format(selectedDate, 'MMMM d, yyyy')}` : 
              'Please select a date to view stats'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardFinancialStats;
