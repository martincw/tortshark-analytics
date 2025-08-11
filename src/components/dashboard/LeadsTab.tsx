import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Archive, EyeOff, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatNumber } from "@/utils/campaignUtils";
import { format as formatDate, parse, differenceInCalendarDays, subDays, eachDayOfInterval, isWeekend } from "date-fns";

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
  // LeadProsper leaderboard state
  const [lpRows, setLpRows] = useState<AggregatedLeadsRow[]>([]);
  const [prevLpRows, setPrevLpRows] = useState<AggregatedLeadsRow[]>([]);
  const [lwRows, setLwRows] = useState<AggregatedLeadsRow[]>([]);
  const [lpLoading, setLpLoading] = useState(false);
  const [showDQ, setShowDQ] = useState(false);

  // Count weekdays in selected range for Avg/Day (Mon–Fri)
  const weekdaysInRange = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) return 0;
    const startObj = parse(String(dateRange.startDate), 'yyyy-MM-dd', new Date());
    const endObj = parse(String(dateRange.endDate), 'yyyy-MM-dd', new Date());
    const days = eachDayOfInterval({ start: startObj, end: endObj });
    return days.filter(d => !isWeekend(d)).length;
  }, [dateRange.startDate, dateRange.endDate]);

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

// Fetch LeadProsper leaderboard
useEffect(() => {
  const fetchLPData = async () => {
    if (!dateRange?.startDate || !dateRange?.endDate) return;
    setLpLoading(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
      const startStr = String(dateRange.startDate);
      const endStr = String(dateRange.endDate);
      const startObj = parse(startStr, 'yyyy-MM-dd', new Date());
      const endObj = parse(endStr, 'yyyy-MM-dd', new Date());

      // Compute previous period with same length (calendar days)
      const diffDays = Math.max(1, differenceInCalendarDays(endObj, startObj) + 1);
      const prevEndObj = subDays(startObj, 1);
      const prevStartObj = subDays(prevEndObj, diffDays - 1);

      const prevStart = formatDate(prevStartObj, 'yyyy-MM-dd');
      const prevEnd = formatDate(prevEndObj, 'yyyy-MM-dd');
      const lwStr = formatDate(subDays(endObj, 7), 'yyyy-MM-dd'); // Same day last week

      const toAgg = (data: any): AggregatedLeadsRow[] =>
        (data?.campaigns || []).map((c: any) => ({
          ts_campaign_id: String(c.campaign_id),
          name: c.campaign_name,
          leads: Number(c.leads || 0),
          accepted: Number(c.accepted || 0),
          failed: Number(c.failed || 0),
          duplicated: Number(c.duplicated || 0),
          revenue: Number(c.revenue || 0),
          cost: Number(c.cost || 0),
          profit: Number(c.profit || 0),
        }));

      const [currResult, prevResult, lwResult] = await Promise.allSettled([
        supabase.functions.invoke("leadprosper-fetch-leads", {
          body: { startDate: startStr, endDate: endStr, timezone: tz },
        }),
        supabase.functions.invoke("leadprosper-fetch-leads", {
          body: { startDate: prevStart, endDate: prevEnd, timezone: tz },
        }),
        supabase.functions.invoke("leadprosper-fetch-leads", {
          body: { startDate: lwStr, endDate: lwStr, timezone: tz },
        }),
      ]);

      if (currResult.status === 'fulfilled' && !currResult.value.error) {
        const currAgg = toAgg(currResult.value.data);
        currAgg.sort((a, b) => b.leads - a.leads);
        setLpRows(currAgg);
      } else {
        const err = currResult.status === 'rejected' ? currResult.reason : currResult.value.error;
        console.error('LP current fetch error', err);
        toast.error('Failed to load LeadProsper current period');
        setLpRows([]);
      }

      if (prevResult.status === 'fulfilled' && !prevResult.value.error) {
        setPrevLpRows(toAgg(prevResult.value.data));
      } else {
        setPrevLpRows([]);
      }

      if (lwResult.status === 'fulfilled' && !lwResult.value.error) {
        setLwRows(toAgg(lwResult.value.data));
      } else {
        setLwRows([]);
      }
    } catch (e) {
      console.error("Error loading LeadProsper leaderboard", e);
      toast.error("Failed to load LeadProsper leaderboard");
      setLpRows([]);
      setPrevLpRows([]);
    } finally {
      setLpLoading(false);
    }
  };
  fetchLPData();
}, [dateRange.startDate, dateRange.endDate]);

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


