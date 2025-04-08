
import React from "react";
import { Campaign } from "@/types/campaign";
import { CampaignCard } from "./CampaignCard";
import { Button } from "@/components/ui/button";

interface CampaignListProps {
  campaigns: Campaign[];
  onClearFilters: () => void;
}

export function CampaignList({ campaigns, onClearFilters }: CampaignListProps) {
  console.log("CampaignList - Rendering campaigns:", campaigns.map(c => ({id: c.id, name: c.name})));
  
  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-lg font-medium text-muted-foreground">No campaigns found</p>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
        <Button 
          variant="outline" 
          onClick={onClearFilters}
          className="mt-4"
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
