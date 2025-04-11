import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import {
  Campaign,
  AccountConnection,
} from "@/types/campaign";
import { googleAdsService } from "@/services/googleAdsService";

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

  useEffect(() => {
    localStorage.setItem("campaigns", JSON.stringify(campaigns));
  }, [campaigns]);

  useEffect(() => {
    localStorage.setItem("accountConnections", JSON.stringify(accountConnections));
  }, [accountConnections]);

  const addCampaign = (campaign: Omit<Campaign, "id">): string => {
    const id = uuidv4();
    const newCampaign = { id, ...campaign };
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

  const fetchGoogleAdsAccounts = async () => {
    try {
      setIsLoading(true);
      
      // Call the service to get accounts from Google Ads API
      const googleAccounts = await googleAdsService.fetchGoogleAdsAccounts();
      
      if (googleAccounts && googleAccounts.length > 0) {
        console.log("Fetched Google Ads accounts:", googleAccounts);
        
        // Process each account from the API
        const currentTime = new Date().toISOString();
        
        // Convert Google API accounts to our AccountConnection format
        const importedAccounts = googleAccounts.map(account => {
          // Create a standardized format for each account
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
        
        // Merge with existing accounts, avoiding duplicates by customerId
        const existingCustomerIds = accountConnections.map(acc => acc.customerId);
        
        // Filter to only add new accounts
        const newAccounts = importedAccounts.filter(
          acc => !existingCustomerIds.includes(acc.customerId)
        );
        
        // Update existing accounts with latest info
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
        
        // Set the combined account list
        setAccountConnections([...updatedExistingAccounts, ...newAccounts]);
        
        // Save to localStorage
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
