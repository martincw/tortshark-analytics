
import React from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { AccountsOverview } from "@/components/dashboard/AccountsOverview";
import { CampaignLeaderboard } from "@/components/dashboard/CampaignLeaderboard";
import { useCampaign } from "@/contexts/CampaignContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

const Index = () => {
  const { campaigns, selectedCampaignIds } = useCampaign();
  
  const showSelectionAlert = selectedCampaignIds.length > 0 && selectedCampaignIds.length < campaigns.length;

  return (
    <div className="space-y-6">
      <DashboardHeader />
      
      {showSelectionAlert && (
        <Alert variant="default" className="bg-muted/50 border-muted">
          <InfoIcon className="h-4 w-4 mr-2" />
          <AlertDescription>
            Showing metrics for {selectedCampaignIds.length} selected campaign{selectedCampaignIds.length > 1 ? 's' : ''}. 
            Use the Campaigns filter to adjust selection.
          </AlertDescription>
        </Alert>
      )}
      
      <OverviewStats />
      
      {campaigns.length > 0 && (
        <CampaignLeaderboard />
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CampaignGrid />
        </div>
        <div>
          <AccountsOverview />
        </div>
      </div>
    </div>
  );
};

export default Index;
