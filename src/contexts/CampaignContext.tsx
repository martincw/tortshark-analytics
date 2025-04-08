
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Campaign, DateRange, AccountConnection } from "../types/campaign";
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
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => 
    loadFromLocalStorage('campaigns', [])
  );
  
  const [accountConnections, setAccountConnections] = useState<AccountConnection[]>(() => 
    loadFromLocalStorage('accountConnections', [])
  );
  
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getThirtyDaysAgo(),
    endDate: getToday()
  });
  
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Save campaigns to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage('campaigns', campaigns);
  }, [campaigns]);

  // Save account connections to localStorage whenever they change
  useEffect(() => {
    saveToLocalStorage('accountConnections', accountConnections);
  }, [accountConnections]);

  const updateCampaign = (updatedCampaign: Campaign) => {
    setCampaigns(campaigns.map(campaign => 
      campaign.id === updatedCampaign.id ? updatedCampaign : campaign
    ));
  };

  const addCampaign = (newCampaign: Omit<Campaign, "id">): string => {
    const id = crypto.randomUUID();
    const campaign: Campaign = {
      ...newCampaign,
      id
    };
    
    setCampaigns(prev => [...prev, campaign]);
    console.log("Campaign added successfully:", campaign);
    return id;
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
