
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "@/hooks/use-toast";
import {
  Campaign,
  AccountConnection,
  GoogleAdsMetrics as GoogleAdsMetricsType,
  StatHistoryEntry,
} from "@/types/campaign";
import { googleAdsService } from "@/services/googleAdsService";
import { supabase } from "@/integrations/supabase/client";

interface DateRangeType {
  startDate: string;
  endDate: string;
}

interface CampaignContextType {
  campaigns: Campaign[];
  accountConnections: AccountConnection[];
  addCampaign: (campaign: Omit<Campaign, "id">) => Promise<string>;
  updateCampaign: (id: string, updates: Partial<Omit<Campaign, "id">>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  addAccountConnection: (account: Omit<AccountConnection, "id">) => Promise<string>;
  updateAccountConnection: (
    id: string,
    updates: Partial<Omit<AccountConnection, "id">>
  ) => Promise<void>;
  deleteAccountConnection: (id: string) => Promise<void>;
  fetchGoogleAdsAccounts: () => Promise<AccountConnection[]>;
  isLoading: boolean;
  
  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  selectedCampaignIds: string[];
  setSelectedCampaignIds: (ids: string[]) => void;
  dateRange: DateRangeType;
  setDateRange: (range: DateRangeType) => void;
  addStatHistoryEntry: (campaignId: string, entry: Omit<StatHistoryEntry, "id" | "createdAt">) => Promise<void>;
  updateStatHistoryEntry: (campaignId: string, entry: StatHistoryEntry) => Promise<void>;
  deleteStatHistoryEntry: (campaignId: string, entryId: string) => Promise<void>;
  fetchGoogleAdsMetrics: (accountId: string, dateRange: DateRangeType) => Promise<GoogleAdsMetricsType[] | null>;
  migrateFromLocalStorage: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(
  undefined
);

interface CampaignProviderProps {
  children: ReactNode;
}

export const CampaignProvider: React.FC<CampaignProviderProps> = ({
  children,
}) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accountConnections, setAccountConnections] = useState<
    AccountConnection[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>(() => {
    const storedIds = localStorage.getItem("selectedCampaignIds");
    return storedIds ? JSON.parse(storedIds) : [];
  });
  
  const [dateRange, setDateRange] = useState<DateRangeType>(() => {
    const storedRange = localStorage.getItem("dateRange");
    if (storedRange) {
      return JSON.parse(storedRange);
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  });

  // Fetch campaigns and account connections on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // First check for authentication
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("No authenticated user, skipping data fetch");
          setIsLoading(false);
          return;
        }

        // Fetch campaigns
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*');
          
        if (campaignsError) {
          console.error("Error fetching campaigns:", campaignsError);
          toast.error("Failed to load campaigns");
        } else if (campaignsData) {
          console.log("Fetched campaigns from Supabase:", campaignsData);
          
          // For each campaign, fetch its related data
          const fullCampaigns = await Promise.all(campaignsData.map(async (campaign) => {
            // Fetch stats
            const { data: statsData } = await supabase
              .from('campaign_stats')
              .select('*')
              .eq('campaign_id', campaign.id)
              .order('date', { ascending: false })
              .limit(1)
              .single();
              
            // Fetch manual stats
            const { data: manualStatsData } = await supabase
              .from('campaign_manual_stats')
              .select('*')
              .eq('campaign_id', campaign.id)
              .order('date', { ascending: false })
              .limit(1)
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
              .limit(1)
              .single();
            
            // Construct the full campaign object
            return {
              id: campaign.id,
              name: campaign.name,
              platform: campaign.platform,
              accountId: campaign.account_id,
              accountName: campaign.account_name,
              stats: statsData ? {
                adSpend: Number(statsData.ad_spend),
                impressions: statsData.impressions,
                clicks: statsData.clicks,
                cpc: Number(statsData.cpc),
                date: new Date(statsData.date).toISOString().split('T')[0]
              } : {
                adSpend: 0,
                impressions: 0,
                clicks: 0,
                cpc: 0,
                date: new Date().toISOString().split('T')[0]
              },
              manualStats: manualStatsData ? {
                leads: manualStatsData.leads,
                cases: manualStatsData.cases,
                retainers: manualStatsData.retainers,
                revenue: Number(manualStatsData.revenue),
                date: new Date(manualStatsData.date).toISOString().split('T')[0]
              } : {
                leads: 0,
                cases: 0,
                retainers: 0,
                revenue: 0,
                date: new Date().toISOString().split('T')[0]
              },
              statsHistory: statsHistoryData ? statsHistoryData.map(entry => ({
                id: entry.id,
                date: new Date(entry.date).toISOString().split('T')[0],
                leads: entry.leads,
                cases: entry.cases,
                retainers: entry.retainers,
                revenue: Number(entry.revenue),
                adSpend: entry.ad_spend ? Number(entry.ad_spend) : undefined,
                createdAt: entry.created_at
              })) : [],
              targets: targetsData ? {
                monthlyRetainers: targetsData.monthly_retainers,
                casePayoutAmount: Number(targetsData.case_payout_amount),
                monthlyIncome: Number(targetsData.monthly_income),
                monthlySpend: Number(targetsData.monthly_spend),
                targetROAS: Number(targetsData.target_roas),
                targetProfit: Number(targetsData.target_profit)
              } : {
                monthlyRetainers: 0,
                casePayoutAmount: 0,
                monthlyIncome: 0,
                monthlySpend: 0,
                targetROAS: 0,
                targetProfit: 0
              }
            };
          }));
          
          setCampaigns(fullCampaigns);
        }
        
        // Fetch account connections
        const { data: connectionsData, error: connectionsError } = await supabase
          .from('account_connections')
          .select('*');
          
        if (connectionsError) {
          console.error("Error fetching account connections:", connectionsError);
          toast.error("Failed to load account connections");
        } else if (connectionsData) {
          console.log("Fetched account connections from Supabase:", connectionsData);
          
          const mappedConnections = connectionsData.map(connection => ({
            id: connection.id,
            name: connection.name,
            platform: connection.platform as "google" | "facebook" | "linkedin",
            isConnected: connection.is_connected,
            lastSynced: connection.last_synced,
            customerId: connection.customer_id,
            credentials: connection.credentials
          }));
          
          setAccountConnections(mappedConnections);
        }
      } catch (error) {
        console.error("Error in fetchData:", error);
        toast.error("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    localStorage.setItem("selectedCampaignIds", JSON.stringify(selectedCampaignIds));
  }, [selectedCampaignIds]);

