
import { useCampaign } from "@/contexts/CampaignContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import DashboardFinancialStats from "@/components/dashboard/DashboardFinancialStats";
import { DailyAveragesSection } from "@/components/dashboard/DailyAveragesSection";
import { CampaignLeaderboard } from "@/components/dashboard/CampaignLeaderboard";
import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";

const Index = () => {
  const { dateRange, selectedCampaignIds, campaigns } = useCampaign();
  
  // Filter campaigns by selected IDs if any are selected
  const filteredCampaigns = selectedCampaignIds.length > 0
    ? campaigns.filter(campaign => selectedCampaignIds.includes(campaign.id))
    : campaigns;
  
  // Log when date range or filtered campaigns change to help debug
  useEffect(() => {
    console.log("Index component - date range updated:", dateRange);
    console.log(`Filtered campaigns count: ${filteredCampaigns.length}`);
  }, [dateRange, filteredCampaigns.length]);
  
  return (
    <div className="space-y-6">
      <DashboardHeader />
      
      {/* Financial Stats and Daily Averages - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardFinancialStats />
        <DailyAveragesSection filteredCampaigns={filteredCampaigns} />
      </div>

      {/* Campaign Leaderboard - Full Width */}
      <CampaignLeaderboard filteredCampaigns={filteredCampaigns} />
      
      {/* Campaign Details Section - Prominent visual separation */}
      <div className="mt-10 mb-4">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Campaign Details</h2>
        <Separator className="my-3 border-primary/20" />
        <p className="text-muted-foreground mb-4">
          Detailed performance metrics for each of your active campaigns
        </p>
      </div>
      
      {/* Campaign Grid - Pass filteredCampaigns */}
      <CampaignGrid filteredCampaigns={filteredCampaigns} />
    </div>
  );
};

export default Index;
