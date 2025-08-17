import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export interface BackendCase {
  id: string;
  case_number: string;
  client_name: string;
  case_type: string;
  campaign_id: string | null;
  estimated_value: number;
  date_opened: string;
  status: string;
  progress: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  campaigns?: {
    name: string;
  };
}

export const useBackendCases = () => {
  const [cases, setCases] = useState<BackendCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchCases = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('backend_cases')
        .select(`
          *,
          campaigns (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching backend cases:', error);
        toast({
          title: "Error",
          description: "Failed to load backend cases.",
          variant: "destructive",
        });
        return;
      }

      setCases(data || []);
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
    fetchCases();
  }, []);

  return {
    cases,
    isLoading,
    fetchCases,
  };
};