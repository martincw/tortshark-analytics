
import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { Campaign, DateRange, AccountConnection } from "../types/campaign";
import { mockCampaigns, mockAccountConnections } from "../data/mockData";

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
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [accountConnections, setAccountConnections] = useState<AccountConnection[]>(mockAccountConnections);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getThirtyDaysAgo(),
    endDate: getToday()
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

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
      setSelectedCampaignId
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
