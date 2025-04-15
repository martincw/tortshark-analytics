import { useState, useMemo } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Campaign } from "@/types/campaign";

export function useBulkStatsData() {
  const { campaigns } = useCampaign();
  
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
  
  return {
    uniqueCampaigns
  };
}
