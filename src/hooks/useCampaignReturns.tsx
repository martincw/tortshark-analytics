import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CampaignReturn {
  id: string;
  campaign_id: string;
  week_start_date: string;
  return_amount: number;
  notes?: string;
  created_at: string;
}

export function useCampaignReturns(campaignId: string) {
  const [returns, setReturns] = useState<CampaignReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (campaignId) {
      fetchReturns();
    }
  }, [campaignId]);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('campaign_returns')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch returns data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTotalReturns = (startDate?: Date, endDate?: Date) => {
    let filteredReturns = returns;
    
    if (startDate && endDate) {
      filteredReturns = returns.filter(returnItem => {
        const returnDate = new Date(returnItem.week_start_date);
        return returnDate >= startDate && returnDate <= endDate;
      });
    }
    
    return filteredReturns.reduce((total, returnItem) => total + returnItem.return_amount, 0);
  };

  const getReturnsForDateRange = (startDate: Date, endDate: Date) => {
    return returns.filter(returnItem => {
      const returnDate = new Date(returnItem.week_start_date);
      return returnDate >= startDate && returnDate <= endDate;
    });
  };

  return {
    returns,
    loading,
    getTotalReturns,
    getReturnsForDateRange,
    refetch: fetchReturns
  };
}