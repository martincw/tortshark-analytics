
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Campaign, DateRange, AccountConnection } from "../types/campaign";
import { 
  fetchGoogleAdsAccounts, 
  fetchCampaigns, 
  getStoredAuthTokens,
  syncAccountData
} from "../services/googleAdsService";

interface CampaignContextType {
  campaigns: Campaign[];
  accountConnections: AccountConnection[];
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  updateCampaign: (updatedCampaign: Campaign) => void;
  addCampaign: (newCampaign: Omit<Campaign, "id">) => void;
  addAccountConnection: (newAccount: Omit<AccountConnection, "id">) => void;
  deleteCampaign: (id: string) => void;
  selectedCampaignId: string | null;
  setSelectedCampaignId: (id: string | null) => void;
  isLoading: boolean;
  syncAccount: (accountId: string) => Promise<boolean>;
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

export const CampaignProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accountConnections, setAccountConnections] = useState<AccountConnection[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getThirtyDaysAgo(),
    endDate: getToday()
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load accounts when the component mounts
  useEffect(() => {
    const loadAccounts = async () => {
      const tokens = getStoredAuthTokens();
      
      if (tokens?.access_token) {
        setIsLoading(true);
        try {
          const accounts = await fetchGoogleAdsAccounts(tokens.access_token);
          setAccountConnections(accounts);
        } catch (error) {
          console.error("Failed to load accounts:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadAccounts();
  }, []);

  // Load campaigns when accounts or date range changes
  useEffect(() => {
    const loadCampaigns = async () => {
      const tokens = getStoredAuthTokens();
      
      if (tokens?.access_token && accountConnections.length > 0) {
        setIsLoading(true);
        
        try {
          let allCampaigns: Campaign[] = [];
          
          for (const account of accountConnections) {
            if (account.isConnected) {
              const accountCampaigns = await fetchCampaigns(
                account.id,
                tokens.access_token,
                dateRange
              );
              
              allCampaigns = [...allCampaigns, ...accountCampaigns];
            }
          }
          
          setCampaigns(allCampaigns);
        } catch (error) {
          console.error("Failed to load campaigns:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadCampaigns();
  }, [accountConnections, dateRange]);

  const updateCampaign = (updatedCampaign: Campaign) => {
    setCampaigns(campaigns.map(campaign => 
      campaign.id === updatedCampaign.id ? updatedCampaign : campaign
    ));
  };

  const addCampaign = (newCampaign: Omit<Campaign, "id">) => {
    const campaign: Campaign = {
      ...newCampaign,
      id: crypto.randomUUID()
    };
    setCampaigns([...campaigns, campaign]);
  };

  const addAccountConnection = (newAccount: Omit<AccountConnection, "id">) => {
    const account: AccountConnection = {
      ...newAccount,
      id: crypto.randomUUID()
    };
    setAccountConnections([...accountConnections, account]);
  };

  const deleteCampaign = (id: string) => {
    setCampaigns(campaigns.filter(campaign => campaign.id !== id));
    if (selectedCampaignId === id) {
      setSelectedCampaignId(null);
    }
  };

  const syncAccount = async (accountId: string): Promise<boolean> => {
    const tokens = getStoredAuthTokens();
    
    if (!tokens?.access_token) {
      return false;
    }
    
    setIsLoading(true);
    try {
      const success = await syncAccountData(accountId, tokens.access_token);
      
      if (success) {
        // Update last synced date for this account
        setAccountConnections(accountConnections.map(account => {
          if (account.id === accountId) {
            return {
              ...account,
              lastSynced: new Date().toISOString()
            };
          }
          return account;
        }));
      }
      
      return success;
    } catch (error) {
      console.error("Failed to sync account:", error);
      return false;
    } finally {
      setIsLoading(false);
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
      isLoading,
      syncAccount
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
