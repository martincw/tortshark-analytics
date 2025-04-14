
import React, { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { AggregateStats } from "@/components/dashboard/AggregateStats";
import { CampaignLeaderboard } from "@/components/dashboard/CampaignLeaderboard";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { useCampaign } from "@/contexts/CampaignContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoIcon, ArrowRight, LayoutDashboard, ListChecks, LineChart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const { campaigns, selectedCampaignIds, dateRange } = useCampaign();
  const navigate = useNavigate();
  
  const showSelectionAlert = selectedCampaignIds.length > 0 && selectedCampaignIds.length < campaigns.length;

  // Add key prop with dateRange to force re-renders when date changes
  const dateKey = `${dateRange.startDate}-${dateRange.endDate}`;
  
  // Log date range for debugging
  useEffect(() => {
    console.log("Dashboard updating with date range:", dateRange);
  }, [dateRange]);

  const hasNoData = campaigns.length === 0;

  return (
    <div className="space-y-6">
      <DashboardHeader />
      
      {showSelectionAlert && (
        <Alert variant="default" className="bg-primary/5 border border-primary/20">
          <InfoIcon className="h-4 w-4 mr-2 text-primary" />
          <AlertDescription>
            Showing metrics for {selectedCampaignIds.length} selected campaign{selectedCampaignIds.length > 1 ? 's' : ''}. 
            Use the Campaigns filter to adjust selection.
          </AlertDescription>
        </Alert>
      )}

      {hasNoData ? (
        <div className="border rounded-lg p-8 text-center bg-background">
          <h2 className="text-2xl font-bold mb-3">Welcome to Your Campaign Dashboard</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            To get started, add your first campaign to begin tracking performance metrics
            and making data-driven decisions for your mass tort advertising.
          </p>
          <Button onClick={() => navigate("/add-campaign")} size="lg">
            Add Your First Campaign
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <LayoutDashboard className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-1.5">
              <ListChecks className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1.5">
              <LineChart className="h-4 w-4" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-2">
                <AggregateStats key={`aggregate-${dateKey}`} />
              </div>
              <div className="md:col-span-1">
                <OverviewStats key={`overview-${dateKey}`} />
              </div>
            </div>
            <CampaignLeaderboard key={`leaderboard-${dateKey}`} />
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignGrid key={`grid-${dateKey}`} />
          </TabsContent>

          <TabsContent value="insights">
            <div className="space-y-6">
              <CampaignLeaderboard key={`leaderboard-${dateKey}`} />
              <CampaignGrid key={`grid-${dateKey}`} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Index;
