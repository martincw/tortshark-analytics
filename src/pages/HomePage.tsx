
import React from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { CampaignGrid } from '@/components/dashboard/CampaignGrid';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

const HomePage: React.FC = () => {
  const { campaigns, loading } = useCampaigns();

  return (
    <div className="container mx-auto px-4 py-6">
      <DashboardHeader />
      <div className="mt-6">
        <CampaignGrid filteredCampaigns={campaigns} />
      </div>
    </div>
  );
};

export default HomePage;
