
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useCampaign } from "@/contexts/CampaignContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import DashboardFinancialStats from "@/components/dashboard/DashboardFinancialStats";
import { DailyAveragesSection } from "@/components/dashboard/DailyAveragesSection";
import { CampaignLeaderboard } from "@/components/dashboard/CampaignLeaderboard";

const Index = () => {
  const { dateRange, selectedCampaignIds, campaigns } = useCampaign();
  
  // Filter campaigns by selected IDs if any are selected
  const filteredCampaigns = selectedCampaignIds.length > 0
    ? campaigns.filter(campaign => selectedCampaignIds.includes(campaign.id))
    : campaigns;
  
  return (
    <div className="space-y-6">
      <DashboardHeader />
      
      {/* Campaign Leaderboard - Full Width */}
      <CampaignLeaderboard filteredCampaigns={filteredCampaigns} />
      
      {/* Financial Stats and Daily Averages - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardFinancialStats />
        <DailyAveragesSection filteredCampaigns={filteredCampaigns} />
      </div>

      {/* Campaign Grid */}
      <CampaignGrid filteredCampaigns={filteredCampaigns} />
    </div>
  );
};

export default Index;
