import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, RefreshCw, Archive, EyeOff } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatNumber } from "@/utils/campaignUtils";
import { leadProsperApi } from "@/integrations/leadprosper/client";
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

const LeadsTab: React.FC = () => {
  const { dateRange, campaigns, selectedCampaignIds, setSelectedCampaignIds, updateCampaign } = useCampaign();
  const [rows, setRows] = useState<AggregatedLeadsRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const activeSelection = selectedCampaignIds.length > 0 ? new Set(selectedCampaignIds) : null;

  const visibleCampaigns = useMemo(() => {
    // Respect current selection; if none selected, allow all
    const base = campaigns.filter(c => c.is_active !== false);
    return activeSelection ? base.filter(c => activeSelection.has(c.id)) : base;
  }, [campaigns, activeSelection]);

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

      // Only campaigns with at least one lead and that exist in our list
      const result = Array.from(agg.values())
        .filter(r => r.leads > 0 && visibleCampaigns.some(c => c.id === r.ts_campaign_id))
        .sort((a, b) => b.leads - a.leads);

      setRows(result);
    } catch (e) {
      console.error("Error loading leads ranking", e);
      toast.error("Failed to load leads ranking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange.startDate, dateRange.endDate, campaigns, selectedCampaignIds]);

  const handleHide = (id: string) => {
    const next = new Set(selectedCampaignIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedCampaignIds(Array.from(next));
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

  const handleRefreshFromLP = async () => {
    setRefreshing(true);
    try {
      const res = await leadProsperApi.fetchLeadsWithDateRange(dateRange.startDate, dateRange.endDate);
      if (res?.success) {
        toast.success("Leads synced from Lead Prosper", {
          description: `${res.total_leads || 0} leads across ${res.campaigns_processed || 0} campaigns`,
        });
        await fetchData();
      } else {
        toast.warning("Sync completed with issues", { description: res?.error || "Unknown error" });
      }
    } catch (e) {
      console.error("LP sync failed", e);
      toast.error("Lead sync failed");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="text-md font-medium">Leads by Campaign</CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshFromLP} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Sync from Lead Prosper
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">No campaigns with leads in the selected range</div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.ts_campaign_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{campaigns.find(c => c.id === r.ts_campaign_id)?.platform || "LP"}</Badge>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(r.leads)}</TableCell>
                    <TableCell className="text-right">
                      <span className="text-success-DEFAULT font-medium">{formatNumber(r.accepted)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-error-DEFAULT font-medium">{formatNumber(r.failed)}</span>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.profit)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleHide(r.ts_campaign_id)}>
                          <EyeOff className="h-4 w-4 mr-2" />
                          {activeSelection?.has(r.ts_campaign_id) ? "Unselect" : "Hide"}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleArchive(r.ts_campaign_id)}>
                          <Archive className="h-4 w-4 mr-2" /> Archive
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadsTab;
