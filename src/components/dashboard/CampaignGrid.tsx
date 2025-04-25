
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { useEffect } from "react";
import { CampaignCard } from "./CampaignCard";
import { useCampaignGridData } from "@/hooks/useCampaignGridData";
import { Card } from "@/components/ui/card";

interface CampaignGridProps {
  filteredCampaigns: Campaign[];
}

export function CampaignGrid({ filteredCampaigns }: CampaignGridProps) {
  const { dateRange } = useCampaign();
  const { filteredAndSortedCampaigns, sortField, setSortField, sortDirection, setSortDirection } = 
    useCampaignGridData(filteredCampaigns, dateRange);

  useEffect(() => {
    console.log(`CampaignGrid received ${filteredCampaigns.length} campaigns`);
  }, [filteredCampaigns.length]);

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
        {filteredAndSortedCampaigns.map((campaign) => (
          <CampaignCard 
            key={campaign.id} 
            campaign={campaign} 
            dateRange={dateRange}
          />
        ))}
      </div>
    </div>
  );
}
