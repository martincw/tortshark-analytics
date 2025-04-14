
import React, { useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { useCampaignGridData } from "@/hooks/useCampaignGridData";
import { CampaignFilters } from "./CampaignFilters";
import { CampaignList } from "./CampaignList";

export function CampaignGrid() {
  const { campaigns, isLoading } = useCampaign();
  
  console.log("CampaignGrid - Campaigns count:", campaigns.length);
  console.log("CampaignGrid - Campaigns details:", campaigns);
  
  const {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filterCampaign,
    setFilterCampaign,
    campaignTypes,
    sortedAndFilteredCampaigns
  } = useCampaignGridData(campaigns);
  
  useEffect(() => {
    // Check localStorage directly on component mount
    const storedCampaigns = localStorage.getItem("campaigns");
    console.log("CampaignGrid - Raw localStorage campaigns:", storedCampaigns);
    if (storedCampaigns) {
      try {
        const parsed = JSON.parse(storedCampaigns);
        console.log("CampaignGrid - Parsed localStorage campaigns:", parsed);
      } catch (e) {
        console.error("CampaignGrid - Error parsing localStorage campaigns:", e);
      }
    }
  }, []);
  
  console.log("CampaignGrid - Filtered campaigns count:", sortedAndFilteredCampaigns.length);
  console.log("CampaignGrid - Filtered campaign details:", sortedAndFilteredCampaigns);
  
  const clearFilters = () => {
    setSearchTerm("");
    setFilterCampaign("all");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CampaignFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filterCampaign={filterCampaign}
        setFilterCampaign={setFilterCampaign}
        campaignTypes={campaignTypes}
      />
      
      <CampaignList 
        campaigns={sortedAndFilteredCampaigns} 
        onClearFilters={clearFilters} 
      />
    </div>
  );
}
