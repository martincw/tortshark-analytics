
import React, { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { OverviewStats } from "@/components/dashboard/OverviewStats";
import { CampaignLeaderboard } from "@/components/dashboard/CampaignLeaderboard";
import { useCampaign } from "@/contexts/CampaignContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InfoIcon, ArrowRight } from "lucide-react";
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
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewStats key={`overview-${dateKey}`} />
            
            <div className="lg:col-span-2">
              <CampaignLeaderboard key={`leaderboard-${dateKey}`} />
            </div>
          </TabsContent>

          <TabsContent value="campaigns">
            <CampaignGrid key={`grid-${dateKey}`} />
          </TabsContent>

          <TabsContent value="insights">
            <div className="lg:col-span-2">
              <CampaignLeaderboard key={`leaderboard-${dateKey}`} />
            </div>
            <div className="mt-6">
              <CampaignGrid key={`grid-${dateKey}`} />
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Index;
