
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CaseBuyer } from "@/types/campaign";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface BuyerStackItem {
  id: string;
  campaignId: string;
  buyerId: string;
  stackOrder: number;
  buyer: CaseBuyer;
}

export const useCampaignBuyers = (campaignId?: string) => {
  const [buyers, setBuyers] = useState<CaseBuyer[]>([]);
  const [buyerStack, setBuyerStack] = useState<BuyerStackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Fetch all buyers
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

  // Fetch buyer stack for a campaign
  const fetchBuyerStack = useCallback(async () => {
    if (!campaignId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('campaign_buyer_stack')
        .select(`
          id,
          campaign_id,
          buyer_id,
          stack_order,
          case_buyers (
            id,
            name,
            url,
            created_at
          )
        `)
        .eq('campaign_id', campaignId)
        .order('stack_order');
        
      if (error) throw error;
      
      setBuyerStack(data.map(item => ({
        id: item.id,
        campaignId: item.campaign_id,
        buyerId: item.buyer_id,
        stackOrder: item.stack_order,
        buyer: item.case_buyers as CaseBuyer
      })));
    } catch (error) {
      console.error('Error fetching buyer stack:', error);
      toast.error('Failed to load buyer stack');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  // Add a buyer to the stack
  const addBuyerToStack = async (buyerId: string) => {
    if (!campaignId) return;
    
    try {
      // Check if buyer is already in the stack
      const exists = buyerStack.some(item => item.buyerId === buyerId);
      if (exists) {
        toast.warning('This buyer is already in the stack');
        return;
      }
      
      // Get the next order position
      const nextOrder = buyerStack.length > 0 
        ? Math.max(...buyerStack.map(item => item.stackOrder)) + 1 
        : 0;
      
      const { data, error } = await supabase
        .from('campaign_buyer_stack')
        .insert({
          campaign_id: campaignId,
          buyer_id: buyerId,
          stack_order: nextOrder
        })
        .select(`
          id,
          campaign_id,
          buyer_id,
          stack_order,
          case_buyers (
            id,
            name,
            url,
            created_at
          )
        `)
        .single();
        
      if (error) throw error;
      
      // Add the new item to the stack
      setBuyerStack(prev => [...prev, {
        id: data.id,
        campaignId: data.campaign_id,
        buyerId: data.buyer_id,
        stackOrder: data.stack_order,
        buyer: data.case_buyers as CaseBuyer
      }]);
      
      toast.success('Buyer added to stack');
    } catch (error) {
      console.error('Error adding buyer to stack:', error);
      toast.error('Failed to add buyer to stack');
    }
  };

  // Remove a buyer from the stack
  const removeBuyerFromStack = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_buyer_stack')
        .delete()
        .eq('id', itemId);
        
      if (error) throw error;
      
      // Remove the item from the stack
      setBuyerStack(prev => prev.filter(item => item.id !== itemId));
      
      toast.success('Buyer removed from stack');
    } catch (error) {
      console.error('Error removing buyer from stack:', error);
      toast.error('Failed to remove buyer from stack');
    }
  };

  // Update the order of buyers in the stack
  const updateBuyerStackOrder = async (reorderedStack: BuyerStackItem[]) => {
    try {
      // Update the local state immediately for a better UX
      setBuyerStack(reorderedStack);
      
      // Prepare the updates
      const updates = reorderedStack.map((item, index) => ({
        id: item.id,
        stack_order: index
      }));
      
      // Update each item in the database
      for (const update of updates) {
        const { error } = await supabase
          .from('campaign_buyer_stack')
          .update({ stack_order: update.stack_order })
          .eq('id', update.id);
          
        if (error) throw error;
      }
      
    } catch (error) {
      console.error('Error updating buyer stack order:', error);
      toast.error('Failed to update buyer stack order');
      // Refresh the buyer stack to get the current state
      fetchBuyerStack();
    }
  };

  // Add a new buyer
  const addBuyer = async (name: string, url?: string) => {
    try {
      if (!user) {
        toast.error("You must be logged in to add a buyer");
        return null;
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
      return null;
    }
  };

  // Delete a buyer
  const deleteBuyer = async (id: string) => {
    try {
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

  // Load buyers and buyer stack when component mounts
  useEffect(() => {
    fetchBuyers();
    if (campaignId) {
      fetchBuyerStack();
    }
  }, [fetchBuyers, fetchBuyerStack, campaignId]);

  return {
    buyers,
    buyerStack,
    loading,
    fetchBuyers,
    fetchBuyerStack,
    addBuyerToStack,
    removeBuyerFromStack,
    updateBuyerStackOrder,
    addBuyer,
    deleteBuyer
  };
};

export type { BuyerStackItem };
