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
    console.log(`Saving ${key} to localStorage:`, data);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

// Helper to load data from localStorage
const loadFromLocalStorage = (key: string, defaultValue: any) => {
  try {
    const savedData = localStorage.getItem(key);
    console.log(`Loading ${key} from localStorage. Raw data:`, savedData);
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      console.log(`Parsed ${key} data:`, parsedData);
      return parsedData;
    }
    
    console.log(`No ${key} found in localStorage, using default value:`, defaultValue);
    return defaultValue;
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Update existing campaigns to ensure they have the targets property and statsHistory
  const migrateExistingCampaigns = (campaigns: any[]): Campaign[] => {
    if (!Array.isArray(campaigns)) {
      console.error("Expected campaigns to be an array, but got:", campaigns);
      return [];
    }
    
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
        try {
          const parsedCampaigns = JSON.parse(savedCampaigns);
          console.log("Parsed campaigns:", parsedCampaigns);
          
          // Check if parsedCampaigns is an array
          if (Array.isArray(parsedCampaigns)) {
            return migrateExistingCampaigns(parsedCampaigns);
          } else {
            console.error("Parsed campaigns is not an array:", parsedCampaigns);
            return [];
          }
        } catch (parseError) {
          console.error("Error parsing campaigns JSON:", parseError);
          return [];
        }
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

  // Save campaigns to localStorage whenever they change
  useEffect(() => {
    if (campaigns.length > 0) {
      console.log("Saving campaigns to localStorage:", campaigns);
      saveToLocalStorage('campaigns', campaigns);
    }
  }, [campaigns]);

  // Save account connections to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage('accountConnections', accountConnections);
  }, [accountConnections]);

  // Set loading to false after initialization
  useEffect(() => {
    setIsLoading(false);
  }, []);

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
    
    // Save to localStorage immediately
    setTimeout(() => {
      const updatedCampaigns = [...campaigns, campaign];
      saveToLocalStorage('campaigns', updatedCampaigns);
      console.log("Updated campaigns saved to localStorage:", updatedCampaigns);
    }, 0);
    
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
