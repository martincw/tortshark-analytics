
import { useState, useMemo, useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Campaign } from "@/types/campaign";
import { toast } from "sonner";

export type StatsField = 'leads' | 'cases' | 'revenue' | 'adSpend';
export type AdsStatsField = 'adSpend' | 'impressions' | 'clicks' | 'cpc';

export function useBulkStatsData() {
  const { campaigns, fetchCampaigns } = useCampaign();
  const { currentWorkspace } = useWorkspace();
  const [activeField, setActiveField] = useState<StatsField>('leads');
  const [activeAdsField, setActiveAdsField] = useState<AdsStatsField>('adSpend');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // Deduplicate campaigns by name to prevent duplicates in the list
  const uniqueCampaigns = useMemo(() => {
    const uniqueMap = new Map<string, Campaign>();
    
    // Keep only one campaign per name
    campaigns.forEach(campaign => {
      if (!uniqueMap.has(campaign.name)) {
        uniqueMap.set(campaign.name, campaign);
      }
    });
    
    return Array.from(uniqueMap.values());
  }, [campaigns]);
  
  // Effect to refresh campaigns data after bulk updates
  useEffect(() => {
    if (lastUpdate) {
      const refreshTimer = setTimeout(() => {
        console.log("Refreshing campaigns data after bulk update");
        fetchCampaigns().then(() => {
          toast.success("Campaign data refreshed");
        }).catch(error => {
          console.error("Error refreshing campaigns:", error);
        });
      }, 1000); // Small delay to allow database to update
      
      return () => clearTimeout(refreshTimer);
    }
  }, [lastUpdate, fetchCampaigns]);
  
  // Function to trigger a refresh after bulk updates
  const refreshAfterBulkUpdate = () => {
    setLastUpdate(new Date());
  };
  
  return {
    uniqueCampaigns,
    activeField,
    setActiveField,
    activeAdsField,
    setActiveAdsField,
    refreshAfterBulkUpdate,
    currentWorkspace
  };
}
