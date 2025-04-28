
import React, { useMemo } from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeeklyPerformanceChart } from "./WeeklyPerformanceChart";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";

interface CampaignPerformanceSectionProps {
  campaign: Campaign;
}

export function CampaignPerformanceSection({ campaign }: CampaignPerformanceSectionProps) {
  const { dateRange } = useCampaign();
  
  const metrics = useMemo(() => {
    console.log('CampaignPerformanceSection - Calculating metrics with date range:', dateRange);
    const calculatedMetrics = calculateMetrics(campaign, dateRange);
    console.log('CampaignPerformanceSection - Calculated metrics:', calculatedMetrics);
    return calculatedMetrics;
  }, [campaign, dateRange]);

  return (
    <div className="space-y-8">
      <Tabs defaultValue="weekly" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="weekly">Weekly Performance</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Targets</TabsTrigger>
        </TabsList>
        
        <TabsContent value="weekly" className="mt-4">
          <WeeklyPerformanceChart campaign={campaign} />
        </TabsContent>
        
        <TabsContent value="monthly" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Target Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Leads</span>
                  <div className="text-2xl font-semibold">{formatNumber(metrics.leads || 0)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Cases</span>
                  <div className="text-2xl font-semibold">{formatNumber(metrics.cases || 0)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <div className="text-2xl font-semibold">{formatCurrency(metrics.revenue || 0)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Ad Spend</span>
                  <div className="text-2xl font-semibold">{formatCurrency(metrics.adSpend || 0)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
