
import { useCampaign } from "@/contexts/CampaignContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import DashboardFinancialStats from "@/components/dashboard/DashboardFinancialStats";
import { DailyAveragesSection } from "@/components/dashboard/DailyAveragesSection";
import { CampaignLeaderboard } from "@/components/dashboard/CampaignLeaderboard";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignFilters } from "@/components/dashboard/CampaignFilters";
import { useCampaignGridData } from "@/hooks/useCampaignGridData";

const Index = () => {
  const { dateRange, selectedCampaignIds, campaigns } = useCampaign();
  const [activeTab, setActiveTab] = useState<string>("overview");
  
  // Filter campaigns by selected IDs if any are selected
  const filteredCampaigns = selectedCampaignIds.length > 0
    ? campaigns.filter(campaign => selectedCampaignIds.includes(campaign.id))
    : campaigns;
  
  // Use the campaign grid data hook for filtering and sorting
  const {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filterCampaign,
    setFilterCampaign,
    campaignTypes,
    sortedAndFilteredCampaigns
  } = useCampaignGridData(filteredCampaigns);
  
  // Log when date range or filtered campaigns change to help debug
  useEffect(() => {
    console.log("Index component - date range updated:", dateRange);
    console.log(`Filtered campaigns count: ${filteredCampaigns.length}`);
  }, [dateRange, filteredCampaigns.length]);

  // Store active tab in localStorage when it changes
  useEffect(() => {
    localStorage.setItem("dashboardActiveTab", activeTab);
  }, [activeTab]);

  // Initialize active tab from localStorage on component mount
  useEffect(() => {
    const savedTab = localStorage.getItem("dashboardActiveTab");
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  return (
    <div className="space-y-6">
      {/* Keep the DashboardHeader at the top across all tabs */}
      <DashboardHeader />
      
      {/* Tabbed Interface */}
      <Tabs 
        defaultValue={activeTab} 
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="w-full border-b bg-background mb-4 h-12 rounded-none justify-start">
          <TabsTrigger 
            value="overview" 
            className="flex-1 max-w-[200px] font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="leaderboard" 
            className="flex-1 max-w-[200px] font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Leaderboard
          </TabsTrigger>
          <TabsTrigger 
            value="campaigns" 
            className="flex-1 max-w-[200px] font-medium data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            Campaigns
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab Content */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardFinancialStats />
            <DailyAveragesSection filteredCampaigns={filteredCampaigns} />
          </div>
        </TabsContent>
        
        {/* Leaderboard Tab Content */}
        <TabsContent value="leaderboard" className="space-y-6 mt-0">
          <CampaignLeaderboard filteredCampaigns={filteredCampaigns} />
        </TabsContent>
        
        {/* Campaigns Tab Content */}
        <TabsContent value="campaigns" className="space-y-6 mt-0">
          <CampaignFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filterCampaign={filterCampaign}
            setFilterCampaign={setFilterCampaign}
            campaignTypes={campaignTypes}
          />
          <CampaignGrid filteredCampaigns={sortedAndFilteredCampaigns} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
