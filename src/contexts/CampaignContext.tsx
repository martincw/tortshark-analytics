import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Campaign, DateRange, AccountConnection } from "@/types/campaign";
import { v4 as uuidv4 } from 'uuid';
import { addDays, subDays, format, startOfWeek, endOfWeek, parseISO, subWeeks } from 'date-fns';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { clearMetricsCache } from "@/utils/campaignUtils";


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
  deleteStatHistoryEntry: (campaignId: string, entryId: string) => Promise<boolean>;
  deleteStatHistoryEntries: (campaignId: string, entryIds: string[]) => Promise<void>;
  fetchCampaigns: () => Promise<void>;
  accountConnections: AccountConnection[];
  fetchGoogleAdsAccounts: () => Promise<any>;
  addAccountConnection: (connection: AccountConnection) => void;
  selectedCampaignIds: string[];
  setSelectedCampaignIds: (ids: string[]) => void;
  migrateFromLocalStorage?: () => Promise<void>;
  fetchHyrosAccounts: () => Promise<any>;
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
  deleteStatHistoryEntry: async () => false,
  deleteStatHistoryEntries: async () => {},
  fetchCampaigns: async () => {},
  accountConnections: [],
  fetchGoogleAdsAccounts: async () => [],
  addAccountConnection: () => {},
  selectedCampaignIds: [],
  setSelectedCampaignIds: () => {},
  fetchHyrosAccounts: async () => {},
});

export const useCampaign = () => useContext(CampaignContext);

