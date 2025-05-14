
import React, { useState, useEffect } from "react";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { AddStatsDialog } from "@/components/dashboard/AddStatsDialog";
import { CampaignProvider, useCampaign } from "@/contexts/CampaignContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignCardSkeleton } from "@/components/dashboard/campaign-card/CampaignCardSkeleton";
import { AlertCircle } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";

const IndexPageContent = () => {
  const { campaigns, isLoading, error, selectedCampaignIds } = useCampaign();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredCampaigns = campaigns
    ? campaigns.filter((campaign) => selectedCampaignIds.includes(campaign.id))
    : [];

  // Fix the error message display
  return (
    <div className="container mx-auto py-6">
      <DashboardHeader />
      
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
          {Array(8).fill(0).map((_, i) => (
            <CampaignCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="h-12 w-12 text-error-DEFAULT mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Error loading campaigns</h2>
          <p className="text-error-DEFAULT">{error.message}</p>
        </div>
      ) : filteredCampaigns.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6">
          {filteredCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <EmptyState open={isDialogOpen} setOpen={setIsDialogOpen} />
      )}

      <AddStatsDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <CampaignProvider>
        <IndexPageContent />
      </CampaignProvider>
    </AuthProvider>
  );
};

export default Index;
