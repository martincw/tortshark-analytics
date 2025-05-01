
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, ChevronDown, ChevronUp, CircleDollarSign, Medal, Ribbon, TrendingUp, Trophy, Users } from "lucide-react";
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
        byProfitPerLead: [],
        byCheapestCPL: [],
        byMostLeads: [],
        byBiggestChange: []
      };
    }
    
    const campaignsWithMetrics = filteredCampaigns.map(campaign => {
      const metrics = calculateMetrics(campaign, dateRange);
      return {
        ...campaign,
        metrics
      };
    });
    
    // Filter out campaigns with $0 or negative profit before sorting
    const profitableCampaigns = campaignsWithMetrics.filter(c => c.metrics.profit > 0);
    
    const byProfit = [...profitableCampaigns]
      .sort((a, b) => b.metrics.profit - a.metrics.profit)
      .slice(0, 5);
      
    // For earnings per lead, only include campaigns with positive earnings
    const byEarningsPerLead = [...profitableCampaigns]
      .filter(c => c.metrics.leads > 0)
      .sort((a, b) => {
        const earningsPerLeadA = a.metrics.revenue / a.metrics.leads;
        const earningsPerLeadB = b.metrics.revenue / b.metrics.leads;
        return earningsPerLeadB - earningsPerLeadA;
      })
      .slice(0, 5);
      
    // Filter for profit per lead to only include campaigns with positive profit
    const byProfitPerLead = [...profitableCampaigns]
      .filter(c => c.metrics.leads > 0)
      .sort((a, b) => (b.metrics.profit / b.metrics.leads) - (a.metrics.profit / a.metrics.leads))
      .slice(0, 5);
      
    // For cheapest CPL, filter to only those with ad spend and leads
    const byCheapestCPL = [...campaignsWithMetrics]
      .filter(campaign => campaign.metrics.adSpend > 0 && campaign.metrics.leads > 0)
      .sort((a, b) => a.metrics.costPerLead - b.metrics.costPerLead)
      .slice(0, 5);
      
    const byMostLeads = [...campaignsWithMetrics]
      .filter(c => c.metrics.leads > 0)
      .sort((a, b) => b.metrics.leads - a.metrics.leads)
      .slice(0, 5);
      
    // For biggest change, filter to include only non-zero profit campaigns
    const byBiggestChange = [...profitableCampaigns]
      .sort((a, b) => Math.abs(b.metrics.weekOverWeekChange) - Math.abs(a.metrics.weekOverWeekChange))
      .slice(0, 5);
    
    return {
      byProfit,
      byEarningsPerLead,
      byProfitPerLead,
      byCheapestCPL,
      byMostLeads,
      byBiggestChange
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

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
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
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(campaign.metrics.revenue)}
                      </div>
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
                  const earningsPerLead = campaign.metrics.leads > 0 
                    ? campaign.metrics.revenue / campaign.metrics.leads 
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
                          Leads: {formatNumber(campaign.metrics.leads)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>{formatCurrency(earningsPerLead)}</div>
                        <div className="text-xs text-muted-foreground">
                          CPL: {formatCurrency(campaign.metrics.costPerLead)}
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" /> Cheapest CPL
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
                {leaderboardData.byCheapestCPL.map((campaign, index) => (
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
                        Ad Spend: {formatCurrency(campaign.metrics.adSpend)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{formatCurrency(campaign.metrics.costPerLead)}</div>
                      <div className="text-xs text-muted-foreground">
                        Leads: {formatNumber(campaign.metrics.leads)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" /> Most Leads
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
                {leaderboardData.byMostLeads.map((campaign, index) => (
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
                        CPL: {formatCurrency(campaign.metrics.costPerLead)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>{formatNumber(campaign.metrics.leads)}</div>
                      <div className="text-xs text-muted-foreground">
                        Revenue: {formatCurrency(campaign.metrics.revenue)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" /> Biggest Change
              <span className="text-xs text-muted-foreground">(vs last week)</span>
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
                {leaderboardData.byBiggestChange.map((campaign, index) => {
                  const percentageChange = calculatePercentageChange(
                    campaign.metrics.profit,
                    campaign.metrics.previousWeekProfit
                  );

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
                          {percentageChange >= 0 ? (
                            <span className="flex items-center gap-1 text-success-DEFAULT">
                              <ChevronUp className="h-3 w-3" />
                              +{Math.abs(percentageChange).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-error-DEFAULT">
                              <ChevronDown className="h-3 w-3" />
                              -{Math.abs(percentageChange).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="text-success-DEFAULT">
                          {formatCurrency(campaign.metrics.profit)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last Week: {formatCurrency(campaign.metrics.previousWeekProfit)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