  // Migrate data from localStorage to Supabase
  const migrateFromLocalStorage = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to migrate your data");
        setIsLoading(false);
        return;
      }
      
      const storedCampaigns = localStorage.getItem("campaigns");
      const storedConnections = localStorage.getItem("accountConnections");
      
      if (!storedCampaigns && !storedConnections) {
        toast.info("No local data found to migrate");
        setIsLoading(false);
        return;
      }
      
      // Start a transaction (not a real transaction, but conceptually similar)
      let migrationSuccess = true;
      
      // Migrate account connections first
      if (storedConnections) {
        const connections = JSON.parse(storedConnections) as AccountConnection[];
        
        for (const connection of connections) {
          // Check if connection already exists by customerId
          const { data: existingConnections } = await supabase
            .from('account_connections')
            .select('id')
            .eq('customer_id', connection.customerId);
            
          if (existingConnections && existingConnections.length > 0) {
            console.log(`Account connection with customerId ${connection.customerId} already exists, skipping`);
            continue;
          }
          
          // Insert connection
          const { error } = await supabase
            .from('account_connections')
            .insert({
              name: connection.name,
              platform: connection.platform,
              is_connected: connection.isConnected,
              last_synced: connection.lastSynced,
              customer_id: connection.customerId,
              credentials: connection.credentials,
              user_id: session.user.id
            });
            
          if (error) {
            console.error("Error migrating account connection:", error);
            migrationSuccess = false;
            break;
          }
        }
      }
      
      // Migrate campaigns
      if (storedCampaigns && migrationSuccess) {
        const campaigns = JSON.parse(storedCampaigns) as Campaign[];
        
        for (const campaign of campaigns) {
          // Check if campaign already exists by name and accountId
          const { data: existingCampaigns } = await supabase
            .from('campaigns')
            .select('id')
            .eq('name', campaign.name)
            .eq('account_id', campaign.accountId);
            
          if (existingCampaigns && existingCampaigns.length > 0) {
            console.log(`Campaign ${campaign.name} already exists, skipping`);
            continue;
          }
          
          // Insert campaign
          const { data: newCampaign, error: campaignError } = await supabase
            .from('campaigns')
            .insert({
              name: campaign.name,
              platform: campaign.platform,
              account_id: campaign.accountId,
              account_name: campaign.accountName,
              user_id: session.user.id
            })
            .select()
            .single();
            
          if (campaignError || !newCampaign) {
            console.error("Error migrating campaign:", campaignError);
            migrationSuccess = false;
            break;
          }
          
          // Insert campaign stats
          const { error: statsError } = await supabase
            .from('campaign_stats')
            .insert({
              campaign_id: newCampaign.id,
              ad_spend: campaign.stats.adSpend,
              impressions: campaign.stats.impressions,
              clicks: campaign.stats.clicks,
              cpc: campaign.stats.cpc,
              date: campaign.stats.date
            });
            
          if (statsError) {
            console.error("Error migrating campaign stats:", statsError);
            migrationSuccess = false;
            break;
          }
          
          // Insert manual stats
          const { error: manualStatsError } = await supabase
            .from('campaign_manual_stats')
            .insert({
              campaign_id: newCampaign.id,
              leads: campaign.manualStats.leads,
              cases: campaign.manualStats.cases,
              retainers: campaign.manualStats.retainers,
              revenue: campaign.manualStats.revenue,
              date: campaign.manualStats.date
            });
            
          if (manualStatsError) {
            console.error("Error migrating manual stats:", manualStatsError);
            migrationSuccess = false;
            break;
          }
          
          // Insert campaign targets
          const { error: targetsError } = await supabase
            .from('campaign_targets')
            .insert({
              campaign_id: newCampaign.id,
              monthly_retainers: campaign.targets.monthlyRetainers,
              case_payout_amount: campaign.targets.casePayoutAmount,
              monthly_income: campaign.targets.monthlyIncome,
              monthly_spend: campaign.targets.monthlySpend,
              target_roas: campaign.targets.targetROAS,
              target_profit: campaign.targets.targetProfit
            });
            
          if (targetsError) {
            console.error("Error migrating campaign targets:", targetsError);
            migrationSuccess = false;
            break;
          }
          
          // Insert stats history
          if (campaign.statsHistory && campaign.statsHistory.length > 0) {
            const historyEntries = campaign.statsHistory.map(entry => ({
              campaign_id: newCampaign.id,
              date: entry.date,
              leads: entry.leads,
              cases: entry.cases,
              retainers: entry.retainers || 0,
              revenue: entry.revenue,
              ad_spend: entry.adSpend || 0
            }));
            
            const { error: historyError } = await supabase
              .from('campaign_stats_history')
              .insert(historyEntries);
              
            if (historyError) {
              console.error("Error migrating stats history:", historyError);
              migrationSuccess = false;
              break;
            }
          }
        }
      }
      
      if (migrationSuccess) {
        toast.success("Data migrated successfully");
        // Reload data
        await fetchData();
        // Clear localStorage after successful migration
        localStorage.removeItem("campaigns");
        localStorage.removeItem("accountConnections");
      } else {
        toast.error("Migration failed");
      }
    } catch (error) {
      console.error("Error in migrateFromLocalStorage:", error);
      toast.error("Migration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable fetchData function
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // First check for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log("No authenticated user, skipping data fetch");
        setIsLoading(false);
        setCampaigns([]);
        setAccountConnections([]);
        return;
      }

      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*');
        
      if (campaignsError) {
        console.error("Error fetching campaigns:", campaignsError);
        toast.error("Failed to load campaigns");
      } else if (campaignsData) {
        console.log("Fetched campaigns from Supabase:", campaignsData);
        
        // For each campaign, fetch its related data
        const fullCampaigns = await Promise.all(campaignsData.map(async (campaign) => {
          // Fetch stats
          const { data: statsData } = await supabase
            .from('campaign_stats')
            .select('*')
            .eq('campaign_id', campaign.id)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
          // Fetch manual stats
          const { data: manualStatsData } = await supabase
            .from('campaign_manual_stats')
            .select('*')
            .eq('campaign_id', campaign.id)
            .order('date', { ascending: false })
            .limit(1)
            .maybeSingle();
            
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
            .limit(1)
            .maybeSingle();
          
          // Construct the full campaign object
          return {
            id: campaign.id,
            name: campaign.name,
            platform: campaign.platform,
            accountId: campaign.account_id,
            accountName: campaign.account_name,
            stats: statsData ? {
              adSpend: Number(statsData.ad_spend),
              impressions: statsData.impressions,
              clicks: statsData.clicks,
              cpc: Number(statsData.cpc),
              date: new Date(statsData.date).toISOString().split('T')[0]
            } : {
              adSpend: 0,
              impressions: 0,
              clicks: 0,
              cpc: 0,
              date: new Date().toISOString().split('T')[0]
            },
            manualStats: manualStatsData ? {
              leads: manualStatsData.leads,
              cases: manualStatsData.cases,
              retainers: manualStatsData.retainers,
              revenue: Number(manualStatsData.revenue),
              date: new Date(manualStatsData.date).toISOString().split('T')[0]
            } : {
              leads: 0,
              cases: 0,
              retainers: 0,
              revenue: 0,
              date: new Date().toISOString().split('T')[0]
            },
            statsHistory: statsHistoryData ? statsHistoryData.map(entry => ({
              id: entry.id,
              date: new Date(entry.date).toISOString().split('T')[0],
              leads: entry.leads,
              cases: entry.cases,
              retainers: entry.retainers,
              revenue: Number(entry.revenue),
              adSpend: entry.ad_spend ? Number(entry.ad_spend) : undefined,
              createdAt: entry.created_at
            })) : [],
            targets: targetsData ? {
              monthlyRetainers: targetsData.monthly_retainers,
              casePayoutAmount: Number(targetsData.case_payout_amount),
              monthlyIncome: Number(targetsData.monthly_income),
              monthlySpend: Number(targetsData.monthly_spend),
              targetROAS: Number(targetsData.target_roas),
              targetProfit: Number(targetsData.target_profit)
            } : {
              monthlyRetainers: 0,
              casePayoutAmount: 0,
              monthlyIncome: 0,
              monthlySpend: 0,
              targetROAS: 0,
              targetProfit: 0
            }
          };
        }));
        
        setCampaigns(fullCampaigns);
      }
      
      // Fetch account connections
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('account_connections')
        .select('*');
        
      if (connectionsError) {
        console.error("Error fetching account connections:", connectionsError);
        toast.error("Failed to load account connections");
      } else if (connectionsData) {
        console.log("Fetched account connections from Supabase:", connectionsData);
        
        const mappedConnections = connectionsData.map(connection => ({
          id: connection.id,
          name: connection.name,
          platform: connection.platform as "google" | "facebook" | "linkedin",
          isConnected: connection.is_connected,
          lastSynced: connection.last_synced,
          customerId: connection.customer_id,
          credentials: connection.credentials
        }));
        
        setAccountConnections(mappedConnections);
      }
    } catch (error) {
      console.error("Error in fetchData:", error);
      toast.error("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const addCampaign = async (campaign: Omit<Campaign, "id">): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to add a campaign");
        throw new Error("No authenticated user");
      }
      
      // Insert campaign
      const { data: newCampaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert({
          name: campaign.name,
          platform: campaign.platform,
          account_id: campaign.accountId,
          account_name: campaign.accountName,
          user_id: session.user.id
        })
        .select()
        .single();
        
      if (campaignError || !newCampaign) {
        console.error("Error adding campaign:", campaignError);
        toast.error("Failed to add campaign");
        throw campaignError;
      }
      
      // Insert campaign stats
      const { error: statsError } = await supabase
        .from('campaign_stats')
        .insert({
          campaign_id: newCampaign.id,
          ad_spend: campaign.stats.adSpend,
          impressions: campaign.stats.impressions,
          clicks: campaign.stats.clicks,
          cpc: campaign.stats.cpc,
          date: campaign.stats.date
        });
        
      if (statsError) {
        console.error("Error adding campaign stats:", statsError);
        toast.error("Failed to add campaign stats");
        throw statsError;
      }
      
      // Insert manual stats
      const { error: manualStatsError } = await supabase
        .from('campaign_manual_stats')
        .insert({
          campaign_id: newCampaign.id,
          leads: campaign.manualStats.leads,
          cases: campaign.manualStats.cases,
          retainers: campaign.manualStats.retainers,
          revenue: campaign.manualStats.revenue,
          date: campaign.manualStats.date
        });
        
      if (manualStatsError) {
        console.error("Error adding manual stats:", manualStatsError);
        toast.error("Failed to add campaign manual stats");
        throw manualStatsError;
      }
      
      // Insert campaign targets
      const { error: targetsError } = await supabase
        .from('campaign_targets')
        .insert({
          campaign_id: newCampaign.id,
          monthly_retainers: campaign.targets.monthlyRetainers,
          case_payout_amount: campaign.targets.casePayoutAmount,
          monthly_income: campaign.targets.monthlyIncome,
          monthly_spend: campaign.targets.monthlySpend,
          target_roas: campaign.targets.targetROAS,
          target_profit: campaign.targets.targetProfit
        });
        
      if (targetsError) {
        console.error("Error adding campaign targets:", targetsError);
        toast.error("Failed to add campaign targets");
        throw targetsError;
      }
      
      // Refresh campaigns
      await fetchData();
      
      return newCampaign.id;
    } catch (error) {
      console.error("Error in addCampaign:", error);
      throw error;
    }
  };

  const updateCampaign = async (
    id: string,
    updates: Partial<Omit<Campaign, "id">>
  ): Promise<void> => {
    try {
      // Prepare campaign updates if they exist
      if (updates.name || updates.platform || updates.accountId || updates.accountName) {
        const campaignUpdates: any = {};
        
        if (updates.name) campaignUpdates.name = updates.name;
        if (updates.platform) campaignUpdates.platform = updates.platform;
        if (updates.accountId) campaignUpdates.account_id = updates.accountId;
        if (updates.accountName) campaignUpdates.account_name = updates.accountName;
        
        const { error } = await supabase
          .from('campaigns')
          .update(campaignUpdates)
          .eq('id', id);
          
        if (error) {
          console.error("Error updating campaign:", error);
          toast.error("Failed to update campaign");
          throw error;
        }
      }
      
      // Update stats if they exist
      if (updates.stats) {
        const { data: existingStats } = await supabase
          .from('campaign_stats')
          .select('id')
          .eq('campaign_id', id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (existingStats) {
          // Update existing stats
          const { error } = await supabase
            .from('campaign_stats')
            .update({
              ad_spend: updates.stats.adSpend,
              impressions: updates.stats.impressions,
              clicks: updates.stats.clicks,
              cpc: updates.stats.cpc,
              date: updates.stats.date
            })
            .eq('id', existingStats.id);
            
          if (error) {
            console.error("Error updating campaign stats:", error);
            toast.error("Failed to update campaign stats");
            throw error;
          }
        } else {
          // Insert new stats
          const { error } = await supabase
            .from('campaign_stats')
            .insert({
              campaign_id: id,
              ad_spend: updates.stats.adSpend,
              impressions: updates.stats.impressions,
              clicks: updates.stats.clicks,
              cpc: updates.stats.cpc,
              date: updates.stats.date
            });
            
          if (error) {
            console.error("Error adding campaign stats:", error);
            toast.error("Failed to add campaign stats");
            throw error;
          }
        }
      }
      
      // Update manual stats if they exist
      if (updates.manualStats) {
        const { data: existingManualStats } = await supabase
          .from('campaign_manual_stats')
          .select('id')
          .eq('campaign_id', id)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        if (existingManualStats) {
          // Update existing manual stats
          const { error } = await supabase
            .from('campaign_manual_stats')
            .update({
              leads: updates.manualStats.leads,
              cases: updates.manualStats.cases,
              retainers: updates.manualStats.retainers,
              revenue: updates.manualStats.revenue,
              date: updates.manualStats.date
            })
            .eq('id', existingManualStats.id);
            
          if (error) {
            console.error("Error updating campaign manual stats:", error);
            toast.error("Failed to update campaign manual stats");
            throw error;
          }
        } else {
          // Insert new manual stats
          const { error } = await supabase
            .from('campaign_manual_stats')
            .insert({
              campaign_id: id,
              leads: updates.manualStats.leads,
              cases: updates.manualStats.cases,
              retainers: updates.manualStats.retainers,
              revenue: updates.manualStats.revenue,
              date: updates.manualStats.date
            });
            
          if (error) {
            console.error("Error adding campaign manual stats:", error);
            toast.error("Failed to add campaign manual stats");
            throw error;
          }
        }
      }
      
      // Update targets if they exist
      if (updates.targets) {
        const { data: existingTargets } = await supabase
          .from('campaign_targets')
          .select('id')
          .eq('campaign_id', id)
          .limit(1)
          .maybeSingle();
          
        if (existingTargets) {
          // Update existing targets
          const { error } = await supabase
            .from('campaign_targets')
            .update({
              monthly_retainers: updates.targets.monthlyRetainers,
              case_payout_amount: updates.targets.casePayoutAmount,
              monthly_income: updates.targets.monthlyIncome,
              monthly_spend: updates.targets.monthlySpend,
              target_roas: updates.targets.targetROAS,
              target_profit: updates.targets.targetProfit
            })
            .eq('id', existingTargets.id);
            
          if (error) {
            console.error("Error updating campaign targets:", error);
            toast.error("Failed to update campaign targets");
            throw error;
          }
        } else {
          // Insert new targets
          const { error } = await supabase
            .from('campaign_targets')
            .insert({
              campaign_id: id,
              monthly_retainers: updates.targets.monthlyRetainers,
              case_payout_amount: updates.targets.casePayoutAmount,
              monthly_income: updates.targets.monthlyIncome,
              monthly_spend: updates.targets.monthlySpend,
              target_roas: updates.targets.targetROAS,
              target_profit: updates.targets.targetProfit
            });
            
          if (error) {
            console.error("Error adding campaign targets:", error);
            toast.error("Failed to add campaign targets");
            throw error;
          }
        }
      }
      
      // Refresh campaigns
      await fetchData();
    } catch (error) {
      console.error("Error in updateCampaign:", error);
      throw error;
    }
  };

  const deleteCampaign = async (id: string): Promise<void> => {
    try {
      // Delete campaign - the cascade will delete related records
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting campaign:", error);
        toast.error("Failed to delete campaign");
        throw error;
      }
      
      // Refresh campaigns
      await fetchData();
    } catch (error) {
      console.error("Error in deleteCampaign:", error);
      throw error;
    }
  };

  const addAccountConnection = async (
    account: Omit<AccountConnection, "id">
  ): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to add an account connection");
        throw new Error("No authenticated user");
      }
      
      // Insert account connection
      const { data, error } = await supabase
        .from('account_connections')
        .insert({
          name: account.name,
          platform: account.platform,
          is_connected: account.isConnected,
          last_synced: account.lastSynced,
          customer_id: account.customerId,
          credentials: account.credentials,
          user_id: session.user.id
        })
        .select()
        .single();
        
      if (error) {
        console.error("Error adding account connection:", error);
        toast.error("Failed to add account connection");
        throw error;
      }
      
      // Refresh account connections
      await fetchData();
      
      return data.id;
    } catch (error) {
      console.error("Error in addAccountConnection:", error);
      throw error;
    }
  };

  const updateAccountConnection = async (
    id: string,
    updates: Partial<Omit<AccountConnection, "id">>
  ): Promise<void> => {
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.platform) updateData.platform = updates.platform;
      if (updates.isConnected !== undefined) updateData.is_connected = updates.isConnected;
      if (updates.lastSynced) updateData.last_synced = updates.lastSynced;
      if (updates.customerId) updateData.customer_id = updates.customerId;
      if (updates.credentials) updateData.credentials = updates.credentials;
      
      const { error } = await supabase
        .from('account_connections')
        .update(updateData)
        .eq('id', id);
        
      if (error) {
        console.error("Error updating account connection:", error);
        toast.error("Failed to update account connection");
        throw error;
      }
      
      // Refresh account connections
      await fetchData();
    } catch (error) {
      console.error("Error in updateAccountConnection:", error);
      throw error;
    }
  };

  const deleteAccountConnection = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('account_connections')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error("Error deleting account connection:", error);
        toast.error("Failed to delete account connection");
        throw error;
      }
      
      // Refresh account connections
      await fetchData();
    } catch (error) {
      console.error("Error in deleteAccountConnection:", error);
      throw error;
    }
  };

  const addStatHistoryEntry = async (
    campaignId: string, 
    entry: Omit<StatHistoryEntry, "id" | "createdAt">
  ): Promise<void> => {
    try {
      // Insert stats history entry
      const { error } = await supabase
        .from('campaign_stats_history')
        .insert({
          campaign_id: campaignId,
          date: entry.date,
          leads: entry.leads,
          cases: entry.cases,
          retainers: entry.retainers || 0,
          revenue: entry.revenue,
          ad_spend: entry.adSpend || 0
        });
        
      if (error) {
        console.error("Error adding stats history entry:", error);
        toast.error("Failed to add stats history");
        throw error;
      }
      
      // Update campaign manual stats with the new totals
      const { data: campaign } = await supabase
        .from('campaigns')
        .select(`
          id,
          campaign_manual_stats(leads, cases, retainers, revenue),
          campaign_stats(ad_spend)
        `)
        .eq('id', campaignId)
        .single();
        
      if (campaign) {
        const manualStats = campaign.campaign_manual_stats[0];
        const stats = campaign.campaign_stats[0];
        
        if (manualStats) {
          // Update manual stats
          const { error: manualStatsError } = await supabase
            .from('campaign_manual_stats')
            .update({
              leads: manualStats.leads + entry.leads,
              cases: manualStats.cases + entry.cases,
              retainers: manualStats.retainers + (entry.retainers || 0),
              revenue: manualStats.revenue + entry.revenue
            })
            .eq('campaign_id', campaignId);
            
          if (manualStatsError) {
            console.error("Error updating manual stats:", manualStatsError);
            toast.error("Failed to update campaign totals");
          }
        }
        
        if (stats && entry.adSpend) {
          // Update ad spend
          const { error: statsError } = await supabase
            .from('campaign_stats')
            .update({
              ad_spend: stats.ad_spend + entry.adSpend
            })
            .eq('campaign_id', campaignId);
            
          if (statsError) {
            console.error("Error updating ad spend:", statsError);
            toast.error("Failed to update campaign ad spend");
          }
        }
      }
      
      // Refresh campaigns
      await fetchData();
    } catch (error) {
      console.error("Error in addStatHistoryEntry:", error);
      throw error;
    }
  };
  
  const updateStatHistoryEntry = async (
    campaignId: string,
    updatedEntry: StatHistoryEntry
  ): Promise<void> => {
    try {
      // Get the original entry to calculate differences
      const { data: originalEntry } = await supabase
        .from('campaign_stats_history')
        .select('*')
        .eq('id', updatedEntry.id)
        .single();
        
      if (!originalEntry) {
        console.error("Original entry not found");
        toast.error("Failed to update stats history");
        return;
      }
      
      // Calculate differences
      const leadsDiff = updatedEntry.leads - originalEntry.leads;
      const casesDiff = updatedEntry.cases - originalEntry.cases;
      const retainersDiff = (updatedEntry.retainers || 0) - (originalEntry.retainers || 0);
      const revenueDiff = updatedEntry.revenue - originalEntry.revenue;
      const adSpendDiff = (updatedEntry.adSpend || 0) - (originalEntry.ad_spend || 0);
      
      // Update the entry
      const { error } = await supabase
        .from('campaign_stats_history')
        .update({
          date: updatedEntry.date,
          leads: updatedEntry.leads,
          cases: updatedEntry.cases,
          retainers: updatedEntry.retainers || 0,
          revenue: updatedEntry.revenue,
          ad_spend: updatedEntry.adSpend || 0
        })
        .eq('id', updatedEntry.id);
        
      if (error) {
        console.error("Error updating stats history entry:", error);
        toast.error("Failed to update stats history");
        throw error;
      }
      
      // Update campaign totals
      const { data: campaign } = await supabase
        .from('campaigns')
        .select(`
          id,
          campaign_manual_stats(id, leads, cases, retainers, revenue),
          campaign_stats(id, ad_spend)
        `)
        .eq('id', campaignId)
        .single();
        
      if (campaign) {
        const manualStats = campaign.campaign_manual_stats[0];
        const stats = campaign.campaign_stats[0];
        
        if (manualStats) {
          // Update manual stats
          const { error: manualStatsError } = await supabase
            .from('campaign_manual_stats')
            .update({
              leads: manualStats.leads + leadsDiff,
              cases: manualStats.cases + casesDiff,
              retainers: manualStats.retainers + retainersDiff,
              revenue: manualStats.revenue + revenueDiff
            })
            .eq('id', manualStats.id);
            
          if (manualStatsError) {
            console.error("Error updating manual stats:", manualStatsError);
            toast.error("Failed to update campaign totals");
          }
        }
        
        if (stats && adSpendDiff !== 0) {
          // Update ad spend
          const { error: statsError } = await supabase
            .from('campaign_stats')
            .update({
              ad_spend: stats.ad_spend + adSpendDiff
            })
            .eq('id', stats.id);
            
          if (statsError) {
            console.error("Error updating ad spend:", statsError);
            toast.error("Failed to update campaign ad spend");
          }
        }
      }
      
      // Refresh campaigns
      await fetchData();
    } catch (error) {
      console.error("Error in updateStatHistoryEntry:", error);
      throw error;
    }
  };
  
  const deleteStatHistoryEntry = async (
    campaignId: string,
    entryId: string
  ): Promise<void> => {
    try {
      // Get the entry to be deleted
      const { data: entryToDelete } = await supabase
        .from('campaign_stats_history')
        .select('*')
        .eq('id', entryId)
        .single();
        
      if (!entryToDelete) {
        console.error("Entry to delete not found");
        toast.error("Failed to delete stats history");
        return;
      }
      
      // Delete the entry
      const { error } = await supabase
        .from('campaign_stats_history')
        .delete()
        .eq('id', entryId);
        
      if (error) {
        console.error("Error deleting stats history entry:", error);
        toast.error("Failed to delete stats history");
        throw error;
      }
      
      // Update campaign totals
      const { data: campaign } = await supabase
        .from('campaigns')
        .select(`
          id,
          campaign_manual_stats(id, leads, cases, retainers, revenue),
          campaign_stats(id, ad_spend)
        `)
        .eq('id', campaignId)
        .single();
        
      if (campaign) {
        const manualStats = campaign.campaign_manual_stats[0];
        const stats = campaign.campaign_stats[0];
        
        if (manualStats) {
          // Update manual stats
          const { error: manualStatsError } = await supabase
            .from('campaign_manual_stats')
            .update({
              leads: manualStats.leads - entryToDelete.leads,
              cases: manualStats.cases - entryToDelete.cases,
              retainers: manualStats.retainers - (entryToDelete.retainers || 0),
              revenue: manualStats.revenue - entryToDelete.revenue
            })
            .eq('id', manualStats.id);
            
          if (manualStatsError) {
            console.error("Error updating manual stats:", manualStatsError);
            toast.error("Failed to update campaign totals");
          }
        }
        
        if (stats && entryToDelete.ad_spend) {
          // Update ad spend
          const { error: statsError } = await supabase
            .from('campaign_stats')
            .update({
              ad_spend: stats.ad_spend - entryToDelete.ad_spend
            })
            .eq('id', stats.id);
            
          if (statsError) {
            console.error("Error updating ad spend:", statsError);
            toast.error("Failed to update campaign ad spend");
          }
        }
      }
      
      // Refresh campaigns
      await fetchData();
    } catch (error) {
      console.error("Error in deleteStatHistoryEntry:", error);
      throw error;
    }
  };

  const fetchGoogleAdsAccounts = async () => {
    try {
      setIsLoading(true);
      
      const googleAccounts = await googleAdsService.fetchGoogleAdsAccounts();
      
      if (googleAccounts && googleAccounts.length > 0) {
        console.log("Fetched Google Ads accounts:", googleAccounts);
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast.error("Please sign in to add Google Ads accounts");
          return accountConnections;
        }
        
        const currentTime = new Date().toISOString();
        
        for (const account of googleAccounts) {
          // Check if account already exists
          const { data: existingAccounts } = await supabase
            .from('account_connections')
            .select('id, customer_id')
            .eq('customer_id', account.customerId || account.id);
            
          if (existingAccounts && existingAccounts.length > 0) {
            // Update existing account
            await supabase
              .from('account_connections')
              .update({
                name: account.name || `Google Ads Account ${account.customerId || ''}`,
                is_connected: true,
                last_synced: currentTime
              })
              .eq('id', existingAccounts[0].id);
          } else {
            // Add new account
            await supabase
              .from('account_connections')
              .insert({
                name: account.name || `Google Ads Account ${account.customerId || ''}`,
                platform: "google",
                is_connected: true,
                last_synced: currentTime,
                customer_id: account.customerId || account.id,
                credentials: {
                  customerId: account.customerId || account.id
                },
                user_id: session.user.id
              });
          }
        }
        
        // Refresh account connections
        await fetchData();
        
        return accountConnections;
      }
      
      return accountConnections;
    } catch (error) {
      console.error("Error fetching Google Ads accounts:", error);
      toast.error("Failed to import Google Ads accounts");
      return accountConnections;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleAdsMetrics = async (
    accountId: string,
    dateRange: DateRangeType
  ): Promise<GoogleAdsMetricsType[] | null> => {
    try {
      setIsLoading(true);
      
      const metrics = await googleAdsService.fetchGoogleAdsMetrics(
        accountId,
        {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      );
      
      return metrics;
    } catch (error) {
      console.error("Error fetching Google Ads metrics:", error);
      toast.error("Failed to fetch Google Ads metrics");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: CampaignContextType = {
    campaigns,
    accountConnections,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addAccountConnection,
    updateAccountConnection,
    deleteAccountConnection,
    fetchGoogleAdsAccounts,
    isLoading,
    selectedCampaignId,
    setSelectedCampaignId,
    selectedCampaignIds,
    setSelectedCampaignIds,
    dateRange,
    setDateRange,
    addStatHistoryEntry,
    updateStatHistoryEntry,
    deleteStatHistoryEntry,
    fetchGoogleAdsMetrics,
    migrateFromLocalStorage
  };

  return (
    <CampaignContext.Provider value={contextValue}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
};
