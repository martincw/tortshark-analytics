
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useCampaignGridData } from "@/hooks/useCampaignGridData";
import { CampaignCard } from "./campaign-card/CampaignCard";
import { CampaignCardSkeleton } from "./campaign-card/CampaignCardSkeleton";

interface CampaignGridProps {
  filteredCampaigns: Campaign[];
}

export function CampaignGrid({ filteredCampaigns }: CampaignGridProps) {
  const { dateRange, isLoading } = useCampaign();
  const { sortedAndFilteredCampaigns } = useCampaignGridData(filteredCampaigns);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <CampaignCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  if (filteredCampaigns.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        No campaigns found. Please add a campaign or adjust your filters.
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedAndFilteredCampaigns.map((campaign) => (
          <CampaignCard 
            key={campaign.id} 
            campaign={campaign}
          />
        ))}
      </div>
    </div>
  );
}
