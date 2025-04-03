
import React from "react";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CampaignsPage = () => {
  const navigate = useNavigate();

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
      
      <CampaignGrid />
    </div>
  );
};

export default CampaignsPage;
