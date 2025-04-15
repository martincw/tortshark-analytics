
import React, { useMemo } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
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
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";

interface LeaderboardMetric {
  id: string;
  name: string;
  accountName: string;
  value: number;
  formattedValue: string;
  costPerLead?: number; // Added to show CPL
}

export function CampaignLeaderboard() {
  const { campaigns, dateRange } = useCampaign();

  const leaderboardData = useMemo(() => {
    if (!campaigns.length) return {
      profitLeaders: [],
      eplLeaders: [],
      profitPerLeadLeaders: []
    };

    // Get filtered campaign data based on date range
    const startDateStr = dateRange.startDate;
    const endDateStr = dateRange.endDate;
    
    console.log(`CampaignLeaderboard using date range: ${startDateStr} to ${endDateStr}`);
    
    const filteredCampaigns = campaigns.map(campaign => {
      // Create a deep copy to avoid mutating the original
      const campaignCopy = { ...campaign };
      
      // Initialize filtered stats
      let filteredLeads = 0;
      let filteredCases = 0;
      let filteredRevenue = 0;
      let filteredAdSpend = 0;
      
      // Apply date filtering if range exists
      if (startDateStr && endDateStr) {
        const startDate = startOfDay(new Date(startDateStr + "T12:00:00Z"));
        const endDate = endOfDay(new Date(endDateStr + "T12:00:00Z"));
        
        // Filter history by date range
        const filteredHistory = campaign.statsHistory.filter(stat => {
          const statDate = parseISO(stat.date);
          return isWithinInterval(statDate, { start: startDate, end: endDate });
        });
        
        // Sum up filtered history
        filteredLeads = filteredHistory.reduce((sum, stat) => sum + stat.leads, 0);
        filteredCases = filteredHistory.reduce((sum, stat) => sum + stat.cases, 0);
        filteredRevenue = filteredHistory.reduce((sum, stat) => sum + stat.revenue, 0);
        filteredAdSpend = filteredHistory.reduce((sum, stat) => sum + (stat.adSpend || 0), 0);
        
        // Create a campaign copy with date-filtered stats
        campaignCopy.manualStats = {
          ...campaign.manualStats,
          leads: filteredLeads,
          cases: filteredCases,
          revenue: filteredRevenue
        };
        
        campaignCopy.stats = {
          ...campaign.stats,
          adSpend: filteredAdSpend
        };
      }
      
      return campaignCopy;
    });
    
    // Calculate metrics for each campaign
    const campaignsWithMetrics = filteredCampaigns.map(campaign => {
      const metrics = calculateMetrics(campaign);
      const epl = campaign.manualStats.leads > 0 
        ? campaign.manualStats.revenue / campaign.manualStats.leads 
        : 0;
      const profitPerLead = campaign.manualStats.leads > 0 
        ? metrics.profit / campaign.manualStats.leads 
        : 0;
      const costPerLead = metrics.costPerLead; // Get the cost per lead

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
        costPerLead: c.costPerLead // Include cost per lead
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
        costPerLead: c.costPerLead // Include cost per lead
      }));

    return {
      profitLeaders,
      eplLeaders,
      profitPerLeadLeaders
    };
  }, [campaigns, dateRange]);

  if (!campaigns.length) {
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
  showCostPerLead?: boolean; // Added to control showing CPL
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
