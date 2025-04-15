import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { Campaign, DateRange } from "@/types/campaign";
import { v4 as uuidv4 } from 'uuid';

export interface CampaignContextType {
  campaigns: Campaign[];
  setCampaigns: (campaigns: Campaign[]) => void;
  isLoading: boolean;
  selectedCampaignIds: string[];
  setSelectedCampaignIds: (ids: string[]) => void;
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange) => void;
}

const CampaignContext = createContext<CampaignContextType>({
  campaigns: [],
  setCampaigns: () => {},
  isLoading: true,
  selectedCampaignIds: [],
  setSelectedCampaignIds: () => {},
  dateRange: { startDate: "", endDate: "" },
  setDateRange: () => {},
});

export const CampaignProvider = ({ children }: { children: React.ReactNode }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({ 
    startDate: "", 
    endDate: "" 
  });

  // Load campaigns from local storage on mount
  useEffect(() => {
    const storedCampaigns = localStorage.getItem('campaigns');
    if (storedCampaigns) {
      setCampaigns(JSON.parse(storedCampaigns));
    }
    setIsLoading(false);
  }, []);

  // Save campaigns to local storage whenever they change
  useEffect(() => {
    localStorage.setItem('campaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  // Function to add a new campaign
  const addCampaign = useCallback((newCampaign: Omit<Campaign, 'id'>) => {
    const campaignWithId: Campaign = { ...newCampaign, id: uuidv4() };
    setCampaigns(prevCampaigns => [...prevCampaigns, campaignWithId]);
  }, []);

  // Function to update an existing campaign
  const updateCampaign = useCallback((updatedCampaign: Campaign) => {
    setCampaigns(prevCampaigns =>
      prevCampaigns.map(campaign =>
        campaign.id === updatedCampaign.id ? updatedCampaign : campaign
      )
    );
  }, []);

  // Function to delete a campaign
  const deleteCampaign = useCallback((campaignId: string) => {
    setCampaigns(prevCampaigns =>
      prevCampaigns.filter(campaign => campaign.id !== campaignId)
    );
  }, []);

  const value = {
    campaigns,
    setCampaigns,
    isLoading,
    selectedCampaignIds,
    setSelectedCampaignIds,
    dateRange,
    setDateRange,
  };

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
};

export const useCampaign = () => useContext(CampaignContext);
