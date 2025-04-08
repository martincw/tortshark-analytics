
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Campaign, DateRange, AccountConnection, StatHistoryEntry } from "../types/campaign";
import { toast } from "sonner";

interface CampaignContextType {
  campaigns: Campaign[];
  accountConnections: AccountConnection[];
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  updateCampaign: (updatedCampaign: Campaign) => void;
  addCampaign: (newCampaign: Omit<Campaign, "id">) => string;
  addAccountConnection: (newAccount: Omit<AccountConnection, "id">) => string;
  deleteCampaign: (id: string) => void;
  addStatHistoryEntry: (campaignId: string, entry: Omit<StatHistoryEntry, "id" | "createdAt">) => void;
  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  isLoading: boolean;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

// Get today's date as ISO string (YYYY-MM-DD)
const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Get date 30 days ago as ISO string (YYYY-MM-DD)
const getThirtyDaysAgo = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
};

// Helper to save data to localStorage
const saveToLocalStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Helper to load data from localStorage
const loadFromLocalStorage = (key: string, defaultValue: any) => {
  try {
    const savedData = localStorage.getItem(key);
    return savedData ? JSON.parse(savedData) : defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Update existing campaigns to ensure they have the targets property and statsHistory
  const migrateExistingCampaigns = (campaigns: any[]): Campaign[] => {
    return campaigns.map(campaign => {
      const updatedCampaign = { ...campaign };
      
      if (!updatedCampaign.targets) {
        updatedCampaign.targets = {
          monthlyRetainers: 0,
          casePayoutAmount: 0,
          monthlyIncome: 0,
          monthlySpend: 0,
          targetROAS: 0,
          targetProfit: 0,
        };
      }
      
      if (!updatedCampaign.statsHistory) {
        updatedCampaign.statsHistory = [];
      }
      
      return updatedCampaign;
    });
  };

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      console.log("Loading campaigns from localStorage");
      const savedCampaigns = localStorage.getItem('campaigns');
      console.log("Raw saved campaigns:", savedCampaigns);
      
      if (savedCampaigns) {
        const parsedCampaigns = JSON.parse(savedCampaigns);
        console.log("Parsed campaigns:", parsedCampaigns);
        return migrateExistingCampaigns(parsedCampaigns);
      }
    } catch (error) {
      console.error("Error loading campaigns from localStorage:", error);
    }
    
    return [];
  });
  
  const [accountConnections, setAccountConnections] = useState<AccountConnection[]>(() => 
    loadFromLocalStorage('accountConnections', [])
  );
  
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getThirtyDaysAgo(),
    endDate: getToday()
  });
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    // Add some initial demo data if there are no campaigns
    if (campaigns.length === 0) {
      console.log("No campaigns found, adding demo campaign");
      const demoAccountId = crypto.randomUUID();
      
      // Add a demo account connection
      const demoAccount: AccountConnection = {
        id: demoAccountId,
        name: "Demo Google Account",
        platform: "google",
        isConnected: true,
        lastSynced: new Date().toISOString()
      };
      
      setAccountConnections(prev => {
        if (prev.length === 0) {
          saveToLocalStorage('accountConnections', [demoAccount]);
          return [demoAccount];
        }
        return prev;
      });
      
      // Add demo campaigns
      const demoCampaigns: Campaign[] = [
        {
          id: crypto.randomUUID(),
          name: "Rideshare",
          platform: "google",
          accountId: demoAccountId,
          accountName: "Demo Google Account",
          stats: {
            adSpend: 5000,
            impressions: 50000,
            clicks: 1000,
            cpc: 5,
            date: new Date().toISOString()
          },
          manualStats: {
            leads: 80,
            cases: 15,
            retainers: 10,
            revenue: 25000,
            date: new Date().toISOString()
          },
          statsHistory: [],
          targets: {
            monthlyRetainers: 20,
            casePayoutAmount: 2500,
            monthlyIncome: 30000,
            monthlySpend: 10000,
            targetROAS: 300,
            targetProfit: 20000
          }
        },
        {
          id: crypto.randomUUID(),
          name: "LDS",
          platform: "google",
          accountId: demoAccountId,
          accountName: "Demo Google Account",
          stats: {
            adSpend: 3500,
            impressions: 40000,
            clicks: 800,
            cpc: 4.38,
            date: new Date().toISOString()
          },
          manualStats: {
            leads: 60,
            cases: 12,
            retainers: 8,
            revenue: 18000,
            date: new Date().toISOString()
          },
          statsHistory: [],
          targets: {
            monthlyRetainers: 15,
            casePayoutAmount: 2000,
            monthlyIncome: 22000,
            monthlySpend: 8000,
            targetROAS: 275,
            targetProfit: 14000
          }
        }
      ];
      
      setCampaigns(demoCampaigns);
      saveToLocalStorage('campaigns', demoCampaigns);
      console.log("Demo campaigns added:", demoCampaigns);
    }
    
    // Set loading to false after initialization
    setIsLoading(false);
  }, []);

  // Save campaigns to localStorage whenever they change
  useEffect(() => {
    console.log("Saving campaigns to localStorage:", campaigns);
    saveToLocalStorage('campaigns', campaigns);
  }, [campaigns]);

  // Save account connections to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage('accountConnections', accountConnections);
  }, [accountConnections]);

  const updateCampaign = (updatedCampaign: Campaign) => {
    console.log("Updating campaign:", updatedCampaign);
    setCampaigns(prevCampaigns => 
      prevCampaigns.map(campaign => 
        campaign.id === updatedCampaign.id ? updatedCampaign : campaign
      )
    );
    toast.success("Campaign updated successfully");
  };

  const addCampaign = (newCampaign: Omit<Campaign, "id">): string => {
    const id = crypto.randomUUID();
    
    // Ensure statsHistory is initialized
    const campaign: Campaign = {
      ...newCampaign,
      id,
      statsHistory: newCampaign.statsHistory || []
    };
    
    console.log("Adding new campaign:", campaign);
    setCampaigns(prev => [...prev, campaign]);
    console.log("Campaign added successfully:", campaign);
    return id;
  };

  const addStatHistoryEntry = (campaignId: string, entry: Omit<StatHistoryEntry, "id" | "createdAt">) => {
    console.log("Adding stat history entry:", { campaignId, entry });
    
    setCampaigns(prev => {
      const updatedCampaigns = prev.map(campaign => {
        if (campaign.id === campaignId) {
          // Create new entry with ID and createdAt
          const newEntry: StatHistoryEntry = {
            ...entry,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
          };
          
          console.log("Created new entry:", newEntry);
          
          // Get the stats history (ensure it exists)
          const statsHistory = Array.isArray(campaign.statsHistory) 
            ? campaign.statsHistory 
            : [];
          
          // Update campaign stats
          const updatedCampaign = {
            ...campaign,
            manualStats: {
              ...campaign.manualStats,
              leads: campaign.manualStats.leads + entry.leads,
              cases: campaign.manualStats.cases + entry.cases,
              retainers: campaign.manualStats.retainers + entry.retainers,
              revenue: campaign.manualStats.revenue + entry.revenue,
              date: new Date().toISOString(), // Update the date to today
            },
            statsHistory: [newEntry, ...statsHistory]
          };
          
          console.log("Updated campaign:", updatedCampaign);
          return updatedCampaign;
        }
        return campaign;
      });
      
      console.log("Updated campaigns state:", updatedCampaigns);
      toast.success("Stats updated successfully");
      return updatedCampaigns;
    });
  };

  const addAccountConnection = (newAccount: Omit<AccountConnection, "id">): string => {
    // Generate a unique ID
    const id = crypto.randomUUID();
    
    // Create the account with the generated ID
    const account: AccountConnection = {
      ...newAccount,
      id
    };
    
    // Check if this account already exists (based on name or other criteria)
    const isDuplicate = accountConnections.some(
      existing => existing.name === account.name && existing.platform === account.platform
    );
    
    if (!isDuplicate) {
      setAccountConnections(prev => [...prev, account]);
      console.log("Account added successfully:", account);
    } else {
      console.log("Skipped adding duplicate account:", account);
    }
    
    return id;
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter(campaign => campaign.id !== id));
    if (selectedCampaignId === id) {
      setSelectedCampaignId(null);
    }
  };

  return (
    <CampaignContext.Provider value={{
      campaigns,
      accountConnections,
      dateRange,
      setDateRange,
      updateCampaign,
      addCampaign,
      addAccountConnection,
      addStatHistoryEntry,
      deleteCampaign,
      selectedCampaignId,
      setSelectedCampaignId,
      isLoading
    }}>
      {children}
    </CampaignContext.Provider>
  );
};

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
};
