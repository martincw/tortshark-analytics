import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CaseBuyer } from "@/types/buyer";
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

  const addBuyer = async (
    name: string, 
    url: string = '', 
    contact_name: string = '', 
    email: string = '',
    platform: string = '',
    notes: string = '',
    payout_terms: string = '',
    url2: string = ''
  ) => {
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
          url2,
          contact_name,
          email,
          platform,
          notes,
          payout_terms,
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

  const updateBuyer = async (
    id: string,
    updates: Partial<CaseBuyer>
  ) => {
    try {
      const { data, error } = await supabase
        .from('case_buyers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setBuyers(buyers.map(buyer => 
        buyer.id === id ? { ...buyer, ...data } : buyer
      ));
      
      toast.success('Buyer updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating buyer:', error);
      toast.error('Failed to update buyer');
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

  // Get tort coverage for a specific buyer
  const getBuyerTortCoverage = async (buyerId: string) => {
    try {
      // Fixed query to properly join the campaigns table
      const { data, error } = await supabase
        .from('buyer_tort_coverage')
        .select(`
          *,
          campaigns:campaign_id (
            id,
            name
          )
        `)
        .eq('buyer_id', buyerId);

      if (error) {
        console.error('Error in getBuyerTortCoverage:', error);
        throw error;
      }
      
      console.log('Tort coverage data:', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching buyer tort coverage:', error);
      toast.error('Failed to fetch buyer tort coverage');
      return [];
    }
  };

  // Add tort coverage for a buyer
  const addBuyerTortCoverage = async (
    buyerId: string, 
    campaignId: string, 
    payoutAmount: number,
    did: string = '',
    campaignKey: string = '',
    notes: string = '',
    specSheetUrl: string = '',
    label: string = '',
    inboundDid: string = '',
    transferDid: string = '',
    intakeCenter: string = '',
    campaignUrl: string = ''
  ) => {
    try {
      const { data, error } = await supabase
        .from('buyer_tort_coverage')
        .insert([{
          buyer_id: buyerId,
          campaign_id: campaignId,
          payout_amount: payoutAmount,
          did,
          campaign_key: campaignKey,
          notes,
          spec_sheet_url: specSheetUrl,
          label,
          inbound_did: inboundDid,
          transfer_did: transferDid,
          intake_center: intakeCenter,
          is_active: true,
          campaign_url: campaignUrl
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success('Tort coverage added successfully');
      return data;
    } catch (error) {
      console.error('Error adding tort coverage:', error);
      toast.error('Failed to add tort coverage');
      return null;
    }
  };

  // Update payout amount for a tort coverage
  const updateBuyerTortCoverage = async (
    coverageId: string, 
    payoutAmount: number,
    updates: {
      did?: string;
      campaign_key?: string;
      notes?: string;
      spec_sheet_url?: string;
      label?: string;
      inbound_did?: string;
      transfer_did?: string;
      intake_center?: string;
      is_active?: boolean;
      campaign_url?: string;
    } = {}
  ) => {
    try {
      const { data, error } = await supabase
        .from('buyer_tort_coverage')
        .update({ 
          payout_amount: payoutAmount,
          ...updates
        })
        .eq('id', coverageId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Tort coverage updated successfully');
      return data;
    } catch (error) {
      console.error('Error updating tort coverage:', error);
      toast.error('Failed to update tort coverage');
      return null;
    }
  };

  // Toggle active status for a tort coverage
  const toggleTortCoverageActive = async (coverageId: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('buyer_tort_coverage')
        .update({ is_active: isActive })
        .eq('id', coverageId)
        .select()
        .single();

      if (error) throw error;
      
      toast.success(`Tort coverage ${isActive ? 'activated' : 'deactivated'} successfully`);
      return data;
    } catch (error) {
      console.error('Error toggling tort coverage active status:', error);
      toast.error('Failed to update tort coverage status');
      return null;
    }
  };

  // Remove tort coverage for a buyer
  const removeBuyerTortCoverage = async (coverageId: string) => {
    try {
      const { error } = await supabase
        .from('buyer_tort_coverage')
        .delete()
        .eq('id', coverageId);

      if (error) throw error;
      toast.success('Tort coverage removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing tort coverage:', error);
      toast.error('Failed to remove tort coverage');
      return false;
    }
  };

  // Get campaign buyer stack
  const getCampaignBuyerStack = async (campaignId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_buyer_stack')
        .select(`
          id,
          stack_order,
          payout_amount,
          is_active,
          buyers:buyer_id (
            id,
            name,
            url,
            email
          )
        `)
        .eq('campaign_id', campaignId)
        .order('stack_order');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching campaign buyer stack:', error);
      toast.error('Failed to fetch campaign buyer stack');
      return [];
    }
  };

  // Update campaign buyer stack order
  const updateBuyerStackOrder = async (stackItems: { id: string, stack_order: number }[]) => {
    try {
      // Use Promise.all to perform all updates in parallel
      const updates = stackItems.map(item => 
        supabase
          .from('campaign_buyer_stack')
          .update({ stack_order: item.stack_order })
          .eq('id', item.id)
      );
      
      await Promise.all(updates);
      toast.success('Buyer stack updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating buyer stack:', error);
      toast.error('Failed to update buyer stack');
      return false;
    }
  };

  // Add buyer to campaign stack
  const addBuyerToStack = async (campaignId: string, buyerId: string, payoutAmount: number, stackOrder: number, coverageId: string) => {
    try {
      const { data, error } = await supabase
        .from('campaign_buyer_stack')
        .insert([{
          campaign_id: campaignId,
          buyer_id: buyerId,
          payout_amount: payoutAmount,
          stack_order: stackOrder,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;
      toast.success('Buyer added to stack successfully');
      return data;
    } catch (error) {
      console.error('Error adding buyer to stack:', error);
      toast.error('Failed to add buyer to stack');
      return null;
    }
  };

  // Toggle active status for a stack item
  const toggleStackItemActive = async (stackItemId: string, isActive: boolean) => {
    try {
      const { data, error } = await supabase
        .from('campaign_buyer_stack')
        .update({ is_active: isActive })
        .eq('id', stackItemId)
        .select()
        .single();

      if (error) throw error;
      
      toast.success(`Stack item ${isActive ? 'activated' : 'deactivated'} successfully`);
      return data;
    } catch (error) {
      console.error('Error toggling stack item active status:', error);
      toast.error('Failed to update stack item status');
      return null;
    }
  };

  // Remove buyer from stack
  const removeBuyerFromStack = async (stackItemId: string) => {
    try {
      const { error } = await supabase
        .from('campaign_buyer_stack')
        .delete()
        .eq('id', stackItemId);

      if (error) throw error;
      toast.success('Buyer removed from stack successfully');
      return true;
    } catch (error) {
      console.error('Error removing buyer from stack:', error);
      toast.error('Failed to remove buyer from stack');
      return false;
    }
  };
  
  // Get active buyer stack for a campaign (used in campaign cards)
  const getActiveBuyerStackShort = async (campaignId: string, limit = 2) => {
    try {
      const { data, error } = await supabase
        .from('campaign_buyer_stack')
        .select(`
          id,
          stack_order,
          payout_amount,
          buyers:buyer_id (
            id,
            name
          )
        `)
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .order('stack_order')
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching active buyer stack:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  return { 
    buyers, 
    loading, 
    addBuyer, 
    updateBuyer, 
    deleteBuyer,
    getBuyerTortCoverage,
    addBuyerTortCoverage,
    removeBuyerTortCoverage,
    updateBuyerTortCoverage,
    toggleTortCoverageActive,
    getCampaignBuyerStack,
    updateBuyerStackOrder,
    addBuyerToStack,
    removeBuyerFromStack,
    toggleStackItemActive,
    getActiveBuyerStackShort,
    fetchBuyers
  };
};
