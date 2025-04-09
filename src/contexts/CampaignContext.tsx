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
  updateStatHistoryEntry: (campaignId: string, updatedEntry: StatHistoryEntry) => void;
  deleteStatHistoryEntry: (campaignId: string, entryId: string) => void;
  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  isLoading: boolean;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getThirtyDaysAgo = (): string => {
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().split('T')[0];
};

const saveToLocalStorage = (key: string, data: any) => {
  try {
    console.log(`Saving ${key} to localStorage:`, data);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error);
  }
};

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

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  useEffect(() => {
    if (campaigns.length > 0) {
      console.log("Saving campaigns to localStorage:", campaigns);
      saveToLocalStorage('campaigns', campaigns);
    }
  }, [campaigns]);

  useEffect(() => {
    saveToLocalStorage('accountConnections', accountConnections);
  }, [accountConnections]);

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
    
    const campaign: Campaign = {
      ...newCampaign,
      id,
      statsHistory: newCampaign.statsHistory || []
    };
    
    console.log("Adding new campaign:", campaign);
    setCampaigns(prev => [...prev, campaign]);
    console.log("Campaign added successfully:", campaign);
    
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
          const newEntry: StatHistoryEntry = {
            ...entry,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
          };
          
          console.log("Created new entry:", newEntry);
          
          const statsHistory = Array.isArray(campaign.statsHistory) 
            ? campaign.statsHistory 
            : [];
          
          const updatedCampaign = {
            ...campaign,
            manualStats: {
              ...campaign.manualStats,
              leads: campaign.manualStats.leads + entry.leads,
              cases: campaign.manualStats.cases + entry.cases,
              revenue: campaign.manualStats.revenue + entry.revenue,
              date: new Date().toISOString(),
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

  const updateStatHistoryEntry = (campaignId: string, updatedEntry: StatHistoryEntry) => {
    console.log("Updating stat history entry:", { campaignId, updatedEntry });
    
    setCampaigns(prev => {
      const updatedCampaigns = prev.map(campaign => {
        if (campaign.id === campaignId) {
          const oldEntry = campaign.statsHistory.find(entry => entry.id === updatedEntry.id);
          
          if (!oldEntry) {
            console.error("Entry not found:", updatedEntry.id);
            return campaign;
          }
          
          const leadsDiff = updatedEntry.leads - oldEntry.leads;
          const casesDiff = updatedEntry.cases - oldEntry.cases;
          const revenueDiff = updatedEntry.revenue - oldEntry.revenue;
          
          const statsHistory = campaign.statsHistory.map(entry => 
            entry.id === updatedEntry.id ? updatedEntry : entry
          );
          
          const updatedCampaign = {
            ...campaign,
            manualStats: {
              ...campaign.manualStats,
              leads: campaign.manualStats.leads + leadsDiff,
              cases: campaign.manualStats.cases + casesDiff,
              revenue: campaign.manualStats.revenue + revenueDiff,
            },
            statsHistory
          };
          
          console.log("Updated campaign after entry edit:", updatedCampaign);
          return updatedCampaign;
        }
        return campaign;
      });
      
      toast.success("Stat history entry updated successfully");
      return updatedCampaigns;
    });
  };

  const deleteStatHistoryEntry = (campaignId: string, entryId: string) => {
    console.log("Deleting stat history entry:", { campaignId, entryId });
    
    setCampaigns(prev => {
      const updatedCampaigns = prev.map(campaign => {
        if (campaign.id === campaignId) {
          const entryToDelete = campaign.statsHistory.find(entry => entry.id === entryId);
          
          if (!entryToDelete) {
            console.error("Entry not found:", entryId);
            return campaign;
          }
          
          const updatedCampaign = {
            ...campaign,
            manualStats: {
              ...campaign.manualStats,
              leads: campaign.manualStats.leads - entryToDelete.leads,
              cases: campaign.manualStats.cases - entryToDelete.cases,
              revenue: campaign.manualStats.revenue - entryToDelete.revenue,
            },
            statsHistory: campaign.statsHistory.filter(entry => entry.id !== entryId)
          };
          
          console.log("Updated campaign after entry deletion:", updatedCampaign);
          return updatedCampaign;
        }
        return campaign;
      });
      
      toast.success("Stat history entry deleted successfully");
      return updatedCampaigns;
    });
  };

  const addAccountConnection = (newAccount: Omit<AccountConnection, "id">): string => {
    const id = crypto.randomUUID();
    
    const account: AccountConnection = {
      ...newAccount,
      id
    };
    
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
      updateStatHistoryEntry,
      deleteStatHistoryEntry,
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
