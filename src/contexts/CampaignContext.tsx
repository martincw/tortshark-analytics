import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useMemo,
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

interface DateRangeType {
  startDate: string;
  endDate: string;
}

interface CampaignContextType {
  campaigns: Campaign[];
  accountConnections: AccountConnection[];
  addCampaign: (campaign: Omit<Campaign, "id">) => string;
  updateCampaign: (id: string, updates: Partial<Omit<Campaign, "id">>) => void;
  deleteCampaign: (id: string) => void;
  addAccountConnection: (account: Omit<AccountConnection, "id">) => string;
  updateAccountConnection: (
    id: string,
    updates: Partial<Omit<AccountConnection, "id">>
  ) => void;
  deleteAccountConnection: (id: string) => void;
  fetchGoogleAdsAccounts: () => Promise<AccountConnection[]>;
  isLoading: boolean;
  
  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  selectedCampaignIds: string[];
  setSelectedCampaignIds: (ids: string[]) => void;
  dateRange: DateRangeType;
  setDateRange: (range: DateRangeType) => void;
  addStatHistoryEntry: (campaignId: string, entry: Omit<StatHistoryEntry, "id" | "createdAt">) => void;
  updateStatHistoryEntry: (campaignId: string, entry: StatHistoryEntry) => void;
  deleteStatHistoryEntry: (campaignId: string, entryId: string) => void;
  fetchGoogleAdsMetrics: (accountId: string, dateRange: DateRangeType) => Promise<GoogleAdsMetricsType[] | null>;
  campaignTypes: string[];
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
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    const storedCampaigns = localStorage.getItem("campaigns");
    return storedCampaigns ? JSON.parse(storedCampaigns) : [];
  });
  const [accountConnections, setAccountConnections] = useState<
    AccountConnection[]
  >(() => {
    const storedAccounts = localStorage.getItem("accountConnections");
    return storedAccounts ? JSON.parse(storedAccounts) : [];
  });
  const [isLoading, setIsLoading] = useState(false);
  
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

  useEffect(() => {
    localStorage.setItem("campaigns", JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem("accountConnections", JSON.stringify(accountConnections));
  }, [accountConnections]);
  
  useEffect(() => {
    localStorage.setItem("selectedCampaignIds", JSON.stringify(selectedCampaignIds));
  }, [selectedCampaignIds]);

  const addCampaign = (campaign: Omit<Campaign, "id">): string => {
    const id = uuidv4();
    const newCampaign = { 
      id, 
      ...campaign,
      statsHistory: [] 
    };
    setCampaigns([...campaigns, newCampaign]);
    return id;
  };

  const updateCampaign = (
    id: string,
    updates: Partial<Omit<Campaign, "id">>
  ) => {
    setCampaigns(
      campaigns.map((campaign) =>
        campaign.id === id ? { ...campaign, ...updates } : campaign
      )
    );
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter((campaign) => campaign.id !== id));
  };

  const addAccountConnection = (
    account: Omit<AccountConnection, "id">
  ): string => {
    const id = uuidv4();
    const newAccount = { id, ...account };
    setAccountConnections([...accountConnections, newAccount]);
    return id;
  };

  const updateAccountConnection = (
    id: string,
    updates: Partial<Omit<AccountConnection, "id">>
  ) => {
    setAccountConnections(
      accountConnections.map((account) =>
        account.id === id ? { ...account, ...updates } : account
      )
    );
  };

  const deleteAccountConnection = (id: string) => {
    setAccountConnections(
      accountConnections.filter((account) => account.id !== id)
    );
  };

  const addStatHistoryEntry = (
    campaignId: string, 
    entry: Omit<StatHistoryEntry, "id" | "createdAt">
  ) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) return;
    
    const newEntry: StatHistoryEntry = {
      id: uuidv4(),
      ...entry,
      createdAt: new Date().toISOString()
    };
    
    const updatedCampaign = {
      ...campaign,
      statsHistory: [...(campaign.statsHistory || []), newEntry],
      manualStats: {
        ...campaign.manualStats,
        leads: campaign.manualStats.leads + entry.leads,
        cases: campaign.manualStats.cases + entry.cases,
        retainers: campaign.manualStats.retainers + (entry.retainers || 0),
        revenue: campaign.manualStats.revenue + entry.revenue
      },
      stats: {
        ...campaign.stats,
        adSpend: campaign.stats.adSpend + (entry.adSpend || 0)
      }
    };
    
    setCampaigns(
      campaigns.map(c => c.id === campaignId ? updatedCampaign : c)
    );
  };
  
  const updateStatHistoryEntry = (
    campaignId: string,
    updatedEntry: StatHistoryEntry
  ) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign || !campaign.statsHistory) return;
    
    const oldEntry = campaign.statsHistory.find(e => e.id === updatedEntry.id);
    if (!oldEntry) return;
    
    const leadsDiff = updatedEntry.leads - oldEntry.leads;
    const casesDiff = updatedEntry.cases - oldEntry.cases;
    const retainersDiff = (updatedEntry.retainers || 0) - (oldEntry.retainers || 0);
    const revenueDiff = updatedEntry.revenue - oldEntry.revenue;
    const adSpendDiff = (updatedEntry.adSpend || 0) - (oldEntry.adSpend || 0);
    
    const updatedCampaign = {
      ...campaign,
      statsHistory: campaign.statsHistory.map(e => 
        e.id === updatedEntry.id ? updatedEntry : e
      ),
      manualStats: {
        ...campaign.manualStats,
        leads: campaign.manualStats.leads + leadsDiff,
        cases: campaign.manualStats.cases + casesDiff,
        retainers: campaign.manualStats.retainers + retainersDiff,
        revenue: campaign.manualStats.revenue + revenueDiff
      },
      stats: {
        ...campaign.stats,
        adSpend: campaign.stats.adSpend + adSpendDiff
      }
    };
    
    setCampaigns(
      campaigns.map(c => c.id === campaignId ? updatedCampaign : c)
    );
  };
  
  const deleteStatHistoryEntry = (
    campaignId: string,
    entryId: string
  ) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign || !campaign.statsHistory) return;
    
    const entryToDelete = campaign.statsHistory.find(e => e.id === entryId);
    if (!entryToDelete) return;
    
    const updatedCampaign = {
      ...campaign,
      statsHistory: campaign.statsHistory.filter(e => e.id !== entryId),
      manualStats: {
        ...campaign.manualStats,
        leads: campaign.manualStats.leads - entryToDelete.leads,
        cases: campaign.manualStats.cases - entryToDelete.cases,
        retainers: campaign.manualStats.retainers - (entryToDelete.retainers || 0),
        revenue: campaign.manualStats.revenue - entryToDelete.revenue
      },
      stats: {
        ...campaign.stats,
        adSpend: campaign.stats.adSpend - (entryToDelete.adSpend || 0)
      }
    };
    
    setCampaigns(
      campaigns.map(c => c.id === campaignId ? updatedCampaign : c)
    );
  };

  const fetchGoogleAdsAccounts = async () => {
    try {
      setIsLoading(true);
      
      const googleAccounts = await googleAdsService.fetchGoogleAdsAccounts();
      
      if (googleAccounts && googleAccounts.length > 0) {
        console.log("Fetched Google Ads accounts:", googleAccounts);
        
        const currentTime = new Date().toISOString();
        
        const importedAccounts = googleAccounts.map(account => {
          return {
            id: account.id || crypto.randomUUID(),
            name: account.name || `Google Ads Account ${account.customerId || ''}`,
            platform: "google" as const,
            isConnected: true,
            lastSynced: currentTime,
            customerId: account.customerId || account.id,
            credentials: {
              customerId: account.customerId || account.id
            }
          };
        });
        
        const existingCustomerIds = accountConnections.map(acc => acc.customerId);
        
        const newAccounts = importedAccounts.filter(
          acc => !existingCustomerIds.includes(acc.customerId)
        );
        
        const updatedExistingAccounts = accountConnections.map(existing => {
          const matchingImport = importedAccounts.find(
            imported => imported.customerId === existing.customerId
          );
          
          if (matchingImport) {
            return {
              ...existing,
              name: matchingImport.name,
              isConnected: true,
              lastSynced: currentTime
            };
          }
          
          return existing;
        });
        
        setAccountConnections([...updatedExistingAccounts, ...newAccounts]);
        
        localStorage.setItem(
          "accountConnections",
          JSON.stringify([...updatedExistingAccounts, ...newAccounts])
        );
        
        return [...updatedExistingAccounts, ...newAccounts];
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

  const campaignTypes = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return [];
    return Array.from(new Set(campaigns.map(campaign => campaign.name)));
  }, [campaigns]);

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
    campaignTypes
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
