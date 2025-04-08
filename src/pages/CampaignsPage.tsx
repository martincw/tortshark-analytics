
import React, { useEffect } from "react";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { Button } from "@/components/ui/button";
import { Plus, Link } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";

const CampaignsPage = () => {
  const navigate = useNavigate();
  const { campaigns, accountConnections, isLoading } = useCampaign();
  
  useEffect(() => {
    console.log("CampaignsPage - Mounted with campaigns:", campaigns.length);
  }, [campaigns]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mass Tort Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your Rideshare, LDS, MD, and Wildfire tort campaigns
          </p>
        </div>
        <Button onClick={() => navigate("/add-campaign")}>
          <Plus className="mr-2 h-4 w-4" /> Add Campaign
        </Button>
      </div>
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-lg font-medium">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
          <p className="text-muted-foreground mb-6">
            Create your first campaign to get started
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/add-campaign")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Campaign
            </Button>
            <Button onClick={() => navigate("/accounts")} variant="outline">
              <Link className="mr-2 h-4 w-4" />
              Manage Ad Accounts
            </Button>
          </div>
        </div>
      ) : (
        <CampaignGrid />
      )}
    </div>
  );
};

export default CampaignsPage;
