import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Archive, RefreshCw, Download } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatNumber } from "@/utils/campaignUtils";
import { toast } from "sonner";

interface AggregatedLeadsRow {
  ts_campaign_id: string;
  name: string;
  leads: number;
  accepted: number;
  failed: number;
  duplicated: number;
  revenue: number;
  cost: number;
  profit: number;
}

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

const LeadsTab: React.FC = () => {
  const { dateRange, campaigns, selectedCampaignIds, updateCampaign } = useCampaign();
  const [rows, setRows] = useState<AggregatedLeadsRow[]>([]);
  const [lpLeads, setLpLeads] = useState<LeadProsperLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [lpLoading, setLpLoading] = useState(false);
  const [lpSyncing, setLpSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<keyof LeadProsperLead>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const activeSelection = selectedCampaignIds.length > 0 ? new Set(selectedCampaignIds) : null;

  const fetchData = async () => {
    if (!dateRange?.startDate || !dateRange?.endDate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ts_daily_lead_metrics")
        .select("ts_campaign_id, lead_count, accepted, failed, duplicated, revenue, cost, date")
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate);

      if (error) throw error;

      const agg = new Map<string, AggregatedLeadsRow>();
      (data || []).forEach((row: any) => {
        const id = row.ts_campaign_id as string;
        if (!id) return;
        if (activeSelection && !activeSelection.has(id)) return;
        const camp = campaigns.find(c => c.id === id);
        const name = camp?.name || id;
        const current = agg.get(id) || {
          ts_campaign_id: id,
          name,
          leads: 0,
          accepted: 0,
          failed: 0,
          duplicated: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        current.leads += row.lead_count || 0;
        current.accepted += row.accepted || 0;
        current.failed += row.failed || 0;
        current.duplicated += row.duplicated || 0;
        current.revenue += Number(row.revenue || 0);
        current.cost += Number(row.cost || 0);
        current.profit = current.revenue - current.cost;
        agg.set(id, current);
      });

      const result = Array.from(agg.values())
        .filter(r => r.leads > 0 && campaigns.some(c => c.id === r.ts_campaign_id))
        .sort((a, b) => b.leads - a.leads);

      setRows(result);
    } catch (e) {
      console.error("Error loading leads data", e);
      toast.error("Failed to load leads data");
    } finally {
      setLoading(false);
    }
  };

  const fetchLeadProsperData = async () => {
    if (!dateRange?.startDate || !dateRange?.endDate) return;
    setLpLoading(true);
    try {
      const { data, error } = await supabase
        .from("leadprosper_leads")
        .select("*")
        .gte("date", dateRange.startDate)
        .lte("date", dateRange.endDate)
        .order(sortField, { ascending: sortDirection === 'asc' });

      if (error) throw error;
      setLpLeads(data || []);
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

      toast.success(`LeadProsper ${type} sync completed - ${data.processed} leads processed`);
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

  const handleSort = (field: keyof LeadProsperLead) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await updateCampaign(id, { is_active: false });
      toast.success("Campaign archived");
    } catch (e) {
      console.error(e);
      toast.error("Failed to archive campaign");
    }
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
    fetchData();
    fetchLeadProsperData();
  }, [dateRange.startDate, dateRange.endDate, campaigns, selectedCampaignIds]);

  // Re-fetch LeadProsper data when sort changes
  useEffect(() => {
    fetchLeadProsperData();
  }, [sortField, sortDirection]);

  const getSortIcon = (field: keyof LeadProsperLead) => {
    if (field !== sortField) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-md font-medium">Lead Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="internal" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="internal">Internal Metrics</TabsTrigger>
            <TabsTrigger value="leadprosper">LeadProsper</TabsTrigger>
          </TabsList>
          
          <TabsContent value="internal" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                No leads in the selected range
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Accepted</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Duplicated</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(r => {
                      const profitClass = r.profit > 0 ? "text-success-DEFAULT" : (r.profit < 0 ? "text-error-DEFAULT" : "text-muted-foreground");
                      return (
                        <TableRow key={r.ts_campaign_id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="text-right">{formatNumber(r.leads)}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-success-DEFAULT font-medium">{formatNumber(r.accepted)}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="text-error-DEFAULT font-medium">{formatNumber(r.failed)}</span>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(r.duplicated)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(r.cost)}</TableCell>
                          <TableCell className={`text-right font-medium ${profitClass}`}>{formatCurrency(r.profit)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchive(r.ts_campaign_id)}
                              title="Archive"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="leadprosper" className="mt-4">
            <div className="flex justify-between items-center mb-4">
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
              {lastSyncTime && (
                <span className="text-sm text-muted-foreground">
                  Last sync: {lastSyncTime.toLocaleTimeString()}
                </span>
              )}
            </div>

            {lpLoading || lpSyncing ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : lpLeads.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No LeadProsper leads found</p>
                <p className="text-sm mt-2">Click "Sync Historical" to load past data</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('date')}
                      >
                        Date {getSortIcon('date')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('campaign_name')}
                      >
                        Campaign {getSortIcon('campaign_name')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer select-none"
                        onClick={() => handleSort('status')}
                      >
                        Status {getSortIcon('status')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer select-none"
                        onClick={() => handleSort('revenue')}
                      >
                        Revenue {getSortIcon('revenue')}
                      </TableHead>
                      <TableHead 
                        className="text-right cursor-pointer select-none"
                        onClick={() => handleSort('cost')}
                      >
                        Cost {getSortIcon('cost')}
                      </TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lpLeads.map(lead => {
                      const profit = lead.revenue - lead.cost;
                      const profitClass = profit > 0 ? "text-success-DEFAULT" : (profit < 0 ? "text-error-DEFAULT" : "text-muted-foreground");
                      return (
                        <TableRow key={lead.id}>
                          <TableCell>{new Date(lead.date).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{lead.campaign_name}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              lead.status === 'active' ? 'bg-success-DEFAULT/10 text-success-DEFAULT' :
                              lead.status === 'failed' ? 'bg-error-DEFAULT/10 text-error-DEFAULT' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {lead.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(lead.revenue)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(lead.cost)}</TableCell>
                          <TableCell className={`text-right font-medium ${profitClass}`}>
                            {formatCurrency(profit)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LeadsTab;