import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Campaign, DateRange, AccountConnection } from "@/types/campaign";
import { v4 as uuidv4 } from 'uuid';
import { addDays, subDays, format, startOfWeek, endOfWeek } from 'date-fns';
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
  accountConnections: AccountConnection[];
  fetchGoogleAdsAccounts: () => Promise<any>;
  addAccountConnection: (connection: AccountConnection) => void;
  selectedCampaignIds: string[];
  setSelectedCampaignIds: (ids: string[]) => void;
  migrateFromLocalStorage?: () => Promise<void>;
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
  accountConnections: [],
  fetchGoogleAdsAccounts: async () => [],
  addAccountConnection: () => {},
  selectedCampaignIds: [],
  setSelectedCampaignIds: () => {},
});

export const useCampaign = () => useContext(CampaignContext);

export const CampaignProvider = ({ children }: { children: React.ReactNode }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today);
    const endOfCurrentWeek = endOfWeek(today);

    return {
      startDate: format(startOfCurrentWeek, 'yyyy-MM-dd'),
      endDate: format(endOfCurrentWeek, 'yyyy-MM-dd'),
    };
  });
  const [accountConnections, setAccountConnections] = useState<AccountConnection[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  
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
          campaign_stats_history(*),
          campaign_targets(*)
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

          const platform = campaign.platform as "google" | "facebook" | "linkedin";
          
          const targets = campaign.campaign_targets && campaign.campaign_targets.length > 0
            ? {
                monthlyRetainers: campaign.campaign_targets[0].monthly_retainers || 0,
                casePayoutAmount: campaign.campaign_targets[0].case_payout_amount || 0,
                monthlyIncome: campaign.campaign_targets[0].monthly_income || 0,
                monthlySpend: campaign.campaign_targets[0].monthly_spend || 0,
                targetROAS: campaign.campaign_targets[0].target_roas || 0,
                targetProfit: campaign.campaign_targets[0].target_profit || 0,
              }
            : {
                monthlyRetainers: 0,
                casePayoutAmount: 0,
                monthlyIncome: 0,
                monthlySpend: 0,
                targetROAS: 0,
                targetProfit: 0,
              };

          return {
            id: campaign.id,
            name: campaign.name,
            platform: platform,
            accountId: campaign.account_id,
            accountName: campaign.account_name,
            stats: stats,
            manualStats: manualStats,
            statsHistory: statsHistory,
            targets: targets,
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

  const fetchGoogleAdsAccounts = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('account_connections')
        .select('*')
        .eq('user_id', user?.id);
        
      if (error) {
        console.error("Error fetching account connections:", error);
        throw error;
      }
      
      const connections: AccountConnection[] = data.map(conn => {
        let processedCredentials: Record<string, any> = {};
        
        if (conn.credentials) {
          if (typeof conn.credentials === 'string') {
            try {
              processedCredentials = JSON.parse(conn.credentials);
            } catch (error) {
              console.error("Error parsing credentials string:", error);
              processedCredentials = {};
            }
          } else if (typeof conn.credentials === 'object') {
            processedCredentials = conn.credentials as Record<string, any>;
          }
        }
        
        return {
          id: conn.id,
          name: conn.name,
          platform: conn.platform as "google" | "facebook" | "linkedin",
          isConnected: conn.is_connected,
          lastSynced: conn.last_synced,
          customerId: conn.customer_id,
          credentials: processedCredentials
        };
      });
      
      setAccountConnections(connections);
      return connections;
    } catch (error) {
      console.error("Error in fetchGoogleAdsAccounts:", error);
      toast.error("Failed to fetch Google Ads accounts");
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  const addAccountConnection = (connection: AccountConnection) => {
    setAccountConnections(prev => {
      const exists = prev.some(conn => conn.id === connection.id);
      if (exists) {
        return prev.map(conn => conn.id === connection.id ? connection : conn);
      } else {
        return [...prev, connection];
      }
    });
  };

  useEffect(() => {
    if (user) {
      fetchCampaigns();
      fetchGoogleAdsAccounts();
    }
  }, [fetchCampaigns, user]);

  const addCampaign = async (campaign: Omit<Campaign, "id">) => {
    setIsLoading(true);
    setError(null);

    try {
      const newCampaignId = uuidv4();

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
          },
        ]);

      if (campaignError) {
        console.error("Error adding campaign:", campaignError);
        setError(campaignError.message);
        setIsLoading(false);
        return null;
      }

      const { error: targetsError } = await supabase
        .from('campaign_targets')
        .insert([
          {
            campaign_id: newCampaignId,
            monthly_retainers: campaign.targets.monthlyRetainers,
            case_payout_amount: campaign.targets.casePayoutAmount,
            monthly_income: campaign.targets.monthlyIncome,
            monthly_spend: campaign.targets.monthlySpend,
            target_roas: campaign.targets.targetROAS,
            target_profit: campaign.targets.targetProfit,
          },
        ]);

      if (targetsError) {
        console.error("Error adding campaign targets:", targetsError);
      }

      const { error: statsError } = await supabase
        .from('campaign_stats')
        .insert([
          {
            campaign_id: newCampaignId,
            ad_spend: 0,
            impressions: 0,
            clicks: 0,
            cpc: 0,
            date: format(new Date(), 'yyyy-MM-dd'),
          },
        ]);

      if (statsError) {
        console.error("Error adding campaign stats:", statsError);
      }
      
      const { error: manualStatsError } = await supabase
        .from('campaign_manual_stats')
        .insert([
          {
            campaign_id: newCampaignId,
            leads: 0,
            cases: 0,
            retainers: 0,
            revenue: 0,
            date: format(new Date(), 'yyyy-MM-dd'),
          },
        ]);

      if (manualStatsError) {
        console.error("Error adding campaign manual stats:", manualStatsError);
      }

      await fetchCampaigns();
      toast.success("Campaign added successfully");
      return newCampaignId;
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to add campaign:", err);
      toast.error("Failed to add campaign");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    setIsLoading(true);
    setError(null);

    try {
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

      if (updates.manualStats) {
        const manualStatsUpdates = {
          leads: updates.manualStats.leads,
          cases: updates.manualStats.cases,
          retainers: updates.manualStats.retainers,
          revenue: updates.manualStats.revenue,
          date: updates.manualStats.date,
        };

        const { error: manualStatsError } = await supabase
          .from('campaign_manual_stats')
          .update(manualStatsUpdates)
          .eq('campaign_id', id);

        if (manualStatsError) {
          console.error("Error updating campaign manual stats:", manualStatsError);
        }
      }

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
    accountConnections,
    fetchGoogleAdsAccounts,
    addAccountConnection,
    selectedCampaignIds,
    setSelectedCampaignIds
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
