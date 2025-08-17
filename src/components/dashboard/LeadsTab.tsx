import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Download } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/campaignUtils";
import { toast } from "sonner";

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
          profit: 0
        });
      }

      const summary = campaignMap.get(key)!;
      summary.leads += 1;
      
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
    
    // Re-sort existing data
    const sortedSummaries = aggregateCampaignData(lpLeads);
    setCampaignSummaries(sortedSummaries);
  };

  // Auto-sync today's data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      syncLeadProsperData('today');
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchLeadProsperData();
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

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-md font-medium">LeadProsper Leads</CardTitle>
          <div className="flex gap-2">
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
            Last sync: {lastSyncTime.toLocaleTimeString()}
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
                  const profitClass = campaign.profit > 0 ? "text-green-600 font-semibold" : (campaign.profit < 0 ? "text-red-600 font-semibold" : "text-muted-foreground");
                  return (
                    <TableRow key={campaign.campaign_id} className="hover:bg-muted/50">
                      <TableCell className="font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">{campaign.campaign_name}</TableCell>
                      <TableCell className="text-right font-medium">{campaign.leads}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">{campaign.accepted}</TableCell>
                      <TableCell className="text-right font-semibold text-red-600">{campaign.failed}</TableCell>
                      <TableCell className={`text-right ${profitClass}`}>
                        {formatCurrency(campaign.profit)}
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
  );
};

export default LeadsTab;