import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface BackendCaseStats {
  id: string;
  date: string;
  campaign_id: string;
  case_count: number;
  price_per_case: number;
  total_value: number;
  created_at: string;
  updated_at: string;
  campaigns?: {
    name: string;
  };
}

export const useBackendCases = () => {
  const [caseStats, setCaseStats] = useState<BackendCaseStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCaseStats = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('backend_case_stats')
        .select(`
          *,
          campaigns (
            name
          )
        `)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching backend case stats:', error);
        toast({
          title: "Error",
          description: "Failed to load backend case stats.",
          variant: "destructive",
        });
        return;
      }

      setCaseStats(data || []);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseStats();
  }, []);

  return {
    caseStats,
    isLoading,
    fetchCaseStats,
  };
};