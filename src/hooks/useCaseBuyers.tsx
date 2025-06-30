
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
      // Remove workspace filtering - admins see all buyers
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
      // Get the current user ID from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to add a buyer');
        return null;
      }
      
      const { data, error } = await supabase
        .from('case_buyers')
        .insert([{ 
          name, 
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

  useEffect(() => {
    fetchBuyers();
  }, []);

  return { buyers, loading, addBuyer, fetchBuyers };
};
