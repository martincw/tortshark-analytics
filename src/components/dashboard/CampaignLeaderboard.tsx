
import React, { useMemo } from "react";
import { calculateMetrics, formatCurrency } from "@/utils/campaignUtils";
import { Crown, TrendingUp, DollarSign, Award } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Campaign } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";

interface LeaderboardMetric {
  id: string;
  name: string;
  accountName: string;
  value: number;
  formattedValue: string;
  costPerLead?: number;
}

interface CampaignLeaderboardProps {
  filteredCampaigns: Campaign[];
}

export function CampaignLeaderboard({ filteredCampaigns }: CampaignLeaderboardProps) {
  const { dateRange } = useCampaign();
  
  console.log(`CampaignLeaderboard received ${filteredCampaigns.length} filtered campaigns with date range:`, dateRange);

  const leaderboardData = useMemo(() => {
    if (!filteredCampaigns.length) return {
      profitLeaders: [],
      eplLeaders: [],
      profitPerLeadLeaders: []
    };
    
    // Filter campaign stats by date range if provided
    const campaignsWithFilteredStats = filteredCampaigns.map(campaign => {
      // Create a copy of the campaign
      const filteredCampaign = { ...campaign };
      
      // Filter stats history by date range if both dates are provided
      if (dateRange.startDate && dateRange.endDate && campaign.statsHistory) {
        console.log(`Filtering stats history for ${campaign.name} by date range:`, dateRange);
        filteredCampaign.statsHistory = campaign.statsHistory.filter(entry => 
          isDateInRange(entry.date, dateRange.startDate!, dateRange.endDate!)
        );
      }
      
      return filteredCampaign;
    });
    
    // Calculate metrics for each campaign based on filtered stats
    const campaignsWithMetrics = campaignsWithFilteredStats.map(campaign => {
      const metrics = calculateMetrics(campaign);
      const epl = campaign.manualStats.leads > 0 
        ? campaign.manualStats.revenue / campaign.manualStats.leads 
        : 0;
      const profitPerLead = campaign.manualStats.leads > 0 
        ? metrics.profit / campaign.manualStats.leads 
        : 0;
      const costPerLead = metrics.costPerLead;

      return {
        id: campaign.id,
        name: campaign.name,
        accountName: campaign.accountName,
        profit: metrics.profit,
        epl,
        profitPerLead,
        costPerLead
      };
    });

    // Sort by profit (descending)
    const profitLeaders = [...campaignsWithMetrics]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        accountName: c.accountName,
        value: c.profit,
        formattedValue: formatCurrency(c.profit)
      }));

    // Sort by EPL (descending)
    const eplLeaders = [...campaignsWithMetrics]
      .sort((a, b) => b.epl - a.epl)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        accountName: c.accountName,
        value: c.epl,
        formattedValue: formatCurrency(c.epl),
        costPerLead: c.costPerLead
      }));

    // Sort by profit per lead (descending)
    const profitPerLeadLeaders = [...campaignsWithMetrics]
      .sort((a, b) => b.profitPerLead - a.profitPerLead)
      .slice(0, 5)
      .map(c => ({
        id: c.id,
        name: c.name,
        accountName: c.accountName,
        value: c.profitPerLead,
        formattedValue: formatCurrency(c.profitPerLead),
        costPerLead: c.costPerLead
      }));

    return {
      profitLeaders,
      eplLeaders,
      profitPerLeadLeaders
    };
  }, [filteredCampaigns, dateRange]);

  if (!filteredCampaigns.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Campaign Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <LeaderboardSection 
            title="Highest Profit" 
            icon={<DollarSign className="h-4 w-4" />}
            leaders={leaderboardData.profitLeaders} 
            emptyMessage="No profit data available" 
            showCostPerLead={false}
          />
          
          <LeaderboardSection 
            title="Highest EPL" 
            icon={<TrendingUp className="h-4 w-4" />}
            leaders={leaderboardData.eplLeaders} 
            emptyMessage="No EPL data available" 
            tooltip="Earnings Per Lead"
            showCostPerLead={true}
          />
          
          <LeaderboardSection 
            title="Highest Profit Per Lead" 
            icon={<Crown className="h-4 w-4" />}
            leaders={leaderboardData.profitPerLeadLeaders} 
            emptyMessage="No profit per lead data available" 
            showCostPerLead={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface LeaderboardSectionProps {
  title: string;
  icon: React.ReactNode;
  leaders: LeaderboardMetric[];
  emptyMessage: string;
  tooltip?: string;
  showCostPerLead?: boolean;
}

function LeaderboardSection({ 
  title, 
  icon, 
  leaders, 
  emptyMessage,
  tooltip,
  showCostPerLead = false
}: LeaderboardSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-medium flex items-center gap-1.5 mb-2 text-muted-foreground">
        {icon}
        {title}
        {tooltip && (
          <span className="text-xs text-muted-foreground/70 italic">
            ({tooltip})
          </span>
        )}
      </h3>
      
      {leaders.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaders.map((leader, index) => (
              <TableRow key={leader.id} className={cn(
                "transition-colors",
                index === 0 && "bg-amber-50/30",
                index === 1 && "bg-zinc-100/30",
                index === 2 && "bg-amber-50/10"
              )}>
                <TableCell className="text-center font-medium">
                  {index === 0 ? (
                    <span className="text-amber-500">
                      <Award className="h-4 w-4 inline" />
                    </span>
                  ) : (
                    index + 1
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {leader.name}
                  <div className="text-xs text-muted-foreground">{leader.accountName}</div>
                </TableCell>
                <TableCell className={cn(
                  "text-right font-medium",
                  leader.value > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"
                )}>
                  {leader.formattedValue}
                  {showCostPerLead && leader.costPerLead !== undefined && (
                    <div className="text-xs text-muted-foreground">
                      CPL: {formatCurrency(leader.costPerLead)}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center p-4 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
