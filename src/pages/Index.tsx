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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import LeadsTab from "@/components/dashboard/LeadsTab";
import PortfolioTab from "@/components/dashboard/PortfolioTab";

const Index = () => {
  const { dateRange, selectedCampaignIds, campaigns, isLoading, error, fetchCampaigns } = useCampaign();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  
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
    
    // Add more detailed logging about the campaigns to help debug
    if (filteredCampaigns.length > 0) {
      console.log("First campaign sample:", {
        id: filteredCampaigns[0].id,
        name: filteredCampaigns[0].name,
        statsHistory: filteredCampaigns[0].statsHistory.length
      });
    }
  }, [dateRange, filteredCampaigns.length]);

  // Store active tab in localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem("dashboardActiveTab", activeTab);
    } catch (e) {
      console.error("Error saving active tab to localStorage:", e);
    }
  }, [activeTab]);

  // Initialize active tab from localStorage on component mount
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem("dashboardActiveTab");
      if (savedTab) {
        setActiveTab(savedTab);
      }
    } catch (e) {
      console.error("Error loading active tab from localStorage:", e);
    }
  }, []);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };
  
  // Improve the refresh handler with proper loading states and error handling
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchCampaigns();
      toast.success("Data refreshed successfully");
    } catch (e) {
      console.error("Error refreshing campaigns:", e);
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Show loading state
  if (isLoading && campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <div className="flex flex-col items-center justify-center p-12">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-lg font-medium">Loading dashboard data...</p>
        </div>
      </div>
    );
  }
  
  // Show error state with improved error messaging and recovery options
  if (error && !isLoading && campaigns.length === 0) {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex flex-col gap-4">
              <p>Error loading campaigns: {error}</p>
              <div className="flex flex-col gap-2">
                <p className="text-sm">Try these solutions:</p>
                <ul className="list-disc list-inside text-sm ml-2">
                  <li>Check your internet connection</li>
                  <li>Log out and log back in</li>
                  <li>Clear your browser cache</li>
                </ul>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={isRefreshing}
                className="w-fit"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // Regular render state with proper fallbacks for empty data
  return (
    <div className="space-y-6">
      {/* Keep the DashboardHeader at the top across all tabs */}
      <DashboardHeader />
      
      {/* Add refresh button for easy data refresh without error state */}
      {!isLoading && (
        <div className="flex justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="w-fit"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </div>
      )}
      
      {/* Tabbed Interface with Tinted Styling */}
      <Tabs 
        defaultValue={activeTab} 
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="w-full border-b bg-muted/30 mb-4 h-12 rounded-none justify-start">
          <TabsTrigger 
            value="overview" 
            className="flex-1 max-w-[200px] font-medium data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary bg-muted/10 hover:bg-muted/20 rounded-none transition-colors"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="campaigns" 
            className="flex-1 max-w-[200px] font-medium data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary bg-muted/10 hover:bg-muted/20 rounded-none transition-colors"
          >
            Campaigns
          </TabsTrigger>
          <TabsTrigger 
            value="portfolio" 
            className="flex-1 max-w-[200px] font-medium data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary bg-muted/10 hover:bg-muted/20 rounded-none transition-colors"
          >
            Portfolio
          </TabsTrigger>
          <TabsTrigger 
            value="leaderboard" 
            className="flex-1 max-w-[200px] font-medium data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary bg-muted/10 hover:bg-muted/20 rounded-none transition-colors"
          >
            Leaderboard
          </TabsTrigger>
          <TabsTrigger 
            value="leads" 
            className="flex-1 max-w-[200px] font-medium data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary bg-muted/10 hover:bg-muted/20 rounded-none transition-colors"
          >
            Leads
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab Content */}
        <TabsContent value="overview" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DashboardFinancialStats />
            <DailyAveragesSection filteredCampaigns={filteredCampaigns} />
          </div>
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
        
        {/* Portfolio Tab Content */}
        <TabsContent value="portfolio" className="space-y-6 mt-0">
          <PortfolioTab />
        </TabsContent>
        
        {/* Leaderboard Tab Content */}
        <TabsContent value="leaderboard" className="space-y-6 mt-0">
          <CampaignLeaderboard filteredCampaigns={filteredCampaigns} />
        </TabsContent>
        
        {/* Leads Tab Content */}
        <TabsContent value="leads" className="space-y-6 mt-0">
          <LeadsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
