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

const LeadsTab: React.FC = () => {
  const { dateRange } = useCampaign();
  const [lpLeads, setLpLeads] = useState<LeadProsperLead[]>([]);
  const [lpLoading, setLpLoading] = useState(false);
  const [lpSyncing, setLpSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [sortField, setSortField] = useState<keyof LeadProsperLead>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const handleSort = (field: keyof LeadProsperLead) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
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
    fetchLeadProsperData();
  }, [dateRange.startDate, dateRange.endDate]);

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
                  <TableHead>Lead ID</TableHead>
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
                      <TableCell className="font-mono text-sm">{lead.lead_id}</TableCell>
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
      </CardContent>
    </Card>
  );
};

export default LeadsTab;