
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useCampaign } from "@/contexts/CampaignContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import DashboardFinancialStats from "@/components/dashboard/DashboardFinancialStats"; // Changed to default import
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
      
      {/* Dashboard Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewStats filteredCampaigns={filteredCampaigns} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-2 space-y-6">
          <DashboardFinancialStats />
          <DailyAveragesSection filteredCampaigns={filteredCampaigns} />
        </div>
        <div className="space-y-6">
          <CampaignLeaderboard filteredCampaigns={filteredCampaigns} />
        </div>
      </div>

      <CampaignGrid filteredCampaigns={filteredCampaigns} />
    </div>
  );
};

export default Index;
