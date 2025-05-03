
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Campaign } from "@/types/campaign";
import { calculateMetrics } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { useNavigate } from "react-router-dom";

import { CampaignCardHeader } from "./CampaignCardHeader";
import { MetricsOverview } from "./MetricsOverview";
import { CampaignCardActions } from "./CampaignCardActions";
import { QuickStatsDialog } from "./QuickStatsDialog";
import { useQuickStats } from "./useQuickStats";

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const { setSelectedCampaignId } = useCampaign();
  const navigate = useNavigate();
  const metrics = calculateMetrics(campaign);
  
  const {
    isQuickEntryOpen,
    openQuickEntry,
    closeQuickEntry,
    handleQuickStatsSubmit
  } = useQuickStats(campaign.id);
  
  const handleViewDetails = () => {
    console.log("Navigating to campaign details for campaign ID:", campaign.id);
    setSelectedCampaignId(campaign.id);
    navigate(`/campaign/${campaign.id}`);
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow border border-border/80 group">
        <CampaignCardHeader 
          name={campaign.name} 
          date={campaign.stats.date}
          platform="Google Ads"
        />
        
        <CardContent className="pb-0">
          <MetricsOverview 
            metrics={metrics}
            campaignStats={campaign.stats}
            manualStats={campaign.manualStats}
            targetProfit={campaign.targets.targetProfit}
          />
        </CardContent>
        
        <CampaignCardActions 
          onViewDetails={handleViewDetails}
          onAddStats={openQuickEntry}
        />
      </Card>
      
      <QuickStatsDialog
        isOpen={isQuickEntryOpen}
        onClose={closeQuickEntry}
        campaignName={campaign.name}
        onSubmit={handleQuickStatsSubmit}
      />
    </>
  );
}
