
import React from 'react';
import { useCampaign } from '@/contexts/CampaignContext';
import { CampaignList } from '@/components/dashboard/CampaignList';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

const DashboardPage: React.FC = () => {
  const { campaigns } = useCampaign();

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
