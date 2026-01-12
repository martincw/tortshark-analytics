import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Download, TrendingUp, TrendingDown, Users, DollarSign, BarChart3, Zap, Minus, Target, Clock } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/campaignUtils";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { addDays, format, parseISO, subDays, isToday, isSameDay } from "date-fns";

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
  targetLeadsPerDay?: number;
  tsCampaignId?: string;
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

interface CampaignTargetMapping {
  lpCampaignId: string;
  tsCampaignId: string;
  targetLeadsPerDay: number;
}

const LeadsTab: React.FC = () => {
  const { dateRange, campaigns } = useCampaign();
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
  const [campaignTargetMappings, setCampaignTargetMappings] = useState<Map<string, CampaignTargetMapping>>(new Map());
  const [nameBasedTargets, setNameBasedTargets] = useState<Map<string, { campaignId: string; target: number }>>(new Map());

  // Check if viewing a single day (for target progress display)
  const isViewingSingleDay = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) return false;
    return dateRange.startDate === dateRange.endDate;
  }, [dateRange]);

  // Fetch LP to TS campaign mappings and targets
  const fetchCampaignTargets = async () => {
    try {
      // Get external LP campaigns (maps LP numeric ID to UUID and has name)
      const { data: externalCampaigns, error: externalError } = await supabase
        .from('external_lp_campaigns')
        .select('id, lp_campaign_id, name');

      if (externalError) throw externalError;

      // Create map from LP numeric ID (string) to external UUID
      const lpNumericToUuid = new Map<string, string>();
      const lpNumericToName = new Map<string, string>();
      externalCampaigns?.forEach(ec => {
        lpNumericToUuid.set(ec.lp_campaign_id.toString(), ec.id);
        lpNumericToName.set(ec.lp_campaign_id.toString(), ec.name);
      });

      // Get LP to TS mappings (uses external UUID)
      const { data: mappings, error: mappingsError } = await supabase
        .from('lp_to_ts_map')
        .select('lp_campaign_id, ts_campaign_id, active')
        .eq('active', true);

      if (mappingsError) throw mappingsError;

      // Create map from external UUID to TS campaign ID
      const uuidToTsCampaign = new Map<string, string>();
      mappings?.forEach(m => {
        uuidToTsCampaign.set(m.lp_campaign_id, m.ts_campaign_id);
      });

      // Get targets for all campaigns WITH campaign names
      const { data: targets, error: targetsError } = await supabase
        .from('campaign_targets')
        .select('campaign_id, target_leads_per_day, campaigns(name)');

      if (targetsError) throw targetsError;

      // Create maps for ts_campaign_id -> target and campaign_name -> target
      const targetMap = new Map<string, number>();
      const nameToTarget = new Map<string, { campaignId: string; target: number }>();
      targets?.forEach(t => {
        if (t.target_leads_per_day && t.target_leads_per_day > 0) {
          targetMap.set(t.campaign_id, t.target_leads_per_day);
          // Store by normalized name for fallback matching
          const campaignName = (t.campaigns as any)?.name;
          if (campaignName) {
            nameToTarget.set(normalizeNameForMatching(campaignName), {
              campaignId: t.campaign_id,
              target: t.target_leads_per_day
            });
          }
        }
      });

      // Create mapping from LP numeric campaign ID (as string) to targets
      const mappingResult = new Map<string, CampaignTargetMapping>();
      
      // First try: use explicit lp_to_ts_map mappings
      lpNumericToUuid.forEach((uuid, lpNumericId) => {
        const tsCampaignId = uuidToTsCampaign.get(uuid);
        if (tsCampaignId) {
          const target = targetMap.get(tsCampaignId);
          if (target) {
            mappingResult.set(lpNumericId, {
              lpCampaignId: lpNumericId,
              tsCampaignId: tsCampaignId,
              targetLeadsPerDay: target
            });
          }
        }
      });

      // Second try: for unmapped campaigns, try to match by name
      lpNumericToName.forEach((lpName, lpNumericId) => {
        if (!mappingResult.has(lpNumericId)) {
          const normalizedLpName = normalizeNameForMatching(lpName);
          // Try exact match first
          let match = nameToTarget.get(normalizedLpName);
          
          // Try partial matching if no exact match
          if (!match) {
            for (const [targetName, targetData] of nameToTarget.entries()) {
              if (normalizedLpName.includes(targetName) || targetName.includes(normalizedLpName)) {
                match = targetData;
                break;
              }
            }
          }
          
          if (match) {
            mappingResult.set(lpNumericId, {
              lpCampaignId: lpNumericId,
              tsCampaignId: match.campaignId,
              targetLeadsPerDay: match.target
            });
          }
        }
      });

      setCampaignTargetMappings(mappingResult);
      setNameBasedTargets(nameToTarget);
    } catch (e) {
      console.error("Error fetching campaign targets:", e);
    }
  };
  
  // Helper to normalize campaign names for matching
  const normalizeNameForMatching = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s*(internal|youtube|broughton|dqs?|bridge|only)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

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
    // Compare against the currently selected end date (not the user's local "today")
    const referenceDay = dateRange?.endDate;
    if (!referenceDay) return;

    const referenceDate = parseISO(referenceDay);
    const yesterday = format(subDays(referenceDate, 1), "yyyy-MM-dd");
    const sevenDaysStart = format(subDays(referenceDate, 7), "yyyy-MM-dd");

    const trailingDays = Array.from({ length: 7 }, (_, i) =>
      format(addDays(parseISO(sevenDaysStart), i), "yyyy-MM-dd")
    );

    const calculateTrailingAverageStats = (
      leads: LeadProsperLead[],
      days: string[]
    ): ComparisonStats => {
      const byDay = new Map<
        string,
        {
          campaigns: Set<string>;
          leads: number;
          accepted: number;
          failed: number;
          revenue: number;
          cost: number;
        }
      >();

      days.forEach((d) => {
        byDay.set(d, {
          campaigns: new Set(),
          leads: 0,
          accepted: 0,
          failed: 0,
          revenue: 0,
          cost: 0,
        });
      });

      for (const lead of leads) {
        const bucket = byDay.get(lead.date);
        if (!bucket) continue;

        bucket.campaigns.add(lead.campaign_id);
        bucket.leads += 1;

        if (lead.status.toLowerCase() === "accepted") bucket.accepted += 1;
        if (["error", "duplicated", "rejected", "failed"].includes(lead.status.toLowerCase())) {
          bucket.failed += 1;
        }

        bucket.revenue += lead.revenue || 0;
        bucket.cost += lead.cost || 0;
      }

      const divisor = days.length || 1;

      let campaignsCountSum = 0;
      let leadsSum = 0;
      let acceptedSum = 0;
      let failedSum = 0;
      let revenueSum = 0;
      let costSum = 0;

      byDay.forEach((d) => {
        campaignsCountSum += d.campaigns.size;
        leadsSum += d.leads;
        acceptedSum += d.accepted;
        failedSum += d.failed;
        revenueSum += d.revenue;
        costSum += d.cost;
      });

      const totalLeads = leadsSum / divisor;
      const totalAccepted = acceptedSum / divisor;
      const totalFailed = failedSum / divisor;
      const totalRevenue = revenueSum / divisor;
      const totalCost = costSum / divisor;
      const totalProfit = totalRevenue - totalCost;
      const acceptRate = totalLeads > 0 ? ((totalAccepted / totalLeads) * 100).toFixed(1) : "0";

      return {
        campaignsCount: Math.round(campaignsCountSum / divisor),
        totalLeads: Math.round(totalLeads),
        totalAccepted: Math.round(totalAccepted),
        totalFailed: Math.round(totalFailed),
        totalRevenue,
        totalCost,
        totalProfit,
        acceptRate,
      };
    };

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

      // Fetch last 7 full days (excluding the reference day)
      const { data: sevenDayData } = await supabase
        .from("leadprosper_leads")
        .select("*")
        .gte("date", sevenDaysStart)
        .lt("date", referenceDay);

      setSevenDayAvg(calculateTrailingAverageStats(sevenDayData || [], trailingDays));
      setSevenDayAvgCampaignStats(aggregateLeadsByCampaign(sevenDayData || [], 7));
    } catch (e) {
      console.error("Error fetching comparison data", e);
    }
  };

  const aggregateCampaignData = (leads: LeadProsperLead[]): CampaignSummary[] => {
    const campaignMap = new Map<string, CampaignSummary>();

    leads.forEach(lead => {
      const key = lead.campaign_id;
      if (!campaignMap.has(key)) {
        // Try to find target for this LP campaign by ID first
        let targetMapping = campaignTargetMappings.get(lead.campaign_id);
        
        // Fallback: try name-based matching if no explicit mapping found
        if (!targetMapping && nameBasedTargets.size > 0) {
          const normalizedLeadName = normalizeNameForMatching(lead.campaign_name);
          
          // Try exact match
          let nameMatch = nameBasedTargets.get(normalizedLeadName);
          
          // Try partial matching
          if (!nameMatch) {
            for (const [targetName, targetData] of nameBasedTargets.entries()) {
              if (normalizedLeadName.includes(targetName) || targetName.includes(normalizedLeadName)) {
                nameMatch = targetData;
                break;
              }
            }
          }
          
          if (nameMatch) {
            targetMapping = {
              lpCampaignId: lead.campaign_id,
              tsCampaignId: nameMatch.campaignId,
              targetLeadsPerDay: nameMatch.target
            };
          }
        }
        
        campaignMap.set(key, {
          campaign_name: lead.campaign_name,
          campaign_id: lead.campaign_id,
          leads: 0,
          accepted: 0,
          failed: 0,
          profit: 0,
          revenue: 0,
          cost: 0,
          targetLeadsPerDay: targetMapping?.targetLeadsPerDay,
          tsCampaignId: targetMapping?.tsCampaignId
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

  const syncLeadProsperData = async (type: 'today' | 'historical' = 'today', forceRefresh: boolean = false) => {
    setLpSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('leadprosper-sync', {
        body: { type, forceRefresh }
      });

      if (error) throw error;

      const refreshNote = forceRefresh ? ' (fresh data)' : '';
      toast.success(`LeadProsper ${type} sync completed${refreshNote} - ${data.processed} leads processed from ${data.campaigns_processed || 'multiple'} campaigns`);
      setLastSyncTime(new Date());
      
      // Refresh the data after sync
      await fetchLeadProsperData();
      // Also refresh comparison data
      await fetchComparisonData();
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

  // Fetch campaign targets on mount
  useEffect(() => {
    fetchCampaignTargets();
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchLeadProsperData();
    fetchComparisonData();
  }, [dateRange.startDate, dateRange.endDate, campaignTargetMappings, nameBasedTargets]);

  // Re-aggregate data when sort changes or targets update (no need to re-fetch)
  useEffect(() => {
    if (lpLeads.length > 0) {
      const sortedSummaries = aggregateCampaignData(lpLeads);
      setCampaignSummaries(sortedSummaries);
    }
  }, [sortField, sortDirection, nameBasedTargets]);

  const getSortIcon = (field: keyof CampaignSummary) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Helper to render comparison values for summary cards (shows actual values, not percentages)
  const renderComparison = (current: number, yesterday: number | undefined, avg: number | undefined, isCurrency: boolean = false) => {
    const formatVal = (val: number) => isCurrency ? formatCurrency(val) : val.toLocaleString();
    
    return (
      <div className="flex flex-col gap-1 mt-2">
        {yesterday !== undefined && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Yest:</span>
            <span className="font-medium">{formatVal(yesterday)}</span>
          </div>
        )}
        {avg !== undefined && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">7d Avg:</span>
            <span className="font-medium">{formatVal(Math.round(avg))}</span>
          </div>
        )}
      </div>
    );
  };

  // Helper to render comparison for campaign table rows (shows actual values)
  const renderCampaignComparison = (current: number, yesterday: number | undefined, avg: number | undefined, isCurrency: boolean = false) => {
    const formatVal = (val: number) => isCurrency ? formatCurrency(val) : val.toLocaleString();
    
    return (
      <div className="flex flex-col gap-0.5 mt-1 text-xs">
        {yesterday !== undefined && (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-muted-foreground">Yest:</span>
            <span className="font-medium text-muted-foreground">{formatVal(yesterday)}</span>
          </div>
        )}
        {avg !== undefined && (
          <div className="flex items-center justify-end gap-1.5">
            <span className="text-muted-foreground">7d:</span>
            <span className="font-medium text-muted-foreground">{formatVal(Math.round(avg))}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">Campaigns</span>
            </div>
            <p className="text-4xl font-bold">{summaryStats.campaignsCount}</p>
            {renderComparison(summaryStats.campaignsCount, yesterdayStats?.campaignsCount, sevenDayAvg?.campaignsCount)}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-muted-foreground">Total Leads</span>
            </div>
            <p className="text-4xl font-bold">{summaryStats.totalLeads.toLocaleString()}</p>
            {renderComparison(summaryStats.totalLeads, yesterdayStats?.totalLeads, sevenDayAvg?.totalLeads)}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Accepted</span>
            </div>
            <p className="text-4xl font-bold text-green-600">{summaryStats.totalAccepted.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mb-1">{summaryStats.acceptRate}% rate</p>
            {renderComparison(summaryStats.totalAccepted, yesterdayStats?.totalAccepted, sevenDayAvg?.totalAccepted)}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium text-muted-foreground">Failed</span>
            </div>
            <p className="text-4xl font-bold text-red-600">{summaryStats.totalFailed.toLocaleString()}</p>
            {renderComparison(summaryStats.totalFailed, yesterdayStats?.totalFailed, sevenDayAvg?.totalFailed)}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-medium text-muted-foreground">Revenue</span>
            </div>
            <p className="text-4xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</p>
            {renderComparison(summaryStats.totalRevenue, yesterdayStats?.totalRevenue, sevenDayAvg?.totalRevenue, true)}
          </CardContent>
        </Card>

        <Card className={`bg-gradient-to-br ${summaryStats.totalProfit >= 0 ? 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20' : 'from-red-500/10 to-red-500/5 border-red-500/20'}`}>
          <CardContent className="pt-6 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`h-5 w-5 ${summaryStats.totalProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
              <span className="text-sm font-medium text-muted-foreground">Profit</span>
            </div>
            <p className={`text-4xl font-bold ${summaryStats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
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
            <div className="flex gap-2 items-center flex-wrap">
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
                onClick={() => syncLeadProsperData('today', false)}
                disabled={lpSyncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${lpSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => syncLeadProsperData('today', true)}
                disabled={lpSyncing}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${lpSyncing ? 'animate-spin' : ''}`} />
                Force Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncLeadProsperData('historical', true)}
                disabled={lpSyncing}
              >
                <Download className="h-4 w-4 mr-2" />
                Resync All
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
                    <TableHead className="w-12 text-base">#</TableHead>
                    <TableHead 
                      className="cursor-pointer select-none text-base font-semibold"
                      onClick={() => handleSort('campaign_name')}
                    >
                      Campaign {getSortIcon('campaign_name')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer select-none text-base font-semibold"
                      onClick={() => handleSort('leads')}
                    >
                      Leads {getSortIcon('leads')}
                    </TableHead>
                    {isViewingSingleDay && (
                      <TableHead className="text-center text-base font-semibold min-w-[140px]">
                        <div className="flex items-center justify-center gap-1">
                          <Target className="h-4 w-4" />
                          Daily Target
                        </div>
                      </TableHead>
                    )}
                    <TableHead 
                      className="text-right cursor-pointer select-none text-base font-semibold"
                      onClick={() => handleSort('accepted')}
                    >
                      Accepted {getSortIcon('accepted')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer select-none text-base font-semibold"
                      onClick={() => handleSort('failed')}
                    >
                      Failed {getSortIcon('failed')}
                    </TableHead>
                    <TableHead 
                      className="text-right cursor-pointer select-none text-base font-semibold"
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
                        <TableCell className="text-base font-medium text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="text-base font-semibold text-blue-600 hover:text-blue-800 cursor-pointer">{campaign.campaign_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="text-base font-bold">{campaign.leads}</div>
                          {renderCampaignComparison(campaign.leads, yesterdayCampaign?.leads, sevenDayAvgCampaign?.leads)}
                        </TableCell>
                        {isViewingSingleDay && (
                          <TableCell className="text-center">
                            {campaign.targetLeadsPerDay ? (
                              (() => {
                                const now = new Date();
                                const hoursElapsed = now.getHours() + now.getMinutes() / 60;
                                const dayProgress = hoursElapsed / 24; // 0-1 representing how much of day has passed
                                const expectedLeadsNow = Math.round(campaign.targetLeadsPerDay * dayProgress);
                                const actualProgress = (campaign.leads / campaign.targetLeadsPerDay) * 100;
                                const pacingProgress = expectedLeadsNow > 0 
                                  ? Math.min((campaign.leads / expectedLeadsNow) * 100, 150) 
                                  : 100;
                                const isPacing = campaign.leads >= expectedLeadsNow;
                                
                                return (
                                  <div className="space-y-2">
                                    {/* Actual vs Target */}
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className="text-lg font-bold">
                                        {campaign.leads}
                                      </span>
                                      <span className="text-muted-foreground">/</span>
                                      <span className="text-lg font-medium text-muted-foreground">
                                        {campaign.targetLeadsPerDay}
                                      </span>
                                    </div>
                                    
                                    {/* Progress Bar 1: Actual vs Full Day Target */}
                                    <div className="space-y-0.5">
                                      <Progress 
                                        value={Math.min(actualProgress, 100)} 
                                        className={`h-2 ${
                                          actualProgress >= 100 
                                            ? '[&>div]:bg-green-500' 
                                            : actualProgress >= 70 
                                              ? '[&>div]:bg-amber-500' 
                                              : '[&>div]:bg-blue-500'
                                        }`}
                                      />
                                      <div className="text-xs text-muted-foreground">
                                        {Math.round(actualProgress)}% of target
                                      </div>
                                    </div>
                                    
                                    {/* Progress Bar 2: Pacing vs Time of Day */}
                                    <div className="space-y-0.5 pt-1 border-t border-border/50">
                                      <div className="flex items-center gap-1 mb-1">
                                        <Clock className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Pacing</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Progress 
                                          value={Math.min(pacingProgress, 100)} 
                                          className={`h-2 flex-1 ${
                                            pacingProgress >= 100 
                                              ? '[&>div]:bg-green-500' 
                                              : pacingProgress >= 80 
                                                ? '[&>div]:bg-amber-500' 
                                                : '[&>div]:bg-red-500'
                                          }`}
                                        />
                                        {isPacing ? (
                                          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                                        ) : (
                                          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                                        )}
                                      </div>
                                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <span className="font-medium">{campaign.leads}/{expectedLeadsNow}</span>
                                        <span>by {format(now, 'h:mma').toLowerCase()}</span>
                                        <span className={`font-semibold ${isPacing ? 'text-green-600' : 'text-red-600'}`}>
                                          ({Math.round(pacingProgress)}%)
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            ) : (
                              <span className="text-xs text-muted-foreground">No target set</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="text-base font-bold text-green-600">{campaign.accepted}</div>
                          {renderCampaignComparison(campaign.accepted, yesterdayCampaign?.accepted, sevenDayAvgCampaign?.accepted)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-base font-bold text-red-600">{campaign.failed}</div>
                          {renderCampaignComparison(campaign.failed, yesterdayCampaign?.failed, sevenDayAvgCampaign?.failed)}
                        </TableCell>
                        <TableCell className="text-right min-w-[100px]">
                          <div className={`text-base font-bold whitespace-nowrap ${profitClass}`}>
                            {formatCurrency(campaign.profit)}
                          </div>
                          {renderCampaignComparison(campaign.profit, yesterdayCampaign?.profit, sevenDayAvgCampaign?.profit, true)}
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