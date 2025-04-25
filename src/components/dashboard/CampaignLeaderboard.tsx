
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpDown, Trophy } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatPercent, getPerformanceClass } from "@/utils/campaignUtils";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";
import { cn } from '@/lib/utils';

interface CampaignLeaderboardProps {
  filteredCampaigns: Campaign[];
}

export function CampaignLeaderboard({ filteredCampaigns }: CampaignLeaderboardProps) {
  const { dateRange } = useCampaign();
  
  const campaignsByROI = useMemo(() => {
    if (!filteredCampaigns || filteredCampaigns.length === 0) {
      return [];
    }
    
    const campaignsWithMetrics = filteredCampaigns.map(campaign => {
      const metrics = calculateMetrics(campaign, dateRange);
      return {
        ...campaign,
        metrics
      };
    });
    
    // Sort by ROI descending
    return campaignsWithMetrics.sort((a, b) => b.metrics.roi - a.metrics.roi).slice(0, 5);
  }, [filteredCampaigns, dateRange]);
  
  if (!campaignsByROI.length) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Top Performing Campaigns
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left pb-2 font-medium">Campaign</th>
                <th className="text-right pb-2 font-medium">
                  <div className="flex items-center justify-end">
                    <ArrowUpDown className="h-3 w-3 mr-1" />
                    ROI
                  </div>
                </th>
                <th className="text-right pb-2 font-medium">Ad Spend</th>
                <th className="text-right pb-2 font-medium">Revenue</th>
                <th className="text-right pb-2 font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {campaignsByROI.map((campaign) => (
                <tr key={campaign.id} className="border-b border-muted last:border-0">
                  <td className="py-3">
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground">{campaign.platform}</div>
                  </td>
                  <td className="py-3 text-right">
                    <span className={cn(getPerformanceClass(campaign.metrics.roi))}>
                      {formatPercent(campaign.metrics.roi)}
                    </span>
                  </td>
                  <td className="py-3 text-right">{formatCurrency(campaign.metrics.adSpend || 0)}</td>
                  <td className="py-3 text-right">{formatCurrency(campaign.metrics.revenue || 0)}</td>
                  <td className="py-3 text-right">
                    <span className={cn(
                      campaign.metrics.profit >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"
                    )}>
                      {formatCurrency(campaign.metrics.profit)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
