
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { DateRange } from "@/types/common";
import { Campaign } from "@/types/campaign-base";
import { ExternalPlatformConnection } from "@/types/common";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";

// Define our context state
interface CampaignContextState {
  campaigns: Campaign[] | null;
  isLoading: boolean;
  error: Error | null;
  dateRange: DateRange;
  accountConnections: ExternalPlatformConnection[];
  selectedCampaignIds: string[];
  setDateRange: (dateRange: DateRange) => void;
  fetchCampaigns: () => Promise<void>;
  fetchGoogleAdsAccounts: () => Promise<void>;
  addAccountConnection: (connection: ExternalPlatformConnection) => void;
  updateCampaign: (id: string, data: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  addCampaign: (campaign: Omit<Campaign, "id">) => Promise<void>;
  setSelectedCampaignId: (id: string | null) => void;
  setSelectedCampaignIds: (ids: string[]) => void;
  addStatHistoryEntry: (campaignId: string, entry: any) => Promise<void>;
  updateStatHistoryEntry: (campaignId: string, entry: any) => Promise<void>;
  deleteStatHistoryEntry: (campaignId: string, entryId: string) => Promise<void>;
  deleteStatHistoryEntries: (campaignId: string, entryIds: string[]) => Promise<void>;
}

// Create the context
const CampaignContext = createContext<CampaignContextState | null>(null);

// Define provider props
interface CampaignProviderProps {
  children: ReactNode;
}

// Create the provider component
export const CampaignProvider: React.FC<CampaignProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [accountConnections, setAccountConnections] = useState<ExternalPlatformConnection[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const fetchCampaigns = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      console.info("Fetching campaigns for user:", user.id);
      
      // Fetch campaigns from Supabase
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (campaignsError) {
        throw campaignsError;
      }
      
      // For each campaign, fetch its stats, manual stats, targets, and buyer stack
      const fullCampaigns = await Promise.all(
        campaignsData.map(async (campaign) => {
          // Fetch manual stats
          const { data: manualStatsData } = await supabase
            .from('campaign_manual_stats')
            .select('*')
            .eq('campaign_id', campaign.id)
            .single();
            
          // Fetch stats history
          const { data: statsHistoryData } = await supabase
            .from('campaign_stats_history')
            .select('*')
            .eq('campaign_id', campaign.id)
            .order('date', { ascending: false });
            
          // Fetch targets
          const { data: targetsData } = await supabase
            .from('campaign_targets')
            .select('*')
            .eq('campaign_id', campaign.id)
            .single();
            
          // Fetch buyer stack
          const { data: buyerStackData } = await supabase
            .from('campaign_buyer_stack')
            .select('*, buyers:buyer_id(*)')
            .eq('campaign_id', campaign.id)
            .order('stack_order', { ascending: true });
            
          // Initialize empty arrays and objects if data is null
          const manualStats = manualStatsData || { 
            leads: 0, 
            cases: 0, 
            revenue: 0, 
            retainers: 0,
            date: new Date().toISOString().split('T')[0]
          };
          
          const statsHistory = statsHistoryData || [];
          
          const targets = targetsData || { 
            monthlyRetainers: 0,
            casePayoutAmount: 0,
            monthlyIncome: 0,
            monthlySpend: 0,
            targetROAS: 0,
            targetProfit: 0,
            monthlyRevenue: 0,
            monthlyProfit: 0,
            roas: 0,
          };
          
          const buyerStack = buyerStackData || [];
          
          // Stats object for compatibility
          const stats = {
            impressions: 0,
            clicks: 0,
            conversions: 0,
            cost: 0,
            ctr: 0,
            cpc: 0,
            conversionRate: 0,
            adSpend: 0,
            averageCpc: 0,
            date: new Date().toISOString().split('T')[0]
          };
          
          // Transform the campaign data to match the Campaign type
          return {
            id: campaign.id,
            name: campaign.name,
            userId: campaign.user_id,
            manualStats,
            statsHistory,
            createdAt: campaign.created_at,
            updatedAt: campaign.updated_at,
            buyerStack,
            targets,
            platform: campaign.platform,
            accountId: campaign.account_id,
            accountName: campaign.account_name,
            stats,
            is_active: campaign.is_active
          } as Campaign;
        })
      );
      
      console.info("Successfully fetched", fullCampaigns.length, "campaigns");
      setCampaigns(fullCampaigns as Campaign[]);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError(err instanceof Error ? err : new Error('Failed to fetch campaigns'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleAdsAccounts = async () => {
    // Placeholder for Google Ads accounts - currently removed
    return Promise.resolve();
  };

  // Add account connection
  const addAccountConnection = (connection: ExternalPlatformConnection) => {
    setAccountConnections(prev => {
      // Check if the connection already exists
      const exists = prev.some(conn => conn.id === connection.id);
      
      if (!exists) {
        return [...prev, connection];
      } else {
        // Update the existing connection
        return prev.map(conn => 
          conn.id === connection.id ? { ...conn, ...connection } : conn
        );
      }
    });
  };

  // Add a new campaign
  const addCampaign = async (campaign: Omit<Campaign, "id">) => {
    if (!user) {
      toast.error("You must be logged in to add a campaign");
      return;
    }

    try {
      // First insert the campaign
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert([{
          name: campaign.name,
          platform: campaign.platform,
          account_id: campaign.accountId || 'manual',
          account_name: campaign.accountName || 'Manual Entry',
          user_id: user.id,
          is_active: true
        }])
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Insert campaign targets
      if (campaign.targets) {
        const { error: targetsError } = await supabase
          .from('campaign_targets')
          .insert([{
            campaign_id: newCampaign.id,
            monthly_retainers: campaign.targets.monthlyRetainers || 0,
            case_payout_amount: campaign.targets.casePayoutAmount || 0,
            monthly_spend: campaign.targets.monthlySpend || 0,
            target_roas: campaign.targets.targetROAS || 0,
            target_profit: campaign.targets.targetProfit || 0,
            monthly_income: campaign.targets.monthlyIncome || 0
          }]);

        if (targetsError) throw targetsError;
      }

      // Insert initial manual stats
      const { error: statsError } = await supabase
        .from('campaign_manual_stats')
        .insert([{
          campaign_id: newCampaign.id,
          leads: campaign.manualStats?.leads || 0,
          cases: campaign.manualStats?.cases || 0,
          retainers: campaign.manualStats?.retainers || 0,
          revenue: campaign.manualStats?.revenue || 0,
          date: new Date().toISOString()
        }]);

      if (statsError) throw statsError;

      // Refresh the campaigns list to include the new campaign
      await fetchCampaigns();
      
      toast.success("Campaign created successfully");
      
    } catch (err) {
      console.error("Error adding campaign:", err);
      toast.error("Failed to add campaign");
      throw err;
    }
  };

  // Update campaign
  const updateCampaign = async (id: string, data: Partial<Campaign>) => {
    if (!campaigns) return;

    try {
      // First update the campaign in Supabase
      const campaignUpdate: any = {};
      
      // Map campaign data to database columns
      if (data.name) campaignUpdate.name = data.name;
      if (data.platform) campaignUpdate.platform = data.platform;
      if (data.accountId) campaignUpdate.account_id = data.accountId;
      if (data.accountName) campaignUpdate.account_name = data.accountName;
      if (data.is_active !== undefined) campaignUpdate.is_active = data.is_active;
      
      // Only update if there are fields to update
      if (Object.keys(campaignUpdate).length > 0) {
        const { error: campaignError } = await supabase
          .from('campaigns')
          .update(campaignUpdate)
          .eq('id', id);
          
        if (campaignError) throw campaignError;
      }
      
      // Update manual stats if provided
      if (data.manualStats) {
        const { error: statsError } = await supabase
          .from('campaign_manual_stats')
          .update({
            leads: data.manualStats.leads,
            cases: data.manualStats.cases,
            retainers: data.manualStats.retainers || 0,
            revenue: data.manualStats.revenue
          })
          .eq('campaign_id', id);
          
        if (statsError) throw statsError;
      }
      
      // Update targets if provided
      if (data.targets) {
        const { error: targetsError } = await supabase
          .from('campaign_targets')
          .update({
            monthly_retainers: data.targets.monthlyRetainers,
            case_payout_amount: data.targets.casePayoutAmount,
            monthly_spend: data.targets.monthlySpend,
            target_roas: data.targets.targetROAS,
            target_profit: data.targets.targetProfit,
            monthly_income: data.targets.monthlyIncome
          })
          .eq('campaign_id', id);
          
        if (targetsError) throw targetsError;
      }
      
      // Update local state
      setCampaigns(prevCampaigns => 
        prevCampaigns?.map(campaign => 
          campaign.id === id ? { ...campaign, ...data } : campaign
        ) || null
      );
      
    } catch (err) {
      console.error("Error updating campaign:", err);
      toast.error("Failed to update campaign");
      throw err;
    }
  };

  // Delete campaign
  const deleteCampaign = async (id: string) => {
    if (!campaigns) return;

    try {
      // Delete the campaign from Supabase
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Update local state
      setCampaigns(prevCampaigns => 
        prevCampaigns?.filter(campaign => campaign.id !== id) || null
      );
      
      toast.success("Campaign deleted successfully");
      
    } catch (err) {
      console.error("Error deleting campaign:", err);
      toast.error("Failed to delete campaign");
      throw err;
    }
  };

  // Add stats history entry
  const addStatHistoryEntry = async (campaignId: string, entry: any) => {
    if (!campaigns) return;

    try {
      const entryWithId = {
        ...entry,
        id: uuidv4(),
        campaign_id: campaignId
      };
      
      // Insert the entry into Supabase
      const { error } = await supabase
        .from('campaign_stats_history')
        .insert([entryWithId]);
        
      if (error) throw error;
      
      // Update local state
      setCampaigns(prevCampaigns => 
        prevCampaigns?.map(campaign => 
          campaign.id === campaignId 
            ? { 
              ...campaign, 
              statsHistory: [entryWithId, ...campaign.statsHistory] 
            } 
            : campaign
        ) || null
      );
      
    } catch (err) {
      console.error("Error adding stats history entry:", err);
      toast.error("Failed to add stats history entry");
      throw err;
    }
  };

  // Update stats history entry
  const updateStatHistoryEntry = async (campaignId: string, entry: any) => {
    if (!campaigns) return;

    try {
      // Update the entry in Supabase
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
        
      if (error) throw error;
      
      // Update local state
      setCampaigns(prevCampaigns => 
        prevCampaigns?.map(campaign => 
          campaign.id === campaignId 
            ? { 
              ...campaign, 
              statsHistory: campaign.statsHistory.map(item => 
                item.id === entry.id ? entry : item
              )
            } 
            : campaign
        ) || null
      );
      
    } catch (err) {
      console.error("Error updating stats history entry:", err);
      toast.error("Failed to update stats history entry");
      throw err;
    }
  };

  // Delete stats history entry
  const deleteStatHistoryEntry = async (campaignId: string, entryId: string) => {
    if (!campaigns) return;

    try {
      // Delete the entry from Supabase
      const { error } = await supabase
        .from('campaign_stats_history')
        .delete()
        .eq('id', entryId);
        
      if (error) throw error;
      
      // Update local state
      setCampaigns(prevCampaigns => 
        prevCampaigns?.map(campaign => 
          campaign.id === campaignId 
            ? { 
              ...campaign, 
              statsHistory: campaign.statsHistory.filter(item => item.id !== entryId)
            } 
            : campaign
        ) || null
      );
      
      toast.success("Stats entry deleted successfully");
      
    } catch (err) {
      console.error("Error deleting stats history entry:", err);
      toast.error("Failed to delete stats history entry");
      throw err;
    }
  };

  // Delete multiple stats history entries
  const deleteStatHistoryEntries = async (campaignId: string, entryIds: string[]) => {
    if (!campaigns || entryIds.length === 0) return;

    try {
      // Delete the entries from Supabase
      const { error } = await supabase
        .from('campaign_stats_history')
        .delete()
        .in('id', entryIds);
        
      if (error) throw error;
      
      // Update local state
      setCampaigns(prevCampaigns => 
        prevCampaigns?.map(campaign => 
          campaign.id === campaignId 
            ? { 
              ...campaign, 
              statsHistory: campaign.statsHistory.filter(item => !entryIds.includes(item.id))
            } 
            : campaign
        ) || null
      );
      
      toast.success(`${entryIds.length} stats entries deleted successfully`);
      
    } catch (err) {
      console.error("Error deleting stats history entries:", err);
      toast.error("Failed to delete stats history entries");
      throw err;
    }
  };

  // Fetch campaigns when user changes or on first load
  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  // Prepare the context value
  const contextValue: CampaignContextState = {
    campaigns,
    isLoading,
    error,
    dateRange,
    accountConnections,
    selectedCampaignIds,
    setDateRange,
    fetchCampaigns,
    fetchGoogleAdsAccounts,
    addAccountConnection,
    updateCampaign,
    deleteCampaign,
    addCampaign,
    setSelectedCampaignId,
    setSelectedCampaignIds,
    addStatHistoryEntry,
    updateStatHistoryEntry,
    deleteStatHistoryEntry,
    deleteStatHistoryEntries,
  };

  return (
    <CampaignContext.Provider value={contextValue}>
      {children}
    </CampaignContext.Provider>
  );
};

// Create a hook to use the campaign context
export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
};
