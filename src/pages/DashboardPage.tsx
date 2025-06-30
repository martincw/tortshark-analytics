
import React from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { CampaignList } from '@/components/dashboard/CampaignList';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

const DashboardPage: React.FC = () => {
  const { campaigns, loading } = useCampaigns();

  const handleClearFilters = () => {
    // Clear filters functionality
    console.log('Clear filters');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <DashboardHeader />
      <div className="mt-6">
        <CampaignList campaigns={campaigns} onClearFilters={handleClearFilters} />
      </div>
    </div>
  );
};

export default DashboardPage;
