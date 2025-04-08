
import React from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { useCampaignGridData } from "@/hooks/useCampaignGridData";
import { CampaignFilters } from "./CampaignFilters";
import { CampaignList } from "./CampaignList";

export function CampaignGrid() {
  const { campaigns, isLoading } = useCampaign();
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
