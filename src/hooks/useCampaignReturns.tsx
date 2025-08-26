import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CampaignReturn {
  id: string;
  campaign_id: string;
  return_amount: number;
  notes?: string;
  created_at: string;
}

export function useCampaignReturns(campaignId: string) {
  const [campaignReturn, setCampaignReturn] = useState<CampaignReturn | null>(null);
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
        .maybeSingle();

      if (error) throw error;
      setCampaignReturn(data);
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

  const getTotalReturns = () => {
    return campaignReturn?.return_amount || 0;
  };

  return {
    campaignReturn,
    loading,
    getTotalReturns,
    refetch: fetchReturns
  };
}