import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { DateRange } from "@/types/common";
import { Campaign } from "@/types/campaign-base";
import { ExternalPlatformConnection } from "@/types/common";

// Define our context state
interface CampaignContextState {
  campaigns: Campaign[] | null;
  isLoading: boolean;
  error: Error | null;
  dateRange: DateRange;
  accountConnections: ExternalPlatformConnection[];
  setDateRange: (dateRange: DateRange) => void;
  fetchCampaigns: () => Promise<void>;
  fetchGoogleAdsAccounts: () => Promise<void>;
  addAccountConnection: (connection: ExternalPlatformConnection) => void;
}

// Create the context
const CampaignContext = createContext<CampaignContextState | null>(null);

// Define provider props
interface CampaignProviderProps {
  children: ReactNode;
}

// Create the provider component
export const CampaignProvider: React.FC<CampaignProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [accountConnections, setAccountConnections] = useState<ExternalPlatformConnection[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const fetchCampaigns = async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      console.info("Fetching campaigns for user:", user.id);
      
      // Fetch campaigns from Supabase
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      
      console.info("Successfully fetched", data?.length, "campaigns");
      setCampaigns(data as Campaign[]);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
      setError(err instanceof Error ? err : new Error('Failed to fetch campaigns'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGoogleAdsAccounts = async () => {
    // Placeholder for Google Ads accounts - currently removed
    return Promise.resolve();
  };

  // Add account connection
  const addAccountConnection = (connection: ExternalPlatformConnection) => {
    setAccountConnections(prev => {
      // Check if the connection already exists
      const exists = prev.some(conn => conn.id === connection.id);
      
      if (!exists) {
        return [...prev, connection];
      } else {
        // Update the existing connection
        return prev.map(conn => 
          conn.id === connection.id ? { ...conn, ...connection } : conn
        );
      }
    });
  };

  // Fetch campaigns when user changes or on first load
  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user]);

  // Prepare the context value
  const contextValue: CampaignContextState = {
    campaigns,
    isLoading,
    error,
    dateRange,
    accountConnections,
    setDateRange,
    fetchCampaigns,
    fetchGoogleAdsAccounts,
    addAccountConnection,
  };

  return (
    <CampaignContext.Provider value={contextValue}>
      {children}
    </CampaignContext.Provider>
  );
};

// Create a hook to use the campaign context
export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error("useCampaign must be used within a CampaignProvider");
  }
  return context;
};
