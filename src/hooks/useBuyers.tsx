
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CaseBuyer } from "@/types/campaign";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export const useBuyers = () => {
  const [buyers, setBuyers] = useState<CaseBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchBuyers = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user) {
        console.warn("No user found, skipping buyers fetch");
        return;
      }
      
      const { data, error } = await supabase
        .from('case_buyers')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
        
      if (error) throw error;
      
      setBuyers(data.map(buyer => ({
        id: buyer.id,
        name: buyer.name,
        url: buyer.url,
        created_at: buyer.created_at
      })));
    } catch (error) {
      console.error('Error fetching buyers:', error);
      toast.error('Failed to load buyers');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const addBuyer = async (name: string, url?: string) => {
    try {
      if (!user) {
        toast.error("You must be logged in to add a buyer");
        return;
      }
      
      const { data, error } = await supabase
        .from('case_buyers')
        .insert({
          name,
          url,
          user_id: user.id
        })
        .select()
        .single();
        
      if (error) throw error;
      
      const newBuyer: CaseBuyer = {
        id: data.id,
        name: data.name,
        url: data.url,
        created_at: data.created_at
      };
      
      setBuyers(prev => [...prev, newBuyer]);
      toast.success('Buyer added successfully');
      return newBuyer;
    } catch (error) {
      console.error('Error adding buyer:', error);
      toast.error('Failed to add buyer');
    }
  };

  const deleteBuyer = async (id: string) => {
    try {
      // First check if the buyer is assigned to any campaigns
      const { data: stackData, error: stackError } = await supabase
        .from('campaign_buyer_stack')
        .select('id')
        .eq('buyer_id', id)
        .limit(1);
        
      if (stackError) throw stackError;
      
      if (stackData && stackData.length > 0) {
        toast.error('Cannot delete a buyer that is assigned to campaigns');
        return;
      }
      
      const { error } = await supabase
        .from('case_buyers')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      setBuyers(prev => prev.filter(buyer => buyer.id !== id));
      toast.success('Buyer deleted successfully');
    } catch (error) {
      console.error('Error deleting buyer:', error);
      toast.error('Failed to delete buyer');
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);

  return {
    buyers,
    loading,
    addBuyer,
    deleteBuyer,
    fetchBuyers
  };
};
