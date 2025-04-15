
import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

//
// Financial Stats Data Type
//
interface FinancialStats {
  revenue: number;
  cost: number;
  profit: number;
}

// Helper Functions

// Given a date, returns an object with the start and end boundaries
// of that day in local time: start is midnight of that day, and end is midnight of the next day.
function getDayRange(localDate: Date) {
  const start = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());
  const end = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate() + 1);
  return { start, end };
}

//
// Dashboard Financial Stats Component
//
const DashboardFinancialStats: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Handles changes in the date selection
  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  // UseEffect to fetch and aggregate financial stats for the selected date
  useEffect(() => {
    async function fetchFinancialStats() {
      // Do nothing if no date is selected
      if (!selectedDate) return;

      setLoading(true);
      
      // Calculate the boundaries of the selected day
      const { start, end } = getDayRange(selectedDate);
      
      // Convert boundaries to ISO strings so they match the UTC timestamps stored in Supabase
      const startISO = start.toISOString();
      const endISO = end.toISOString();

      console.log('Fetching financial stats for:', format(selectedDate, 'yyyy-MM-dd'));
      console.log('Time range:', startISO, 'to', endISO);

      // Query Supabase for campaign_stats that fall within the date range for ad spend
      const { data: adSpendData, error: adSpendError } = await supabase
        .from('campaign_stats')
        .select('ad_spend')
        .gte('date', startISO)
        .lt('date', endISO);

      // Query Supabase for campaign_stats_history that fall within the date range for revenue
      const { data: revenueData, error: revenueError } = await supabase
        .from('campaign_stats_history')
        .select('revenue')
        .gte('date', startISO)
        .lt('date', endISO);

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

      setStats({
        revenue: totalRevenue,
        cost: totalCost,
        profit: profit
      });
      
      setLoading(false);
    }

    fetchFinancialStats();
  }, [selectedDate]);

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
