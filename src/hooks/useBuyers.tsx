
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CaseBuyer } from "@/types/campaign";
import { toast } from "sonner";

export const useBuyers = () => {
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

  const addBuyer = async (name: string, url: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to add a buyer');
        return null;
      }
      
      const { data, error } = await supabase
        .from('case_buyers')
        .insert([{ 
          name, 
          url,
          user_id: user.id 
        }])
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

  const deleteBuyer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('case_buyers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBuyers(buyers.filter(buyer => buyer.id !== id));
      toast.success('Buyer deleted successfully');
    } catch (error) {
      console.error('Error deleting buyer:', error);
      toast.error('Failed to delete buyer');
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  return { buyers, loading, addBuyer, deleteBuyer, fetchBuyers };
};
