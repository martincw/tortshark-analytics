
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import {
  Campaign,
  CampaignStats,
  ManualStats,
  StatHistoryEntry,
  CampaignTargets,
  DateRange,
  AccountConnection,
  GoogleAdsMetrics,
  CaseAttribution,
  CaseBuyer,
} from "@/types/campaign";
import {
  formatDateForStorage,
  getLocalDateString,
  createDateBoundaries,
} from "@/lib/utils/ManualDateUtils";

interface CampaignContextType {
  campaigns: Campaign[];
  accountConnections: AccountConnection[];
  selectedCampaignId: string | null;
  selectedCampaignIds: string[];
  dateRange: DateRange;
  caseBuyers: CaseBuyer[];
  caseAttributions: CaseAttribution[];
  isLoading: boolean;
  setSelectedCampaignId: (id: string | null) => void;
  setSelectedCampaignIds: (ids: string[]) => void;
  setDateRange: (dateRange: DateRange) => void;
  addCampaign: (campaign: Omit<Campaign, "id" | "stats" | "statsHistory">) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  addStatHistoryEntry: (campaignId: string, entry: Omit<StatHistoryEntry, "id" | "createdAt">) => void;
  updateStatHistoryEntry: (campaignId: string, entry: StatHistoryEntry) => void;
  deleteStatHistoryEntry: (campaignId: string, entryId: string) => Promise<void>;
  updateCampaignStats: (campaignId: string, stats: CampaignStats) => void;
  addAccountConnection: (accountConnection: AccountConnection) => void;
  updateAccountConnection: (id: string, updates: Partial<AccountConnection>) => void;
  deleteAccountConnection: (id: string) => void;
  syncAccountConnection: (id: string) => Promise<void>;
  fetchGoogleAdsMetrics: (campaignId: string, startDate: string, endDate: string) => Promise<GoogleAdsMetrics[]>;
  addCaseBuyer: (caseBuyer: Omit<CaseBuyer, "id">) => void;
  updateCaseBuyer: (id: string, updates: Partial<CaseBuyer>) => void;
  deleteCaseBuyer: (id: string) => void;
  addCaseAttribution: (caseAttribution: Omit<CaseAttribution, "id">) => void;
  updateCaseAttribution: (id: string, updates: Partial<CaseAttribution>) => void;
  deleteCaseAttribution: (id: string) => void;
  fetchGoogleAdsAccounts: () => Promise<AccountConnection[]>;
  fetchCampaigns: () => Promise<Campaign[]>;
  migrateFromLocalStorage: () => Promise<void>;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

interface CampaignProviderProps {
  children: React.ReactNode;
}

const CampaignProvider: React.FC<CampaignProviderProps> = ({ children }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accountConnections, setAccountConnections] = useState<AccountConnection[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getLocalDateString(new Date()),
    endDate: getLocalDateString(new Date()),
  });
  const [caseBuyers, setCaseBuyers] = useState<CaseBuyer[]>([]);
  const [caseAttributions, setCaseAttributions] = useState<CaseAttribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load campaigns from local storage on component mount
  useEffect(() => {
    setIsLoading(true);
    try {
      const storedCampaigns = localStorage.getItem("campaigns");
      const initialCampaigns = storedCampaigns ? JSON.parse(storedCampaigns) : [];
      setCampaigns(initialCampaigns);

      const storedAccountConnections = localStorage.getItem("accountConnections");
      const initialAccountConnections = storedAccountConnections ? JSON.parse(storedAccountConnections) : [];
      setAccountConnections(initialAccountConnections);

      const storedCaseBuyers = localStorage.getItem("caseBuyers");
      const initialCaseBuyers = storedCaseBuyers ? JSON.parse(storedCaseBuyers) : [];
      setCaseBuyers(initialCaseBuyers);

      const storedCaseAttributions = localStorage.getItem("caseAttributions");
      const initialCaseAttributions = storedCaseAttributions ? JSON.parse(storedCaseAttributions) : [];
      setCaseAttributions(initialCaseAttributions);
    } catch (error) {
      console.error("Error loading data from local storage:", error);
      toast.error("Error loading data from local storage");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save campaigns to local storage whenever campaigns state changes
  useEffect(() => {
    localStorage.setItem("campaigns", JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem("accountConnections", JSON.stringify(accountConnections));
  }, [accountConnections]);

  useEffect(() => {
    localStorage.setItem("caseBuyers", JSON.stringify(caseBuyers));
  }, [caseBuyers]);

  useEffect(() => {
    localStorage.setItem("caseAttributions", JSON.stringify(caseAttributions));
  }, [caseAttributions]);

  const saveCampaignsToStorage = (campaignsToSave: Campaign[]) => {
    localStorage.setItem("campaigns", JSON.stringify(campaignsToSave));
  };

  const addCampaign = (campaign: Omit<Campaign, "id" | "stats" | "statsHistory">) => {
    const newCampaign: Campaign = {
      id: uuidv4(),
      stats: {
        adSpend: 0,
        impressions: 0,
        clicks: 0,
        cpc: 0,
        date: formatDateForStorage(new Date()),
      },
      manualStats: {
        leads: 0,
        cases: 0,
        retainers: 0,
        revenue: 0,
        date: formatDateForStorage(new Date()),
      },
      statsHistory: [],
      ...campaign,
    };

    setCampaigns([...campaigns, newCampaign]);
    toast.success("Campaign added successfully");
  };

  const updateCampaign = (id: string, updates: Partial<Campaign>) => {
    const updatedCampaigns = campaigns.map((campaign) =>
      campaign.id === id ? { ...campaign, ...updates } : campaign
    );
    setCampaigns(updatedCampaigns);
    saveCampaignsToStorage(updatedCampaigns);
    toast.success("Campaign updated successfully");
  };

  const deleteCampaign = (id: string) => {
    const updatedCampaigns = campaigns.filter((campaign) => campaign.id !== id);
    setCampaigns(updatedCampaigns);
    saveCampaignsToStorage(updatedCampaigns);
    toast.success("Campaign deleted successfully");
  };

  const updateCampaignTotals = (campaign: Campaign) => {
    if (!campaign) {
      console.error("Campaign is undefined, cannot update totals.");
      return;
    }

    if (!campaign.statsHistory || !Array.isArray(campaign.statsHistory)) {
      console.error("Campaign statsHistory is undefined or not an array.");
      return;
    }

    let totalLeads = campaign.manualStats.leads || 0;
    let totalCases = campaign.manualStats.cases || 0;
    let totalRevenue = campaign.manualStats.revenue || 0;
    let totalAdSpend = campaign.stats.adSpend || 0;

    campaign.statsHistory.forEach((entry) => {
      totalLeads += entry.leads || 0;
      totalCases += entry.cases || 0;
      totalRevenue += entry.revenue || 0;
      totalAdSpend += entry.adSpend || 0;
    });

    campaign.manualStats.leads = totalLeads;
    campaign.manualStats.cases = totalCases;
    campaign.manualStats.revenue = totalRevenue;
    campaign.stats.adSpend = totalAdSpend;
  };

  const addStatHistoryEntry = (campaignId: string, entry: Omit<StatHistoryEntry, "id" | "createdAt">) => {
    const newEntry: StatHistoryEntry = {
      id: uuidv4(),
      ...entry,
      createdAt: new Date().toISOString(),
    };

    const updatedCampaigns = JSON.parse(JSON.stringify(campaigns));
    const campaign = updatedCampaigns.find((c: Campaign) => c.id === campaignId);

    if (!campaign) {
      console.error(`Campaign ${campaignId} not found for adding stats history`);
      toast.error("Campaign not found");
      return;
    }

    if (!campaign.statsHistory) {
      campaign.statsHistory = [];
    }

    campaign.statsHistory.push(newEntry);

    updateCampaignTotals(campaign);
    setCampaigns(updatedCampaigns);
    saveCampaignsToStorage(updatedCampaigns);
    toast.success("Stats history added successfully");
  };

  const updateStatHistoryEntry = (campaignId: string, entry: StatHistoryEntry) => {
    const updatedCampaigns = JSON.parse(JSON.stringify(campaigns));
    const campaign = updatedCampaigns.find((c: Campaign) => c.id === campaignId);

    if (!campaign) {
      console.error(`Campaign ${campaignId} not found for updating stats history`);
      toast.error("Campaign not found");
      return;
    }

    const entryIndex = campaign.statsHistory.findIndex((e: StatHistoryEntry) => e.id === entry.id);

    if (entryIndex === -1) {
      console.error(`Entry ${entry.id} not found in campaign ${campaignId}`);
      toast.error("Entry not found");
      return;
    }

    campaign.statsHistory[entryIndex] = entry;

    updateCampaignTotals(campaign);
    setCampaigns(updatedCampaigns);
    saveCampaignsToStorage(updatedCampaigns);
    toast.success("Stats history updated successfully");
  };

  const deleteStatHistoryEntry = async (campaignId: string, entryId: string): Promise<void> => {
    try {
      console.log(`Deleting stats entry ${entryId} from campaign ${campaignId}`);
      
      // Create a deep copy of the current campaigns
      const updatedCampaigns = JSON.parse(JSON.stringify(campaigns));
      
      // Find the campaign by ID
      const campaign = updatedCampaigns.find((c: Campaign) => c.id === campaignId);
      
      if (!campaign) {
        console.error(`Campaign ${campaignId} not found for deletion`);
        toast.error("Campaign not found");
        return;
      }
      
      // Check if the campaign has stats history
      if (!campaign.statsHistory || !Array.isArray(campaign.statsHistory)) {
        console.error(`No stats history found for campaign ${campaignId}`);
        toast.error("No stats history to delete");
        return;
      }
      
      // Find the entry to delete
      const entryIndex = campaign.statsHistory.findIndex((entry: StatHistoryEntry) => entry.id === entryId);
      
      if (entryIndex === -1) {
        console.error(`Entry ${entryId} not found in campaign ${campaignId}`);
        toast.error("Entry not found");
        return;
      }
      
      // Remove the entry
      campaign.statsHistory.splice(entryIndex, 1);
      console.log(`Deleted entry ${entryId} from campaign ${campaignId}`);
      
      // Recalculate campaign totals
      updateCampaignTotals(campaign);
      
      // Update state with the modified campaigns
      setCampaigns(updatedCampaigns);
      
      // Save to storage
      saveCampaignsToStorage(updatedCampaigns);
      
      toast.success("Entry deleted successfully");
    } catch (error) {
      console.error("Error deleting stats entry:", error);
      toast.error("Failed to delete entry");
      throw error; // Re-throw the error so the caller can handle it
    }
  };

  const updateCampaignStats = (campaignId: string, stats: CampaignStats) => {
    const updatedCampaigns = campaigns.map((campaign) =>
      campaign.id === campaignId ? { ...campaign, stats: stats } : campaign
    );
    setCampaigns(updatedCampaigns);
    saveCampaignsToStorage(updatedCampaigns);
  };

  const addAccountConnection = (accountConnection: AccountConnection) => {
    const newAccountConnection: AccountConnection = {
      ...accountConnection,
      id: uuidv4(),
    };
    setAccountConnections([...accountConnections, newAccountConnection]);
    toast.success("Account connection added successfully");
  };

  const updateAccountConnection = (id: string, updates: Partial<AccountConnection>) => {
    const updatedAccountConnections = accountConnections.map((accountConnection) =>
      accountConnection.id === id ? { ...accountConnection, ...updates } : accountConnection
    );
    setAccountConnections(updatedAccountConnections);
    localStorage.setItem("accountConnections", JSON.stringify(updatedAccountConnections));
    toast.success("Account connection updated successfully");
  };

  const deleteAccountConnection = (id: string) => {
    const updatedAccountConnections = accountConnections.filter((accountConnection) => accountConnection.id !== id);
    setAccountConnections(updatedAccountConnections);
    localStorage.setItem("accountConnections", JSON.stringify(updatedAccountConnections));
    toast.success("Account connection deleted successfully");
  };

  const syncAccountConnection = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate an API call to sync the account connection
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Update the account connection with a new lastSynced date
      const now = new Date();
      const updatedAccountConnections = accountConnections.map((accountConnection) =>
        accountConnection.id === id ? { ...accountConnection, lastSynced: now.toISOString() } : accountConnection
      );
      setAccountConnections(updatedAccountConnections);
      localStorage.setItem("accountConnections", JSON.stringify(updatedAccountConnections));
      toast.success("Account connection synced successfully");
    } catch (error) {
      console.error("Error syncing account connection:", error);
      toast.error("Failed to sync account connection");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleAdsMetrics = async (campaignId: string, startDate: string, endDate: string): Promise<GoogleAdsMetrics[]> => {
    // In a real application, this function would make an API call to Google Ads
    // For this example, we'll return some dummy data
    return new Promise((resolve) => {
      setTimeout(() => {
        const metrics: GoogleAdsMetrics[] = [
          {
            impressions: Math.floor(Math.random() * 1000),
            clicks: Math.floor(Math.random() * 100),
            ctr: Math.random() * 0.1,
            cpc: Math.random() * 2,
            cpl: Math.random() * 10,
            adSpend: Math.floor(Math.random() * 500),
            date: startDate,
          },
          {
            impressions: Math.floor(Math.random() * 1000),
            clicks: Math.floor(Math.random() * 100),
            ctr: Math.random() * 0.1,
            cpc: Math.random() * 2,
            cpl: Math.random() * 10,
            adSpend: Math.floor(Math.random() * 500),
            date: endDate,
          },
        ];
        resolve(metrics);
      }, 500);
    });
  };

  const addCaseBuyer = (caseBuyer: Omit<CaseBuyer, "id">) => {
    const newCaseBuyer: CaseBuyer = {
      ...caseBuyer,
      id: uuidv4(),
    };
    setCaseBuyers([...caseBuyers, newCaseBuyer]);
    toast.success("Case buyer added successfully");
  };

  const updateCaseBuyer = (id: string, updates: Partial<CaseBuyer>) => {
    const updatedCaseBuyers = caseBuyers.map((caseBuyer) =>
      caseBuyer.id === id ? { ...caseBuyer, ...updates } : caseBuyer
    );
    setCaseBuyers(updatedCaseBuyers);
    localStorage.setItem("caseBuyers", JSON.stringify(updatedCaseBuyers));
    toast.success("Case buyer updated successfully");
  };

  const deleteCaseBuyer = (id: string) => {
    const updatedCaseBuyers = caseBuyers.filter((caseBuyer) => caseBuyer.id !== id);
    setCaseBuyers(updatedCaseBuyers);
    localStorage.setItem("caseBuyers", JSON.stringify(updatedCaseBuyers));
    toast.success("Case buyer deleted successfully");
  };

  const addCaseAttribution = (caseAttribution: Omit<CaseAttribution, "id">) => {
    const newCaseAttribution: CaseAttribution = {
      ...caseAttribution,
      id: uuidv4(),
    };
    setCaseAttributions([...caseAttributions, newCaseAttribution]);
    toast.success("Case attribution added successfully");
  };

  const updateCaseAttribution = (id: string, updates: Partial<CaseAttribution>) => {
    const updatedCaseAttributions = caseAttributions.map((caseAttribution) =>
      caseAttribution.id === id ? { ...caseAttribution, ...updates } : caseAttribution
    );
    setCaseAttributions(updatedCaseAttributions);
    localStorage.setItem("caseAttributions", JSON.stringify(updatedCaseAttributions));
    toast.success("Case attribution updated successfully");
  };

  const deleteCaseAttribution = (id: string) => {
    const updatedCaseAttributions = caseAttributions.filter((caseAttribution) => caseAttribution.id !== id);
    setCaseAttributions(updatedCaseAttributions);
    localStorage.setItem("caseAttributions", JSON.stringify(updatedCaseAttributions));
    toast.success("Case attribution deleted successfully");
  };

  // Add the missing functions
  const fetchGoogleAdsAccounts = async (): Promise<AccountConnection[]> => {
    setIsLoading(true);
    try {
      // Simulate an API call to fetch Google Ads accounts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In a real implementation, this would call a real API
      // For now, we'll return dummy data
      const dummyAccounts: AccountConnection[] = [
        {
          id: uuidv4(),
          name: "Main Ad Account",
          platform: "google",
          isConnected: true,
          lastSynced: new Date().toISOString(),
          customerId: "123456789",
          credentials: {}
        }
      ];
      
      // Add these accounts to our state
      setAccountConnections(prev => {
        // Don't add duplicates
        const existingIds = new Set(prev.map(acc => acc.customerId));
        const newAccounts = dummyAccounts.filter(acc => !existingIds.has(acc.customerId));
        
        if (newAccounts.length === 0) {
          return prev;
        }
        
        const updated = [...prev, ...newAccounts];
        localStorage.setItem("accountConnections", JSON.stringify(updated));
        return updated;
      });
      
      return dummyAccounts;
    } catch (error) {
      console.error("Error fetching Google Ads accounts:", error);
      toast.error("Failed to fetch Google Ads accounts");
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchCampaigns = async (): Promise<Campaign[]> => {
    setIsLoading(true);
    try {
      // In a real app, this would call an API
      // For now, we'll just return the current state
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return campaigns;
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to fetch campaigns");
      return [];
    } finally {
      setIsLoading(false);
    }
  };
  
  const migrateFromLocalStorage = async (): Promise<void> => {
    try {
      // This would migrate data to a database in a real app
      // For now we'll just simulate the operation
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success("Data migration completed successfully");
    } catch (error) {
      console.error("Error migrating data:", error);
      toast.error("Failed to migrate data");
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue = {
    campaigns,
    accountConnections,
    selectedCampaignId,
    selectedCampaignIds,
    dateRange,
    caseBuyers,
    caseAttributions,
    isLoading,
    setSelectedCampaignId,
    setSelectedCampaignIds,
    setDateRange,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    addStatHistoryEntry,
    updateStatHistoryEntry,
    deleteStatHistoryEntry,
    updateCampaignStats,
    addAccountConnection,
    updateAccountConnection,
    deleteAccountConnection,
    syncAccountConnection,
    fetchGoogleAdsMetrics,
    addCaseBuyer,
    updateCaseBuyer,
    deleteCaseBuyer,
    addCaseAttribution,
    updateCaseAttribution,
    deleteCaseAttribution,
    fetchGoogleAdsAccounts,
    fetchCampaigns,
    migrateFromLocalStorage,
  };

  return (
    <CampaignContext.Provider value={contextValue}>
      {children}
    </CampaignContext.Provider>
  );
};

const useCampaign = (): CampaignContextType => {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
};

export { CampaignProvider, useCampaign };
