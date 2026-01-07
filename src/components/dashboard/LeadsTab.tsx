import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Download, TrendingUp, TrendingDown, Users, DollarSign, BarChart3, Zap, Minus } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/campaignUtils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";

interface LeadProsperLead {
  id: string;
  lead_id: string;
  campaign_id: string;
  campaign_name: string;
  date: string;
  status: string;
  revenue: number;
  cost: number;
  created_at: string;
  updated_at: string;
}

interface CampaignSummary {
  campaign_name: string;
  campaign_id: string;
  leads: number;
  accepted: number;
  failed: number;
  profit: number;
  revenue: number;
  cost: number;
}

interface ComparisonStats {
  campaignsCount: number;
  totalLeads: number;
  totalAccepted: number;
  totalFailed: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  acceptRate: string;
}

const LeadsTab: React.FC = () => {
  const { dateRange } = useCampaign();
  const [lpLeads, setLpLeads] = useState<LeadProsperLead[]>([]);
  const [campaignSummaries, setCampaignSummaries] = useState<CampaignSummary[]>([]);
  const [lpLoading, setLpLoading] = useState(false);
  const [lpSyncing, setLpSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<keyof CampaignSummary>('leads');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isRealtime, setIsRealtime] = useState(true);
  const [yesterdayStats, setYesterdayStats] = useState<ComparisonStats | null>(null);
  const [sevenDayAvg, setSevenDayAvg] = useState<ComparisonStats | null>(null);
  const [yesterdayCampaignStats, setYesterdayCampaignStats] = useState<Map<string, CampaignSummary>>(new Map());
  const [sevenDayAvgCampaignStats, setSevenDayAvgCampaignStats] = useState<Map<string, CampaignSummary>>(new Map());

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const totalLeads = campaignSummaries.reduce((sum, c) => sum + c.leads, 0);
    const totalAccepted = campaignSummaries.reduce((sum, c) => sum + c.accepted, 0);
    const totalFailed = campaignSummaries.reduce((sum, c) => sum + c.failed, 0);
    const totalRevenue = campaignSummaries.reduce((sum, c) => sum + c.revenue, 0);
    const totalCost = campaignSummaries.reduce((sum, c) => sum + c.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const acceptRate = totalLeads > 0 ? ((totalAccepted / totalLeads) * 100).toFixed(1) : '0';
    
    return {
      campaignsCount: campaignSummaries.length,
      totalLeads,
      totalAccepted,
      totalFailed,
      totalRevenue,
      totalCost,
      totalProfit,
      acceptRate
    };
  }, [campaignSummaries]);

  // Helper to calculate stats from leads array
  const calculateStatsFromLeads = (leads: LeadProsperLead[], divisor: number = 1): ComparisonStats => {
    const campaignSet = new Set(leads.map(l => l.campaign_id));
    const totalLeads = leads.length / divisor;
    const totalAccepted = leads.filter(l => l.status.toLowerCase() === 'accepted').length / divisor;
    const totalFailed = leads.filter(l => ['error', 'duplicated', 'rejected', 'failed'].includes(l.status.toLowerCase())).length / divisor;
    const totalRevenue = leads.reduce((sum, l) => sum + (l.revenue || 0), 0) / divisor;
    const totalCost = leads.reduce((sum, l) => sum + (l.cost || 0), 0) / divisor;
    const totalProfit = totalRevenue - totalCost;
    const acceptRate = totalLeads > 0 ? ((totalAccepted / totalLeads) * 100).toFixed(1) : '0';

    return {
      campaignsCount: campaignSet.size,
      totalLeads: Math.round(totalLeads),
      totalAccepted: Math.round(totalAccepted),
      totalFailed: Math.round(totalFailed),
      totalRevenue,
      totalCost,
      totalProfit,
      acceptRate
    };
  };

  // Helper to aggregate leads by campaign into a Map
  const aggregateLeadsByCampaign = (leads: LeadProsperLead[], divisor: number = 1): Map<string, CampaignSummary> => {
    const campaignMap = new Map<string, CampaignSummary>();

    leads.forEach(lead => {
      const key = lead.campaign_id;
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          campaign_name: lead.campaign_name,
          campaign_id: lead.campaign_id,
          leads: 0,
          accepted: 0,
          failed: 0,
          profit: 0,
          revenue: 0,
          cost: 0
        });
      }

      const summary = campaignMap.get(key)!;
      summary.leads += 1;
      summary.revenue += lead.revenue || 0;
      summary.cost += lead.cost || 0;
      
      if (lead.status.toLowerCase() === 'accepted') {
        summary.accepted += 1;
      }
      
      if (['error', 'duplicated', 'rejected', 'failed'].includes(lead.status.toLowerCase())) {
        summary.failed += 1;
      }
      
      summary.profit += (lead.revenue - lead.cost);
    });

    // Apply divisor for averaging
    if (divisor !== 1) {
      campaignMap.forEach((summary) => {
        summary.leads = Math.round(summary.leads / divisor);
        summary.accepted = Math.round(summary.accepted / divisor);
        summary.failed = Math.round(summary.failed / divisor);
        summary.revenue = summary.revenue / divisor;
        summary.cost = summary.cost / divisor;
        summary.profit = summary.profit / divisor;
      });
    }

    return campaignMap;
  };

  // Fetch comparison data (yesterday and 7-day avg)
  const fetchComparisonData = async () => {
    const today = new Date();
    const yesterday = format(subDays(today, 1), 'yyyy-MM-dd');
    const sevenDaysAgo = format(subDays(today, 7), 'yyyy-MM-dd');

    try {
      // Fetch yesterday's data
      const { data: yesterdayData } = await supabase
        .from("leadprosper_leads")
        .select("*")
        .eq("date", yesterday);

      if (yesterdayData) {
        setYesterdayStats(calculateStatsFromLeads(yesterdayData));
        setYesterdayCampaignStats(aggregateLeadsByCampaign(yesterdayData));
      }

      // Fetch last 7 days data (excluding today)
      const { data: sevenDayData } = await supabase
        .from("leadprosper_leads")
        .select("*")
        .gte("date", sevenDaysAgo)
        .lt("date", format(today, 'yyyy-MM-dd'));

      if (sevenDayData && sevenDayData.length > 0) {
        setSevenDayAvg(calculateStatsFromLeads(sevenDayData, 7));
        setSevenDayAvgCampaignStats(aggregateLeadsByCampaign(sevenDayData, 7));
      }
    } catch (e) {
      console.error("Error fetching comparison data", e);
    }
  };

  const aggregateCampaignData = (leads: LeadProsperLead[]): CampaignSummary[] => {
    const campaignMap = new Map<string, CampaignSummary>();

    leads.forEach(lead => {
      const key = lead.campaign_id;
      if (!campaignMap.has(key)) {
        campaignMap.set(key, {
          campaign_name: lead.campaign_name,
          campaign_id: lead.campaign_id,
          leads: 0,
          accepted: 0,
          failed: 0,
          profit: 0,
          revenue: 0,
          cost: 0
        });
      }

      const summary = campaignMap.get(key)!;
      summary.leads += 1;
      summary.revenue += lead.revenue || 0;
      summary.cost += lead.cost || 0;
      
      // Count accepted leads based on actual LeadProsper status
      if (lead.status.toLowerCase() === 'accepted') {
        summary.accepted += 1;
      }
      
      // Count failed leads (error, duplicated, rejected, failed statuses)
      if (['error', 'duplicated', 'rejected', 'failed'].includes(lead.status.toLowerCase())) {
        summary.failed += 1;
      }
      
      // Add to profit calculation
      summary.profit += (lead.revenue - lead.cost);
    });

    return Array.from(campaignMap.values()).sort((a, b) => {
      if (sortField === 'leads') return sortDirection === 'desc' ? b.leads - a.leads : a.leads - b.leads;
      if (sortField === 'accepted') return sortDirection === 'desc' ? b.accepted - a.accepted : a.accepted - b.accepted;
      if (sortField === 'failed') return sortDirection === 'desc' ? b.failed - a.failed : a.failed - b.failed;
      if (sortField === 'profit') return sortDirection === 'desc' ? b.profit - a.profit : a.profit - b.profit;
      if (sortField === 'campaign_name') return sortDirection === 'desc' ? b.campaign_name.localeCompare(a.campaign_name) : a.campaign_name.localeCompare(b.campaign_name);
      return 0;
    });
  };

  const fetchLeadProsperData = async () => {
    if (!dateRange?.startDate || !dateRange?.endDate) return;
    setLpLoading(true);
    try {
      const { data, error } = await supabase
        .from("leadprosper_leads")
        .select("*")
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate);

      if (error) throw error;
      setLpLeads(data || []);
      
      // Aggregate data by campaign
      const summaries = aggregateCampaignData(data || []);
      setCampaignSummaries(summaries);
    } catch (e) {
      console.error("Error loading LeadProsper data", e);
      toast.error("Failed to load LeadProsper data");
    } finally {
      setLpLoading(false);
    }
  };

  const syncLeadProsperData = async (type: 'today' | 'historical' = 'today') => {
    setLpSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('leadprosper-sync', {
        body: { type }
      });

      if (error) throw error;

      toast.success(`LeadProsper ${type} sync completed - ${data.processed} leads processed from ${data.campaigns_processed || 'multiple'} campaigns`);
      setLastSyncTime(new Date());
      
      // Refresh the data after sync
      await fetchLeadProsperData();
    } catch (e) {
      console.error("Error syncing LeadProsper data", e);
      toast.error(`Failed to sync LeadProsper ${type} data`);
    } finally {
      setLpSyncing(false);
    }
  };

  const handleSort = (field: keyof CampaignSummary) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Real-time subscription for leadprosper_leads
  useEffect(() => {
    if (!isRealtime) return;

    console.log('Setting up real-time subscription for leadprosper_leads');
    
    const channel = supabase
      .channel('leadprosper-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'leadprosper_leads'
        },
        (payload) => {
          console.log('Real-time update received:', payload);
          // Refresh data when changes occur
          fetchLeadProsperData();
          setLastSyncTime(new Date());
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          toast.success('Real-time updates enabled', { duration: 2000 });
        }
      });

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(channel);
    };
  }, [isRealtime, dateRange.startDate, dateRange.endDate]);

  // Initial data fetch
  useEffect(() => {
    fetchLeadProsperData();
    fetchComparisonData();
  }, [dateRange.startDate, dateRange.endDate]);

  // Re-aggregate data when sort changes (no need to re-fetch)
  useEffect(() => {
    if (lpLeads.length > 0) {
      const sortedSummaries = aggregateCampaignData(lpLeads);
      setCampaignSummaries(sortedSummaries);
    }
  }, [sortField, sortDirection]);

  const getSortIcon = (field: keyof CampaignSummary) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Helper to render comparison indicator for summary cards
  const renderComparison = (current: number, yesterday: number | undefined, avg: number | undefined, isCurrency: boolean = false) => {
    const getChangeIndicator = (current: number, compare: number | undefined, label: string) => {
      if (compare === undefined || compare === 0) return null;
      const diff = current - compare;
      const pctChange = ((diff / compare) * 100).toFixed(0);
      const isPositive = diff > 0;
      const isNegative = diff < 0;
      
      return (
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-muted-foreground">{label}:</span>
          {isPositive && <TrendingUp className="h-3 w-3 text-green-500" />}
          {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
          {!isPositive && !isNegative && <Minus className="h-3 w-3 text-muted-foreground" />}
          <span className={isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}>
            {isPositive ? '+' : ''}{pctChange}%
          </span>
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-0.5 mt-1">
        {getChangeIndicator(current, yesterday, 'vs Yest')}
        {getChangeIndicator(current, avg, 'vs 7d Avg')}
      </div>
    );
  };

  // Helper to render comparison for campaign table rows (inverted logic for "failed" column)
  const renderCampaignComparison = (current: number, yesterday: number | undefined, avg: number | undefined, invertColors: boolean = false) => {
    const getIndicator = (current: number, compare: number | undefined, label: string) => {
      if (compare === undefined || compare === 0) return null;
      const diff = current - compare;
      const pctChange = ((diff / compare) * 100).toFixed(0);
      const isPositive = diff > 0;
      const isNegative = diff < 0;
      
      // For failed column, lower is better (invert colors)
      const positiveColor = invertColors ? 'text-red-500' : 'text-green-500';
      const negativeColor = invertColors ? 'text-green-500' : 'text-red-500';
      const positiveTextColor = invertColors ? 'text-red-600' : 'text-green-600';
      const negativeTextColor = invertColors ? 'text-green-600' : 'text-red-600';
      
      return (
        <div className="flex items-center justify-end gap-1 text-[10px]">
          <span className="text-muted-foreground">{label}:</span>
          {isPositive && <TrendingUp className={`h-3 w-3 ${positiveColor}`} />}
          {isNegative && <TrendingDown className={`h-3 w-3 ${negativeColor}`} />}
          {!isPositive && !isNegative && <Minus className="h-3 w-3 text-muted-foreground" />}
          <span className={isPositive ? positiveTextColor : isNegative ? negativeTextColor : 'text-muted-foreground'}>
            {isPositive ? '+' : ''}{pctChange}%
          </span>
        </div>
      );
    };

    return (
      <div className="flex flex-col gap-0.5 mt-1">
        {getIndicator(current, yesterday, 'Yest')}
        {getIndicator(current, avg, '7d')}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Campaigns</span>
            </div>
            <p className="text-3xl font-bold">{summaryStats.campaignsCount}</p>
            {renderComparison(summaryStats.campaignsCount, yesterdayStats?.campaignsCount, sevenDayAvg?.campaignsCount)}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Total Leads</span>
            </div>
            <p className="text-3xl font-bold">{summaryStats.totalLeads.toLocaleString()}</p>
            {renderComparison(summaryStats.totalLeads, yesterdayStats?.totalLeads, sevenDayAvg?.totalLeads)}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Accepted</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{summaryStats.totalAccepted.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mb-1">{summaryStats.acceptRate}% rate</p>
            {renderComparison(summaryStats.totalAccepted, yesterdayStats?.totalAccepted, sevenDayAvg?.totalAccepted)}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-red-500" />
              <span className="text-xs font-medium text-muted-foreground">Failed</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{summaryStats.totalFailed.toLocaleString()}</p>
            {renderComparison(summaryStats.totalFailed, yesterdayStats?.totalFailed, sevenDayAvg?.totalFailed)}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-medium text-muted-foreground">Revenue</span>
            </div>
            <p className="text-3xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</p>
            {renderComparison(summaryStats.totalRevenue, yesterdayStats?.totalRevenue, sevenDayAvg?.totalRevenue, true)}
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${summaryStats.totalProfit >= 0 ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'}`}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`h-4 w-4 ${summaryStats.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
              <span className="text-xs font-medium text-muted-foreground">Profit</span>
            </div>
            <p className={`text-3xl font-bold ${summaryStats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(summaryStats.totalProfit)}
            </p>
            {renderComparison(summaryStats.totalProfit, yesterdayStats?.totalProfit, sevenDayAvg?.totalProfit, true)}
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-md font-medium">LeadProsper Leads</CardTitle>
              {isRealtime && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                  <Zap className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Button
                variant={isRealtime ? "default" : "outline"}
                size="sm"
                onClick={() => setIsRealtime(!isRealtime)}
                className="gap-1"
              >
                <Zap className={`h-4 w-4 ${isRealtime ? 'text-yellow-300' : ''}`} />
                {isRealtime ? 'Live' : 'Paused'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncLeadProsperData('today')}
                disabled={lpSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${lpSyncing ? 'animate-spin' : ''}`} />
                Sync Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncLeadProsperData('historical')}
                disabled={lpSyncing}
              >
                <Download className="h-4 w-4 mr-2" />
                Sync Historical
              </Button>
            </div>
          </div>
          {lastSyncTime && (
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {lastSyncTime.toLocaleTimeString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {lpLoading || lpSyncing ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaignSummaries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <p>No LeadProsper campaigns found</p>
              <p className="text-sm mt-2">Click "Sync Historical" to load past data</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none"
                      onClick={() => handleSort('campaign_name')}
                    >
                      Campaign {getSortIcon('campaign_name')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer select-none"
                      onClick={() => handleSort('leads')}
                    >
                      Leads {getSortIcon('leads')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer select-none"
                      onClick={() => handleSort('accepted')}
                    >
                      Accepted {getSortIcon('accepted')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer select-none"
                      onClick={() => handleSort('failed')}
                    >
                      Failed {getSortIcon('failed')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer select-none"
                      onClick={() => handleSort('profit')}
                    >
                      Profit {getSortIcon('profit')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignSummaries.map((campaign, index) => {
                    const profitClass = campaign.profit > 0 ? "text-green-600" : (campaign.profit < 0 ? "text-red-600" : "text-muted-foreground");
                    const yesterdayCampaign = yesterdayCampaignStats.get(campaign.campaign_id);
                    const sevenDayAvgCampaign = sevenDayAvgCampaignStats.get(campaign.campaign_id);
                    
                    return (
                      <TableRow key={campaign.campaign_id} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">{campaign.campaign_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="text-lg font-bold">{campaign.leads}</div>
                          {renderCampaignComparison(campaign.leads, yesterdayCampaign?.leads, sevenDayAvgCampaign?.leads)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-lg font-bold text-green-600">{campaign.accepted}</div>
                          {renderCampaignComparison(campaign.accepted, yesterdayCampaign?.accepted, sevenDayAvgCampaign?.accepted)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-lg font-bold text-red-600">{campaign.failed}</div>
                          {renderCampaignComparison(campaign.failed, yesterdayCampaign?.failed, sevenDayAvgCampaign?.failed, true)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={`text-lg font-bold ${profitClass}`}>
                            {formatCurrency(campaign.profit)}
                          </div>
                          {renderCampaignComparison(campaign.profit, yesterdayCampaign?.profit, sevenDayAvgCampaign?.profit)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadsTab;