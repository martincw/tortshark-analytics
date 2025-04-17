
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CaseBuyer } from "@/types/campaign";
import { toast } from "sonner";

export const useCaseBuyers = () => {
  const [buyers, setBuyers] = useState<CaseBuyer[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBuyers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('case_buyers')
        .select('*')
        .order('name');

      if (error) throw error;
      setBuyers(data || []);
    } catch (error) {
      console.error('Error fetching buyers:', error);
      toast.error('Failed to fetch buyers');
    } finally {
      setLoading(false);
    }
  };

  const addBuyer = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('case_buyers')
        .insert([{ name }])
        .select()
        .single();

      if (error) throw error;
      setBuyers([...buyers, data]);
      toast.success('Buyer added successfully');
      return data;
    } catch (error) {
      console.error('Error adding buyer:', error);
      toast.error('Failed to add buyer');
      return null;
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  return { buyers, loading, addBuyer, fetchBuyers };
};
