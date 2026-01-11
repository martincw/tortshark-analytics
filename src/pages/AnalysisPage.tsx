import React, { useState, useEffect, useMemo } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { PerformanceTrends } from "@/components/analysis/PerformanceTrends";
import { ProfitForecasting } from "@/components/analysis/ProfitForecasting";
import { BudgetOptimization } from "@/components/analysis/BudgetOptimization";
import { GoalTracker } from "@/components/analysis/GoalTracker";
import { ComparativeAnalysis } from "@/components/analysis/ComparativeAnalysis";
import AIAnalyst from "@/components/analysis/AIAnalyst";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ForecastingModel, ForecastingPeriod, ProjectionParams, ForecastModelOption, ForecastPeriodOption } from "@/types/campaign";

const forecastingModels: ForecastModelOption[] = [
  {
    name: "linear",
    label: "Linear",
    description: "Simple trend extrapolation based on historical data"
  },
  {
    name: "weighted",
    label: "Weighted Average",
    description: "Gives more importance to recent data points"
  },
  {
    name: "exponential",
    label: "Exponential Growth",
    description: "Assumes accelerating growth or decline patterns"
  }
];

const forecastingPeriods: ForecastPeriodOption[] = [
  { value: "week", label: "End of Week" },
  { value: "month", label: "End of Month" },
  { value: "quarter", label: "End of Quarter" }
];

const AnalysisPage = () => {
  const { campaigns, isLoading } = useCampaign();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [forecastModel, setForecastModel] = useState<string>("weighted");
  const [forecastPeriod, setForecastPeriod] = useState<string>("month");
  const [projectionParams, setProjectionParams] = useState<ProjectionParams>({
    targetProfit: 10000,
    growthRate: 0,
    conversionRate: 0.1,
    costPerLead: 100,
    revenuePerCase: 1000,
    adSpendGrowth: 0,
    conversionRateGrowth: 0,
    revenuePerCaseGrowth: 0,
    // Add the missing required properties
    dailyBudget: 500,
    leadConversionRate: 0.1,
    averageRevenuePerCase: 1000,
    forecastDuration: 30
  });

  useEffect(() => {
    // Set first campaign as default when campaigns are loaded
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = useMemo(() => {
    return campaigns.find(camp => camp.id === selectedCampaignId);
  }, [campaigns, selectedCampaignId]);

  const handleParamChange = (param: keyof ProjectionParams, value: number[]) => {
    setProjectionParams(prev => ({
      ...prev,
      [param]: value[0]
    }));
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Deep insights, forecasting, and optimization recommendations
          </p>
        </div>
      </div>

      {/* AI Analyst Section */}
      <AIAnalyst />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left sidebar with settings */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Analysis Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="campaign-select">Select Campaign</Label>
              <Select 
                value={selectedCampaignId} 
                onValueChange={(value) => setSelectedCampaignId(value)}
              >
                <SelectTrigger id="campaign-select" className="mt-1">
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="forecast-model">Forecasting Model</Label>
              <Select 
                value={forecastModel} 
                onValueChange={setForecastModel}
              >
                <SelectTrigger id="forecast-model" className="mt-1">
                  <SelectValue placeholder="Select forecast model" />
                </SelectTrigger>
                <SelectContent>
                  {forecastingModels.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {forecastingModels.find(m => m.name === forecastModel)?.description}
              </p>
            </div>

            <div>
              <Label htmlFor="forecast-period">Forecast Period</Label>
              <Select 
                value={forecastPeriod} 
                onValueChange={setForecastPeriod}
              >
                <SelectTrigger id="forecast-period" className="mt-1">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {forecastingPeriods.map((period) => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-4">What-If Scenarios</h3>
              
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="ad-spend-growth">Ad Spend Change</Label>
                    <span className="text-sm font-medium">{projectionParams.adSpendGrowth}%</span>
                  </div>
                  <Slider
                    id="ad-spend-growth"
                    min={-50}
                    max={50}
                    step={1}
                    value={[projectionParams.adSpendGrowth]}
                    onValueChange={(value) => handleParamChange('adSpendGrowth', value)}
                    className="py-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="conversion-growth">Conversion Rate Change</Label>
                    <span className="text-sm font-medium">{projectionParams.conversionRateGrowth}%</span>
                  </div>
                  <Slider
                    id="conversion-growth"
                    min={-50}
                    max={50}
                    step={1}
                    value={[projectionParams.conversionRateGrowth]}
                    onValueChange={(value) => handleParamChange('conversionRateGrowth', value)}
                    className="py-2"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label htmlFor="revenue-growth">Revenue Per Case Change</Label>
                    <span className="text-sm font-medium">{projectionParams.revenuePerCaseGrowth}%</span>
                  </div>
                  <Slider
                    id="revenue-growth"
                    min={-50}
                    max={50}
                    step={1}
                    value={[projectionParams.revenuePerCaseGrowth]}
                    onValueChange={(value) => handleParamChange('revenuePerCaseGrowth', value)}
                    className="py-2"
                  />
                </div>
              </div>

              <Button className="w-full mt-4" variant="secondary">
                Apply Scenario
              </Button>
            </div>

            {selectedCampaign && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-2">Campaign Info</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Platform:</span> {selectedCampaign.platform}</p>
                  <p><span className="text-muted-foreground">Account:</span> {selectedCampaign.accountName}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main content area */}
        <div className="col-span-1 md:col-span-3">
          {isLoading ? (
            <LoadingState />
          ) : selectedCampaign ? (
            <Tabs defaultValue="trends" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="trends">Performance Trends</TabsTrigger>
                <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
                <TabsTrigger value="budget">Budget Optimization</TabsTrigger>
                <TabsTrigger value="goals">Goal Tracking</TabsTrigger>
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
              </TabsList>

              <TabsContent value="trends" className="mt-4">
                <PerformanceTrends 
                  campaign={selectedCampaign} 
                />
              </TabsContent>

              <TabsContent value="forecasting" className="mt-4">
                <ProfitForecasting 
                  campaign={selectedCampaign} 
                  forecastModel={forecastModel}
                  forecastPeriod={forecastPeriod}
                  projectionParams={projectionParams}
                />
              </TabsContent>

              <TabsContent value="budget" className="mt-4">
                <BudgetOptimization 
                  campaign={selectedCampaign} 
                  forecastPeriod={forecastPeriod}
                />
              </TabsContent>

              <TabsContent value="goals" className="mt-4">
                <GoalTracker 
                  campaign={selectedCampaign}
                />
              </TabsContent>

              <TabsContent value="comparison" className="mt-4">
                <ComparativeAnalysis 
                  campaign={selectedCampaign}
                  allCampaigns={campaigns}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <NoDataState />
          )}
        </div>
      </div>
    </div>
  );
};

const LoadingState = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-8 w-1/3" />
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const NoDataState = () => (
  <Card>
    <CardContent className="flex flex-col items-center justify-center py-12">
      <Alert variant="default" className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Campaign Selected</AlertTitle>
        <AlertDescription>
          Please select a campaign from the dropdown to view analysis and forecasting data.
        </AlertDescription>
      </Alert>
    </CardContent>
  </Card>
);

export default AnalysisPage;
