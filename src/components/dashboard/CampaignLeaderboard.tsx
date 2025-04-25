
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency } from "@/utils/campaignUtils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface CampaignLeaderboardProps {
  filteredCampaigns: Campaign[];
}

export function CampaignLeaderboard({ filteredCampaigns }: CampaignLeaderboardProps) {
  const { dateRange } = useCampaign();
  
  const leaderboardData = useMemo(() => {
    if (!filteredCampaigns || filteredCampaigns.length === 0) {
      return {
        byProfit: [],
        byEarningsPerLead: [],
        byProfitPerLead: []
      };
    }
    
    const campaignsWithMetrics = filteredCampaigns.map(campaign => {
      const metrics = calculateMetrics(campaign, dateRange);
      return {
        ...campaign,
        metrics
      };
    });
    
    // Sort by different metrics
    const byProfit = [...campaignsWithMetrics]
      .sort((a, b) => b.metrics.profit - a.metrics.profit)
      .slice(0, 5);
      
    const byEarningsPerLead = [...campaignsWithMetrics]
      .sort((a, b) => b.metrics.earningsPerLead - a.metrics.earningsPerLead)
      .slice(0, 5);
      
    const byProfitPerLead = [...campaignsWithMetrics]
      .sort((a, b) => (b.metrics.profit / (b.metrics.leads || 1)) - (a.metrics.profit / (a.metrics.leads || 1)))
      .slice(0, 5);
    
    return {
      byProfit,
      byEarningsPerLead,
      byProfitPerLead
    };
  }, [filteredCampaigns, dateRange]);
  
  if (!leaderboardData.byProfit.length) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-md font-medium flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Campaign Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Highest Profit */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="text-muted-foreground">$</span> Highest Profit
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.byProfit.map((campaign, index) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>{campaign.name}</div>
                      <div className="text-xs text-muted-foreground">Manual Entry</div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(campaign.metrics.profit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Highest EPL */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="text-muted-foreground">↗</span> Highest EPL 
              <span className="text-xs text-muted-foreground">(Earnings Per Lead)</span>
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.byEarningsPerLead.map((campaign, index) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>{campaign.name}</div>
                      <div className="text-xs text-muted-foreground">Manual Entry</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{formatCurrency(campaign.metrics.earningsPerLead)}</div>
                      <div className="text-xs text-muted-foreground">
                        CPL: {formatCurrency(campaign.metrics.costPerLead)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Highest Profit Per Lead */}
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <span className="text-muted-foreground">👑</span> Highest Profit Per Lead
            </h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.byProfitPerLead.map((campaign, index) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>{campaign.name}</div>
                      <div className="text-xs text-muted-foreground">Manual Entry</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{formatCurrency(campaign.metrics.profit / (campaign.metrics.leads || 1))}</div>
                      <div className="text-xs text-muted-foreground">
                        CPL: {formatCurrency(campaign.metrics.costPerLead)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
