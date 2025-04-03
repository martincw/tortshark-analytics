
import React from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { AccountsOverview } from "@/components/dashboard/AccountsOverview";

const Index = () => {
  return (
    <div className="space-y-6">
      <DashboardHeader />
      <OverviewStats />
      
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
