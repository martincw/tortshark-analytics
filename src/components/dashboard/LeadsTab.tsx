import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, Archive } from "lucide-react";
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

const LeadsTab: React.FC = () => {
  const { dateRange, campaigns, selectedCampaignIds, updateCampaign } = useCampaign();
  const [rows, setRows] = useState<AggregatedLeadsRow[]>([]);
  const [loading, setLoading] = useState(false);

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

      // Only campaigns with at least one lead and that exist in our list
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

  useEffect(() => {
    fetchData();
  }, [dateRange.startDate, dateRange.endDate, campaigns, selectedCampaignIds]);

  const handleArchive = async (id: string) => {
    try {
      await updateCampaign(id, { is_active: false });
      toast.success("Campaign archived");
    } catch (e) {
      console.error(e);
      toast.error("Failed to archive campaign");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-md font-medium">Lead Metrics</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
};

export default LeadsTab;