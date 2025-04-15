import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Campaign, DateRange } from "@/types/campaign";
import { v4 as uuidv4 } from 'uuid';
import { addDays, subDays, format } from 'date-fns';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface CampaignContextType {
  campaigns: Campaign[];
  isLoading: boolean;
  error: string | null;
  selectedCampaignId: string | null;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  setSelectedCampaignId: (id: string | null) => void;
  addCampaign: (campaign: Omit<Campaign, "id">) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  addStatHistoryEntry: (campaignId: string, entry: any) => void;
  updateStatHistoryEntry: (campaignId: string, entry: any) => void;
  deleteStatHistoryEntry: (campaignId: string, entryId: string) => void;
  fetchCampaigns: () => Promise<void>;
}

export const CampaignContext = createContext<CampaignContextType>({
  campaigns: [],
  isLoading: false,
  error: null,
  selectedCampaignId: null,
  dateRange: { startDate: '', endDate: '' },
  setDateRange: () => {},
  setSelectedCampaignId: () => {},
  addCampaign: () => {},
  updateCampaign: () => {},
  deleteCampaign: () => {},
  addStatHistoryEntry: () => {},
  updateStatHistoryEntry: () => {},
  deleteStatHistoryEntry: () => {},
  fetchCampaigns: async () => {},
});

export const useCampaign = () => useContext(CampaignContext);

