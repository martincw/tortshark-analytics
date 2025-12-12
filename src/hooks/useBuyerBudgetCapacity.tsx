import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export interface BuyerCapacity {
  id: string;
  buyer_id: string;
  monthly_capacity: number;
  effective_date: string;
  notes: string | null;
  workspace_id: string | null;
  created_at: string;
  updated_at: string;
  buyer?: {
    id: string;
    name: string;
    is_active: boolean;
  };
}

export interface BuyerWithCapacity {
  id: string;
  name: string;
  is_active: boolean;
  monthly_capacity: number;
  capacity_id: string | null;
  effective_date: string | null;
}

export const useBuyerBudgetCapacity = () => {
  const { currentWorkspace } = useWorkspace();
  const [buyersWithCapacity, setBuyersWithCapacity] = useState<BuyerWithCapacity[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCapacity, setTotalCapacity] = useState(0);

  const fetchBuyersWithCapacity = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    setLoading(true);
    try {
      // Fetch all active buyers
      const { data: buyers, error: buyersError } = await supabase
        .from('case_buyers')
        .select('id, name, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (buyersError) throw buyersError;

      // Fetch latest capacity for each buyer (most recent effective_date <= today)
      const today = new Date().toISOString().split('T')[0];
      const { data: capacities, error: capacitiesError } = await supabase
        .from('buyer_budget_capacity')
        .select('*')
        .lte('effective_date', today)
        .order('effective_date', { ascending: false });

      if (capacitiesError) throw capacitiesError;

      // Map buyers with their latest capacity
      const buyerCapacityMap = new Map<string, BuyerCapacity>();
      capacities?.forEach((cap) => {
        if (!buyerCapacityMap.has(cap.buyer_id)) {
          buyerCapacityMap.set(cap.buyer_id, cap);
        }
      });

      const result: BuyerWithCapacity[] = (buyers || []).map((buyer) => {
        const capacity = buyerCapacityMap.get(buyer.id);
        return {
          id: buyer.id,
          name: buyer.name,
          is_active: buyer.is_active ?? true,
          monthly_capacity: capacity?.monthly_capacity ?? 0,
          capacity_id: capacity?.id ?? null,
          effective_date: capacity?.effective_date ?? null,
        };
      });

      setBuyersWithCapacity(result);
      setTotalCapacity(result.reduce((sum, b) => sum + b.monthly_capacity, 0));
    } catch (error) {
      console.error('Error fetching buyer capacity:', error);
      toast.error('Failed to fetch buyer capacity data');
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace?.id]);

  const updateBuyerCapacity = async (
    buyerId: string,
    monthlyCapacity: number,
    effectiveDate?: string,
    notes?: string
  ) => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data, error } = await supabase
        .from('buyer_budget_capacity')
        .insert({
          buyer_id: buyerId,
          monthly_capacity: monthlyCapacity,
          effective_date: effectiveDate || new Date().toISOString().split('T')[0],
          notes: notes || null,
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Capacity updated successfully');
      await fetchBuyersWithCapacity();
      return data;
    } catch (error) {
      console.error('Error updating buyer capacity:', error);
      toast.error('Failed to update capacity');
      return null;
    }
  };

  const getUtilization = useCallback(async (startDate: string, endDate: string) => {
    try {
      // Get total revenue from campaign_stats_history within date range
      const { data, error } = await supabase
        .from('campaign_stats_history')
        .select('revenue')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      const totalRevenue = data?.reduce((sum, stat) => sum + (stat.revenue || 0), 0) ?? 0;
      return totalRevenue;
    } catch (error) {
      console.error('Error calculating utilization:', error);
      return 0;
    }
  }, []);

  useEffect(() => {
    fetchBuyersWithCapacity();
  }, [fetchBuyersWithCapacity]);

  return {
    buyersWithCapacity,
    loading,
    totalCapacity,
    fetchBuyersWithCapacity,
    updateBuyerCapacity,
    getUtilization,
  };
};
