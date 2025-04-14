
import React, { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfitProjection } from "@/components/analysis/ProfitProjection";
import { PerformanceTrends } from "@/components/analysis/PerformanceTrends";
import { ConversionAnalysis } from "@/components/analysis/ConversionAnalysis";

const AnalysisPage = () => {
  const { campaigns } = useCampaign();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [targetProfit, setTargetProfit] = useState<number>(1000);

  useEffect(() => {
    // Set first campaign as default when campaigns are loaded
    if (campaigns.length > 0 && !selectedCampaignId) {
      setSelectedCampaignId(campaigns[0].id);
    }
  }, [campaigns, selectedCampaignId]);

  const selectedCampaign = campaigns.find(camp => camp.id === selectedCampaignId);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Analysis</h1>
          <p className="text-muted-foreground mt-1">
            Deep dive into campaign performance and projections
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Campaign Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="campaign-select">Select Campaign</Label>
              <Select 
                value={selectedCampaignId} 
                onValueChange={(value) => setSelectedCampaignId(value)}
              >
                <SelectTrigger id="campaign-select">
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
              <Label htmlFor="target-profit">Target Weekly Profit ($)</Label>
              <Input
                id="target-profit"
                type="number"
                value={targetProfit}
                onChange={(e) => setTargetProfit(Number(e.target.value))}
                className="mt-1"
              />
            </div>

            {selectedCampaign && (
              <div className="pt-4">
                <h3 className="font-medium text-sm mb-2">Campaign Info</h3>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Platform:</span> {selectedCampaign.platform}</p>
                  <p><span className="text-muted-foreground">Account:</span> {selectedCampaign.accountName}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="col-span-1 md:col-span-2">
          {selectedCampaign ? (
            <Tabs defaultValue="projection" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="projection">Profit Projection</TabsTrigger>
                <TabsTrigger value="trends">Performance Trends</TabsTrigger>
                <TabsTrigger value="conversion">Conversion Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="projection" className="mt-4">
                <ProfitProjection campaign={selectedCampaign} targetProfit={targetProfit} />
              </TabsContent>

              <TabsContent value="trends" className="mt-4">
                <PerformanceTrends campaign={selectedCampaign} />
              </TabsContent>

              <TabsContent value="conversion" className="mt-4">
                <ConversionAnalysis campaign={selectedCampaign} />
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[300px]">
                <p className="text-muted-foreground">Please select a campaign to analyze</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisPage;