export const CampaignProvider = ({ children }: { children: React.ReactNode }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const { user } = useAuth();
  
  const formatDate = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  const fetchCampaigns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    if (!user) {
      console.log("User not authenticated, skipping campaign fetch.");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_stats(*),
          campaign_manual_stats(*),
          campaign_stats_history(*)
        `)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error fetching campaigns:", error);
        setError(error.message);
      }

      if (data) {
        const typedCampaigns = data.map(campaign => {
          const stats = campaign.campaign_stats && campaign.campaign_stats.length > 0
            ? {
              adSpend: campaign.campaign_stats[0].ad_spend || 0,
              impressions: campaign.campaign_stats[0].impressions || 0,
              clicks: campaign.campaign_stats[0].clicks || 0,
              cpc: campaign.campaign_stats[0].cpc || 0,
              date: campaign.campaign_stats[0].date || '',
            }
            : { adSpend: 0, impressions: 0, clicks: 0, cpc: 0, date: '' };

          const manualStats = campaign.campaign_manual_stats && campaign.campaign_manual_stats.length > 0
            ? {
              leads: campaign.campaign_manual_stats[0].leads || 0,
              cases: campaign.campaign_manual_stats[0].cases || 0,
              retainers: campaign.campaign_manual_stats[0].retainers || 0,
              revenue: campaign.campaign_manual_stats[0].revenue || 0,
              date: campaign.campaign_manual_stats[0].date || '',
            }
            : { leads: 0, cases: 0, retainers: 0, revenue: 0, date: '' };

          const statsHistory = campaign.campaign_stats_history
            ? campaign.campaign_stats_history.map(history => ({
              id: history.id,
              date: history.date || '',
              leads: history.leads || 0,
              cases: history.cases || 0,
              retainers: history.retainers || 0,
              revenue: history.revenue || 0,
              adSpend: history.ad_spend || 0,
              createdAt: history.created_at || ''
            }))
            : [];

          return {
            id: campaign.id,
            name: campaign.name,
            platform: campaign.platform,
            accountId: campaign.account_id,
            accountName: campaign.account_name,
            stats: stats,
            manualStats: manualStats,
            statsHistory: statsHistory,
            targets: {
              monthlyRetainers: campaign.monthly_retainers || 0,
              casePayoutAmount: campaign.case_payout_amount || 0,
              monthlyIncome: campaign.monthly_income || 0,
              monthlySpend: campaign.monthly_spend || 0,
              targetROAS: campaign.target_roas || 0,
              targetProfit: campaign.target_profit || 0,
            },
          };
        });
        
        setCampaigns(typedCampaigns);
      }
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [fetchCampaigns, user]);

  const addCampaign = async (campaign: Omit<Campaign, "id">) => {
    setIsLoading(true);
    setError(null);

    try {
      const newCampaignId = uuidv4();

      // Insert into campaigns table
      const { error: campaignError } = await supabase
        .from('campaigns')
        .insert([
          {
            id: newCampaignId,
            user_id: user?.id,
            name: campaign.name,
            platform: campaign.platform,
            account_id: campaign.accountId,
            account_name: campaign.accountName,
            monthly_retainers: campaign.targets.monthlyRetainers,
            case_payout_amount: campaign.targets.casePayoutAmount,
            monthly_income: campaign.targets.monthlyIncome,
            monthly_spend: campaign.targets.monthlySpend,
            target_roas: campaign.targets.targetROAS,
            target_profit: campaign.targets.targetProfit,
          },
        ]);

      if (campaignError) {
        console.error("Error adding campaign:", campaignError);
        setError(campaignError.message);
        setIsLoading(false);
        return;
      }

      // Insert default stats entry
      const { error: statsError } = await supabase
        .from('campaign_stats')
        .insert([
          {
            campaign_id: newCampaignId,
            ad_spend: 0,
            impressions: 0,
            clicks: 0,
            cpc: 0,
            date: formatDate(new Date()),
          },
        ]);

      if (statsError) {
        console.error("Error adding campaign stats:", statsError);
      }
      
      // Insert default manual stats entry
      const { error: manualStatsError } = await supabase
        .from('campaign_manual_stats')
        .insert([
          {
            campaign_id: newCampaignId,
            leads: 0,
            cases: 0,
            retainers: 0,
            revenue: 0,
            date: formatDate(new Date()),
          },
        ]);

      if (manualStatsError) {
        console.error("Error adding campaign manual stats:", manualStatsError);
      }

      // Fetch the updated campaigns
      await fetchCampaigns();
      toast.success("Campaign added successfully");
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to add campaign:", err);
      toast.error("Failed to add campaign");
    } finally {
      setIsLoading(false);
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    setIsLoading(true);
    setError(null);

    try {
      // Prepare updates for the campaigns table
      const campaignUpdates: { [key: string]: any } = {};
      if (updates.name !== undefined) campaignUpdates.name = updates.name;
      if (updates.platform !== undefined) campaignUpdates.platform = updates.platform;
      if (updates.accountId !== undefined) campaignUpdates.account_id = updates.accountId;
      if (updates.accountName !== undefined) campaignUpdates.account_name = updates.accountName;
      if (updates.targets !== undefined) {
        campaignUpdates.monthly_retainers = updates.targets.monthlyRetainers;
        campaignUpdates.case_payout_amount = updates.targets.casePayoutAmount;
        campaignUpdates.monthly_income = updates.targets.monthlyIncome;
        campaignUpdates.monthly_spend = updates.targets.monthlySpend;
        campaignUpdates.target_roas = updates.targets.targetROAS;
        campaignUpdates.target_profit = updates.targets.targetProfit;
      }

      // Update the campaign in the campaigns table
      const { error: campaignError } = await supabase
        .from('campaigns')
        .update(campaignUpdates)
        .eq('id', id);

      if (campaignError) {
        console.error("Error updating campaign:", campaignError);
        setError(campaignError.message);
        setIsLoading(false);
        return;
      }

      // Prepare updates for the campaign_manual_stats table
      if (updates.manualStats) {
        const manualStatsUpdates = {
          leads: updates.manualStats.leads,
          cases: updates.manualStats.cases,
          retainers: updates.manualStats.retainers,
          revenue: updates.manualStats.revenue,
          date: updates.manualStats.date,
        };

        // Update the manual stats in the campaign_manual_stats table
        const { error: manualStatsError } = await supabase
          .from('campaign_manual_stats')
          .update(manualStatsUpdates)
          .eq('campaign_id', id);

        if (manualStatsError) {
          console.error("Error updating campaign manual stats:", manualStatsError);
        }
      }

      // Fetch the updated campaigns
      await fetchCampaigns();
      toast.success("Campaign updated successfully");
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to update campaign:", err);
      toast.error("Failed to update campaign");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCampaign = async (id: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Delete the campaign from the campaigns table
      const { error: campaignError } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);

      if (campaignError) {
        console.error("Error deleting campaign:", campaignError);
        setError(campaignError.message);
        setIsLoading(false);
        return;
      }

      // Fetch the updated campaigns
      await fetchCampaigns();
      toast.success("Campaign deleted successfully");
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to delete campaign:", err);
      toast.error("Failed to delete campaign");
    } finally {
      setIsLoading(false);
    }
  };
  
  const addStatHistoryEntry = async (campaignId: string, entry: any) => {
    setIsLoading(true);
    setError(null);
  
    try {
      const { data, error } = await supabase
        .from('campaign_stats_history')
        .insert([
          {
            id: uuidv4(),
            campaign_id: campaignId,
            date: entry.date,
            leads: entry.leads,
            cases: entry.cases,
            retainers: entry.retainers,
            revenue: entry.revenue,
            ad_spend: entry.adSpend,
            created_at: new Date().toISOString()
          }
        ]);
  
      if (error) {
        console.error("Error adding stat history entry:", error);
        setError(error.message);
        toast.error("Failed to add stat history entry");
      } else {
        toast.success("Stat history entry added successfully");
      }
  
      // Fetch the updated campaigns
      await fetchCampaigns();
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to add stat history entry:", err);
      toast.error("Failed to add stat history entry");
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateStatHistoryEntry = async (campaignId: string, entry: any) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('campaign_stats_history')
        .update({
          date: entry.date,
          leads: entry.leads,
          cases: entry.cases,
          retainers: entry.retainers,
          revenue: entry.revenue,
          ad_spend: entry.adSpend
        })
        .eq('id', entry.id);
        
      if (error) {
        console.error("Error updating stat history entry:", error);
        setError(error.message);
        toast.error("Failed to update stat history entry");
      } else {
        toast.success("Stat history entry updated successfully");
      }
      
      // Fetch the updated campaigns
      await fetchCampaigns();
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to update stat history entry:", err);
      toast.error("Failed to update stat history entry");
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteStatHistoryEntry = async (campaignId: string, entryId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('campaign_stats_history')
        .delete()
        .eq('id', entryId);
        
      if (error) {
        console.error("Error deleting stat history entry:", error);
        setError(error.message);
        toast.error("Failed to delete stat history entry");
      } else {
        toast.success("Stat history entry deleted successfully");
      }
      
      // Fetch the updated campaigns
      await fetchCampaigns();
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to delete stat history entry:", err);
      toast.error("Failed to delete stat history entry");
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    campaigns,
    isLoading,
    error,
    selectedCampaignId,
    dateRange,
    setDateRange,
    setSelectedCampaignId,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addStatHistoryEntry,
    updateStatHistoryEntry,
    deleteStatHistoryEntry,
    fetchCampaigns,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