export const CampaignProvider = ({ children }: { children: React.ReactNode }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Try to get saved date range from localStorage
    const savedDateRange = localStorage.getItem('campaignDateRange');
    if (savedDateRange) {
      try {
        return JSON.parse(savedDateRange);
      } catch (e) {
        console.error("Error parsing saved date range:", e);
      }
    }
    
    // Default date range (current week)
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // 1 is Monday
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 }); // Sunday

    return {
      startDate: format(startOfCurrentWeek, 'yyyy-MM-dd'),
      endDate: format(endOfCurrentWeek, 'yyyy-MM-dd'),
    };
  });
  
  const [accountConnections, setAccountConnections] = useState<AccountConnection[]>([]);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>(() => {
    // Try to get saved campaign selections from localStorage
    const savedSelections = localStorage.getItem('selectedCampaignIds');
    if (savedSelections) {
      try {
        return JSON.parse(savedSelections);
      } catch (e) {
        console.error("Error parsing saved campaign selections:", e);
        return [];
      }
    }
    return [];
  });
  
  const { user } = useAuth();
  
  // Save date range to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('campaignDateRange', JSON.stringify(dateRange));
  }, [dateRange]);
  
  // Save selected campaign IDs to localStorage when they change
  useEffect(() => {
    localStorage.setItem('selectedCampaignIds', JSON.stringify(selectedCampaignIds));
  }, [selectedCampaignIds]);

  // Custom setDateRange that also saves to localStorage
  const handleSetDateRange = useCallback((range: DateRange) => {
    setDateRange(range);
    localStorage.setItem('campaignDateRange', JSON.stringify(range));
  }, []);

  // Custom setSelectedCampaignIds that also saves to localStorage
  const handleSetSelectedCampaignIds = useCallback((ids: string[]) => {
    setSelectedCampaignIds(ids);
    localStorage.setItem('selectedCampaignIds', JSON.stringify(ids));
  }, []);
  
  const formatDate = (date: Date): string => {
    return format(date, 'yyyy-MM-dd');
  };

  const fetchCampaigns = useCallback(async () => {
    // Clear metrics cache before fetching to ensure fresh calculations
    clearMetricsCache();
    
    setIsLoading(true);
    setError(null);
    
    if (!user) {
      console.log("User not authenticated, skipping campaign fetch.");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Fetching campaigns for user:", user.id);
      
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
        setCampaigns([]);
        setIsLoading(false);
        return;
      }

      if (data) {
        const typedCampaigns: Campaign[] = data.map(campaign => {
          // Initialize with default empty objects to prevent null/undefined errors
          const stats = campaign.campaign_stats && campaign.campaign_stats.length > 0
            ? {
              adSpend: campaign.campaign_stats[0].ad_spend || 0,
              impressions: campaign.campaign_stats[0].impressions || 0,
              clicks: campaign.campaign_stats[0].clicks || 0,
              cpc: campaign.campaign_stats[0].cpc || 0,
              date: campaign.campaign_stats[0].date || '',
              cost: campaign.campaign_stats[0].ad_spend || 0,
              averageCpc: campaign.campaign_stats[0].cpc || 0,
              ctr: 0,
              conversionRate: 0,
              conversions: 0
            }
            : { 
              adSpend: 0, impressions: 0, clicks: 0, cpc: 0, date: '',
              cost: 0, averageCpc: 0, ctr: 0, conversionRate: 0, conversions: 0
            };

          const manualStats = campaign.campaign_manual_stats && campaign.campaign_manual_stats.length > 0
            ? {
              leads: campaign.campaign_manual_stats[0].leads || 0,
              cases: campaign.campaign_manual_stats[0].cases || 0,
              retainers: campaign.campaign_manual_stats[0].retainers || 0,
              revenue: campaign.campaign_manual_stats[0].revenue || 0,
              date: campaign.campaign_manual_stats[0].date || '',
            }
            : { leads: 0, cases: 0, retainers: 0, revenue: 0, date: '' };

          const statsHistory = campaign.campaign_stats_history?.map(entry => ({
            id: entry.id || '',
            campaignId: entry.campaign_id || '',
            date: entry.date || '',
            leads: entry.leads || 0,
            cases: entry.cases || 0,
            revenue: entry.revenue || 0,
            adSpend: entry.ad_spend || 0,
            youtube_spend: entry.youtube_spend || 0,
            meta_spend: entry.meta_spend || 0,
            newsbreak_spend: entry.newsbreak_spend || 0,
            youtube_leads: entry.youtube_leads || 0,
            meta_leads: entry.meta_leads || 0,
            newsbreak_leads: entry.newsbreak_leads || 0,
            createdAt: entry.created_at || ''
          })) || [];

          const targets = campaign.campaign_targets && campaign.campaign_targets.length > 0
            ? {
              monthlySpend: campaign.campaign_targets[0].monthly_spend || 0,
              casePayoutAmount: campaign.campaign_targets[0].case_payout_amount || 0,
              monthlyRetainers: campaign.campaign_targets[0].monthly_retainers || 0,
              monthlyProfit: campaign.campaign_targets[0].target_profit || 0,
              roas: campaign.campaign_targets[0].target_roas || 0,
              monthlyRevenue: campaign.campaign_targets[0].monthly_income || 0,
              monthlyIncome: campaign.campaign_targets[0].monthly_income || 0,
              targetProfit: campaign.campaign_targets[0].target_profit || 0, 
              targetROAS: campaign.campaign_targets[0].target_roas || 0
            }
            : {
              monthlySpend: 0,
              casePayoutAmount: 0,
              monthlyRetainers: 0,
              monthlyProfit: 0,
              roas: 0,
              monthlyRevenue: 0,
              monthlyIncome: 0,
              targetProfit: 0, 
              targetROAS: 0
            };

          return {
            id: campaign.id || '',
            name: campaign.name || '',
            userId: campaign.user_id || '',
            platform: campaign.platform || '',
            accountId: campaign.account_id || undefined,
            accountName: campaign.account_name || undefined,
            createdAt: campaign.created_at || '',
            updatedAt: campaign.updated_at || '',
            is_active: campaign.is_active === undefined ? true : campaign.is_active,
            stats,
            manualStats,
            statsHistory: statsHistory || [],
            targets,
            buyerStack: []
          };
        });

        console.log(`Successfully fetched ${typedCampaigns.length} campaigns`);
        setCampaigns(typedCampaigns);
      } else {
        console.log("No campaign data returned");
        setCampaigns([]);
      }
    } catch (err) {
      console.error("Error in fetchCampaigns:", err);
      setError('Failed to fetch campaigns. Please try again.');
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const fetchHyrosAccounts = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('account_connections')
        .select('*')
        .eq('user_id', user?.id)
        .eq('platform', 'hyros');
        
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
          platform: "hyros" as "google" | "facebook" | "linkedin" | "leadprosper" | "hyros",
          isConnected: conn.is_connected,
          lastSynced: conn.last_synced,
          customerId: conn.customer_id,
          credentials: processedCredentials
        };
      });
      
      // Get HYROS connections from tokens table
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('hyros_tokens')
          .select('*')
          .eq('user_id', user?.id);
        
        if (!tokenError && tokenData && tokenData.length > 0) {
          const exists = connections.some(conn => conn.platform === 'hyros');
          if (!exists) {
            connections.push({
              id: tokenData[0].id,
              name: 'HYROS',
              platform: 'hyros' as "google" | "facebook" | "linkedin" | "leadprosper" | "hyros",
              isConnected: true,
              lastSynced: tokenData[0].last_synced,
              customerId: tokenData[0].account_id,
              credentials: {
                apiKey: tokenData[0].api_key
              }
            });
          }
        }
      } catch (tokenError) {
        console.error("Error fetching HYROS connections:", tokenError);
        // Continue even if HYROS token fetch fails
      }
      
      setAccountConnections(connections);
      return connections;
    } catch (error) {
      console.error("Error in fetchHyrosAccounts:", error);
      toast.error("Failed to fetch accounts");
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  // Modify the fetchGoogleAdsAccounts function to include HYROS connections
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
          platform: conn.platform as "google" | "facebook" | "linkedin" | "leadprosper" | "hyros",
          isConnected: conn.is_connected,
          lastSynced: conn.last_synced,
          customerId: conn.customer_id,
          credentials: processedCredentials
        };
      });
      
      
      // Get HYROS connections from tokens table
      try {
        const { data: tokenData, error: tokenError } = await supabase
          .from('hyros_tokens')
          .select('*')
          .eq('user_id', user?.id);
        
        if (!tokenError && tokenData && tokenData.length > 0) {
          const exists = connections.some(conn => conn.platform === 'hyros');
          if (!exists) {
            connections.push({
              id: tokenData[0].id,
              name: 'HYROS',
              platform: 'hyros' as "google" | "facebook" | "linkedin" | "leadprosper" | "hyros",
              isConnected: true,
              lastSynced: tokenData[0].last_synced,
              customerId: tokenData[0].account_id,
              credentials: {
                apiKey: tokenData[0].api_key
              }
            });
          }
        }
      } catch (hyrosError) {
        console.error("Error fetching HYROS connections:", hyrosError);
        // Continue even if HYROS fetch fails
      }
      
      setAccountConnections(connections);
      return connections;
    } catch (error) {
      console.error("Error in fetchGoogleAdsAccounts:", error);
      toast.error("Failed to fetch accounts");
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  const addAccountConnection = (connection: AccountConnection) => {
    setAccountConnections(prev => {
      // Check if connection already exists by id or (platform + customerId)
      const existingIndex = prev.findIndex(conn => {
        if (conn.id === connection.id) {
          return true; // Match on id
        }
        if (conn.platform === connection.platform && conn.customerId === connection.customerId) {
          return true; // Match on platform + customerId
        }
        return false;
      });
      
      if (existingIndex >= 0) {
        // Update existing connection
        const newConnections = [...prev];
        newConnections[existingIndex] = {
          ...newConnections[existingIndex],
          ...connection,
          // Preserve the original ID if we're matching on platform + customerId
          id: newConnections[existingIndex].id,
        };
        return newConnections;
      } else {
        // Add new connection
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

  const addCampaign = useCallback(async (campaignData: Omit<Campaign, "id">) => {
    try {
      // Add campaign to the database
      const { data, error } = await supabase.from('campaigns').insert([
        {
          name: campaignData.name,
          platform: campaignData.platform,
          user_id: campaignData.userId,
          account_id: campaignData.accountId || null,
          account_name: campaignData.accountName || null
        }
      ]).select('*').single();

      if (error) throw error;

      const newCampaignId = data.id;

      // Add campaign targets
      if (campaignData.targets) {
        const { error: targetsError } = await supabase.from('campaign_targets').insert([
          {
            campaign_id: newCampaignId,
            monthly_retainers: campaignData.targets.monthlyRetainers,
            case_payout_amount: campaignData.targets.casePayoutAmount,
            monthly_income: campaignData.targets.monthlyIncome,
            monthly_spend: campaignData.targets.monthlySpend,
            target_roas: campaignData.targets.targetROAS,
            target_profit: campaignData.targets.targetProfit
          }
        ]);

        if (targetsError) throw targetsError;
      }

      // Add manual stats
      if (campaignData.manualStats) {
        const { error: manualStatsError } = await supabase.from('campaign_manual_stats').insert([
          {
            campaign_id: newCampaignId,
            leads: campaignData.manualStats.leads,
            cases: campaignData.manualStats.cases,
            retainers: campaignData.manualStats.retainers || 0,
            revenue: campaignData.manualStats.revenue,
            date: campaignData.manualStats.date
          }
        ]);

        if (manualStatsError) throw manualStatsError;
      }

      // Refresh campaigns
      await fetchCampaigns();

      return newCampaignId;
    } catch (error) {
      console.error('Error adding campaign:', error);
      throw error;
    }
  }, [fetchCampaigns]);

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    setIsLoading(true);
    setError(null);

    try {
      const campaignUpdates: { [key: string]: any } = {};
      if (updates.name !== undefined) campaignUpdates.name = updates.name;
      if (updates.platform !== undefined) campaignUpdates.platform = updates.platform;
      if (updates.accountId !== undefined) campaignUpdates.account_id = updates.accountId;
      if (updates.accountName !== undefined) campaignUpdates.account_name = updates.accountName;
      if (updates.is_active !== undefined) campaignUpdates.is_active = updates.is_active; // Include is_active in updates
      
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
      // Ensure the date is in the correct format (YYYY-MM-DD)
      let formattedDate = entry.date;
      
      console.log("UpdateStatHistoryEntry - Entry being updated:", entry);
      console.log("Entry date before formatting:", entry.date);
      console.log("Entry date type:", typeof entry.date);
      
      // Don't attempt to reformat if it's already in YYYY-MM-DD format
      if (typeof entry.date === 'string' && entry.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.log("Date is already in YYYY-MM-DD format, using as is:", entry.date);
        formattedDate = entry.date;
      } else if (entry.date instanceof Date) {
        formattedDate = format(entry.date, 'yyyy-MM-dd');
        console.log("Formatted date from Date object:", formattedDate);
      }
      
      console.log("Updating database with:", {
        date: formattedDate,
        leads: entry.leads,
        cases: entry.cases,
        retainers: entry.retainers,
        revenue: entry.revenue,
        ad_spend: entry.adSpend,
        youtube_spend: entry.youtube_spend,
        meta_spend: entry.meta_spend,
        newsbreak_spend: entry.newsbreak_spend
      });
      
      const { error } = await supabase
        .from('campaign_stats_history')
        .update({
          date: formattedDate,
          leads: entry.leads,
          cases: entry.cases,
          retainers: entry.retainers,
          revenue: entry.revenue,
          ad_spend: entry.adSpend,
          youtube_spend: entry.youtube_spend,
          meta_spend: entry.meta_spend,
          newsbreak_spend: entry.newsbreak_spend,
          youtube_leads: entry.youtube_leads,
          meta_leads: entry.meta_leads,
          newsbreak_leads: entry.newsbreak_leads
        })
        .eq('id', entry.id);
        
      if (error) {
        console.error("Error updating stat history entry:", error);
        setError(error.message);
        toast.error("Failed to update stat history entry");
      } else {
        console.log("Database update successful, refreshing campaigns...");
        toast.success("Stat history entry updated successfully");
        await fetchCampaigns();
        console.log("Campaigns refreshed after update");
      }
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
      console.log(`Attempting to delete entry ${entryId} for campaign ${campaignId}`);
      
      // Query to delete the entry using both campaignId and entryId
      const { data, error, count } = await supabase
        .from('campaign_stats_history')
        .delete({ count: 'exact' })
        .eq('id', entryId)
        .eq('campaign_id', campaignId);
        
      if (error) {
        console.error("Error deleting stat history entry:", error);
        setError(error.message);
        toast.error("Failed to delete stat history entry");
        return false;
      } 
      
      if (count === 0) {
        console.warn(`No entries found with id ${entryId} for campaign ${campaignId}`);
        toast.error("No matching entries found to delete");
        return false;
      }
      
      console.log(`Successfully deleted ${count} entries`);
      toast.success("Stat history entry deleted successfully");
      await fetchCampaigns();
      return true;
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to delete stat history entry:", err);
      toast.error("Failed to delete stat history entry");
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const deleteStatHistoryEntries = async (campaignId: string, entryIds: string[]) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Delete all entries at once
      const { error } = await supabase
        .from('campaign_stats_history')
        .delete()
        .eq('campaign_id', campaignId)
        .in('id', entryIds);
      
      if (error) {
        console.error("Error deleting stat history entries:", error);
        setError(error.message);
        throw error;
      }
      
      await fetchCampaigns();
    } catch (err) {
      setError((err as Error).message);
      console.error("Failed to delete stat history entries:", err);
      throw err;
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
    setDateRange: handleSetDateRange,
    setSelectedCampaignId,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addStatHistoryEntry,
    updateStatHistoryEntry,
    deleteStatHistoryEntry,
    deleteStatHistoryEntries,
    fetchCampaigns,
    accountConnections,
    fetchGoogleAdsAccounts,
    addAccountConnection,
    selectedCampaignIds,
    setSelectedCampaignIds: handleSetSelectedCampaignIds,
    fetchHyrosAccounts
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
};