return (
  <>

    <Card className="mt-6">
      <CardHeader className="pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="text-md font-medium">LeadProsper Leaderboard</CardTitle>
        <div className="flex items-center gap-2">
          <Checkbox id="show-dq" checked={showDQ} onCheckedChange={(v) => setShowDQ(Boolean(v))} />
          <label htmlFor="show-dq" className="text-sm text-muted-foreground">Show DQ campaigns</label>
        </div>
      </CardHeader>
      <CardContent>
        {lpLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          (() => {
            const filtered = lpRows.filter(r => showDQ || !/dq/i.test(r.name));
            if (filtered.length === 0) {
              return (
                <div className="text-center py-10 text-muted-foreground">
                  No LeadProsper leads in the selected range{!showDQ ? " (DQ campaigns hidden)" : ""}
                </div>
              );
            }
            return (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LP Campaign</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Accepted</TableHead>
                      <TableHead className="text-right">Duplicated</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Same Day LW</TableHead>
                      <TableHead className="text-right">Avg/Day (M–F)</TableHead>
                      <TableHead className="text-right">Δ Leads</TableHead>
                      <TableHead className="text-right">Δ Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(r => {
                      const prev = prevLpRows.find(p => p.ts_campaign_id === r.ts_campaign_id);
                      const lw = lwRows.find(p => p.ts_campaign_id === r.ts_campaign_id);
                      const lwLeads = lw?.leads ?? 0;
                      const avgDay = weekdaysInRange > 0 ? Math.round(r.leads / weekdaysInRange) : r.leads;
                      const deltaLeads = r.leads - (prev?.leads ?? 0);
                      const deltaProfit = r.profit - (prev?.profit ?? 0);
                      const profitClass = r.profit > 0 ? "text-success-DEFAULT" : (r.profit < 0 ? "text-error-DEFAULT" : "text-muted-foreground");
                      return (
                        <TableRow key={r.ts_campaign_id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">LP</Badge>
                              <span className="font-medium">{r.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(r.leads)}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-success-DEFAULT font-medium">{formatNumber(r.accepted)}</span>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(r.duplicated)}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-error-DEFAULT font-medium">{formatNumber(r.failed)}</span>
                          </TableCell>
                          <TableCell className={`text-right font-medium ${profitClass}`}>{formatCurrency(r.profit)}</TableCell>
                          <TableCell className="text-right">{formatNumber(lwLeads)}</TableCell>
                          <TableCell className="text-right">{formatNumber(avgDay)}</TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const delta = deltaLeads;
                              if (!delta) return <span className="text-muted-foreground">0</span>;
                              const positive = delta > 0;
                              const Icon = positive ? ArrowUpRight : ArrowDownRight;
                              const cls = positive ? "text-success-DEFAULT" : "text-error-DEFAULT";
                              return (
                                <span className={`inline-flex items-center gap-1 font-medium ${cls}`}>
                                  <Icon className="h-4 w-4" />
                                  {positive ? `+${delta}` : delta}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            {(() => {
                              const delta = Number(deltaProfit.toFixed(2));
                              if (!delta) return <span className="text-muted-foreground">{formatCurrency(0)}</span>;
                              const positive = delta > 0;
                              const Icon = positive ? ArrowUpRight : ArrowDownRight;
                              const cls = positive ? "text-success-DEFAULT" : "text-error-DEFAULT";
                              return (
                                <span className={`inline-flex items-center gap-1 font-medium ${cls}`}>
                                  <Icon className="h-4 w-4" />
                                  {positive ? 
                                    `+${formatCurrency(delta)}` : 
                                    formatCurrency(delta)
                                  }
                                </span>
                              );
                            })()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            );
          })()
        )}
      </CardContent>
    </Card>
  </>
);
};

export default LeadsTab;
