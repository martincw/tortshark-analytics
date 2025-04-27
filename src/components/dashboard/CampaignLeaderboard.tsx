
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Medal, Ribbon, Trophy } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber } from "@/utils/campaignUtils";
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
    
    const byProfit = [...campaignsWithMetrics]
      .sort((a, b) => b.metrics.profit - a.metrics.profit)
      .slice(0, 5);
      
    const byEarningsPerLead = [...campaignsWithMetrics]
      .sort((a, b) => {
        // Calculate Earnings Per Lead (Revenue per Lead)
        const earningsPerLeadA = a.manualStats.leads > 0 
          ? a.manualStats.revenue / a.manualStats.leads 
          : 0;
        const earningsPerLeadB = b.manualStats.leads > 0 
          ? b.manualStats.revenue / b.manualStats.leads 
          : 0;
        return earningsPerLeadB - earningsPerLeadA; // Descending order
      })
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
  
  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 0: return <Trophy className="h-4 w-4 text-yellow-400" />;
      case 1: return <Medal className="h-4 w-4 text-gray-400" />;
      case 2: return <Ribbon className="h-4 w-4 text-amber-700" />;
      default: return null;
    }
  };

  const getRowClassName = (index: number) => {
    switch(index) {
      case 0: return "bg-success-muted hover:bg-success-muted/75";
      case 1: return "bg-gray-50 hover:bg-gray-100";
      case 2: return "bg-amber-50 hover:bg-amber-100";
      default: return "";
    }
  };

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
                  <TableRow 
                    key={campaign.id}
                    className={getRowClassName(index)}
                  >
                    <TableCell className="font-medium flex items-center gap-1">
                      {getRankIcon(index)}
                      {index + 1}
                    </TableCell>
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
                {leaderboardData.byEarningsPerLead.map((campaign, index) => {
                  // Calculate Earnings Per Lead (Revenue per Lead)
                  const earningsPerLead = campaign.manualStats.leads > 0 
                    ? campaign.manualStats.revenue / campaign.manualStats.leads 
                    : 0;

                  return (
                    <TableRow 
                      key={campaign.id}
                      className={getRowClassName(index)}
                    >
                      <TableCell className="font-medium flex items-center gap-1">
                        {getRankIcon(index)}
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div>{campaign.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Leads: {formatNumber(campaign.manualStats.leads)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{formatCurrency(earningsPerLead)}</div>
                        <div className="text-xs text-muted-foreground">
                          Revenue: {formatCurrency(campaign.manualStats.revenue)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

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
                  <TableRow 
                    key={campaign.id}
                    className={getRowClassName(index)}
                  >
                    <TableCell className="font-medium flex items-center gap-1">
                      {getRankIcon(index)}
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div>{campaign.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Leads: {formatNumber(campaign.metrics.leads)}
                      </div>
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
