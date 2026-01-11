import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCampaign } from "@/contexts/CampaignContext";
import { format, parseISO, eachDayOfInterval, subDays } from "date-fns";
import { formatCurrency } from "@/utils/campaignUtils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
  ReferenceLine,
} from "recharts";
import { TrendingUp, Target, CheckCircle2, XCircle, Pencil, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LeadData {
  date: string;
  leads: number;
  adSpend: number;
  costPerLead: number;
  trailing7DayLeads: number;
  trailing7DayTarget: number;
}

interface CampaignLeadData {
  campaignId: string;
  campaignName: string;
  data: LeadData[];
  totalLeads: number;
  totalSpend: number;
  avgCostPerLead: number;
  targetLeadsPerDay: number;
  weeklyTarget: number;
  trailing7DayActual: number;
}

const DailyLeadCostsTab: React.FC = () => {
  const { dateRange, campaigns } = useCampaign();
  const [campaignData, setCampaignData] = useState<CampaignLeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleEditStart = (campaignId: string, currentValue: number) => {
    setEditingCampaignId(campaignId);
    setEditValue(currentValue.toString());
  };

  const handleEditCancel = () => {
    setEditingCampaignId(null);
    setEditValue("");
  };

  const handleEditSave = async (campaignId: string) => {
    setSaving(true);
    try {
      const numericValue = parseInt(editValue) || 0;
      
      // Use upsert to handle both insert and update cases
      const { error } = await supabase
        .from("campaign_targets")
        .upsert(
          { campaign_id: campaignId, target_leads_per_day: numericValue },
          { onConflict: "campaign_id" }
        );

      if (error) throw error;

      // Update local state
      setCampaignData(prev => prev.map(c => 
        c.campaignId === campaignId 
          ? { ...c, targetLeadsPerDay: numericValue, weeklyTarget: numericValue * 7 }
          : c
      ));
      
      toast.success("Lead cap updated");
      setEditingCampaignId(null);
      setEditValue("");
    } catch (error) {
      console.error("Error saving lead cap:", error);
      toast.error("Failed to save lead cap");
    } finally {
      setSaving(false);
    }
  };
  // Generate all dates in range
  const allDates = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) return [];
    return eachDayOfInterval({
      start: parseISO(dateRange.startDate),
      end: parseISO(dateRange.endDate),
    }).map((d) => format(d, "yyyy-MM-dd"));
  }, [dateRange]);

  useEffect(() => {
    const fetchLeadData = async () => {
      if (!dateRange?.startDate || !dateRange?.endDate) {
        setCampaignData([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Fetch targets first
        const { data: targetsData } = await supabase
          .from("campaign_targets")
          .select("campaign_id, target_leads_per_day");

        const campaignTargets = new Map<string, number>();
        if (targetsData) {
          targetsData.forEach((t) => {
            if (t.target_leads_per_day && t.target_leads_per_day > 0) {
              campaignTargets.set(t.campaign_id, t.target_leads_per_day);
            }
          });
        }

        // Fetch from campaign_stats_history which has ad_spend and leads
        const { data: stats, error } = await supabase
          .from("campaign_stats_history")
          .select("campaign_id, date, leads, ad_spend")
          .gte("date", dateRange.startDate)
          .lte("date", dateRange.endDate);

        if (error) {
          console.error("Error fetching stats data:", error);
          setLoading(false);
          return;
        }

        // Create a map of campaign IDs to names
        const campaignNameMap = new Map<string, string>();
        campaigns.forEach((c) => {
          campaignNameMap.set(c.id, c.name);
        });

        // Group by campaign
        const campaignMap = new Map<
          string,
          { name: string; byDate: Map<string, { leads: number; adSpend: number }> }
        >();

        for (const stat of stats || []) {
          const cId = stat.campaign_id;
          if (!campaignMap.has(cId)) {
            campaignMap.set(cId, {
              name: campaignNameMap.get(cId) || cId,
              byDate: new Map(),
            });
          }

          const campaign = campaignMap.get(cId)!;
          const existing = campaign.byDate.get(stat.date) || { leads: 0, adSpend: 0 };
          existing.leads += stat.leads || 0;
          existing.adSpend += stat.ad_spend || 0;
          campaign.byDate.set(stat.date, existing);
        }

        // Build result for each campaign
        const results: CampaignLeadData[] = [];

        campaignMap.forEach((value, campaignId) => {
          const targetPerDay = campaignTargets.get(campaignId) || 0;
          const weeklyTarget = targetPerDay * 7;

          // First pass: get leads data
          const leadsByDate: { date: string; leads: number; adSpend: number }[] = allDates.map((date) => {
            const dayData = value.byDate.get(date) || { leads: 0, adSpend: 0 };
            return {
              date,
              leads: dayData.leads,
              adSpend: dayData.adSpend,
            };
          });

          // Second pass: calculate trailing 7-day totals
          const data: LeadData[] = leadsByDate.map((day, index) => {
            // Calculate trailing 7 days (including current day)
            let trailing7DayLeads = 0;
            for (let i = Math.max(0, index - 6); i <= index; i++) {
              trailing7DayLeads += leadsByDate[i].leads;
            }

            return {
              date: day.date,
              leads: day.leads,
              adSpend: day.adSpend,
              costPerLead: day.leads > 0 ? day.adSpend / day.leads : 0,
              trailing7DayLeads,
              trailing7DayTarget: weeklyTarget,
            };
          });

          const totalLeads = data.reduce((sum, d) => sum + d.leads, 0);
          const totalSpend = data.reduce((sum, d) => sum + d.adSpend, 0);

          // Get the last day's trailing 7-day actual
          const trailing7DayActual = data.length > 0 ? data[data.length - 1].trailing7DayLeads : 0;

          results.push({
            campaignId,
            campaignName: value.name,
            data,
            totalLeads,
            totalSpend,
            avgCostPerLead: totalLeads > 0 ? totalSpend / totalLeads : 0,
            targetLeadsPerDay: targetPerDay,
            weeklyTarget,
            trailing7DayActual,
          });
        });

        // Sort by total leads descending
        results.sort((a, b) => b.totalLeads - a.totalLeads);

        setCampaignData(results);
      } catch (e) {
        console.error("Error in fetchLeadData:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadData();
  }, [dateRange, allDates, campaigns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-2 animate-pulse" />
          <p className="text-lg">Loading daily lead data...</p>
        </div>
      </div>
    );
  }

  if (campaignData.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-lg text-muted-foreground">
            No lead data available for the selected date range.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Daily Lead Costs by Campaign</h2>
        <p className="text-lg text-muted-foreground">
          {dateRange?.startDate && dateRange?.endDate
            ? `${format(parseISO(dateRange.startDate), "MMM d, yyyy")} - ${format(
                parseISO(dateRange.endDate),
                "MMM d, yyyy"
              )}`
            : "Select a date range"}
        </p>
      </div>

      {campaignData.map((campaign) => {
        const hasTarget = campaign.targetLeadsPerDay > 0;
        const weeklyHit = hasTarget && campaign.trailing7DayActual >= campaign.weeklyTarget;
        const weeklyPercentage = hasTarget ? Math.round((campaign.trailing7DayActual / campaign.weeklyTarget) * 100) : 0;
        
        return (
          <Card key={campaign.campaignId} className="shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <CardTitle className="text-xl font-semibold">
                    {campaign.campaignName}
                  </CardTitle>
                  {editingCampaignId === campaign.campaignId ? (
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <Input
                        type="number"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 h-8 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSave(campaign.campaignId);
                          if (e.key === "Escape") handleEditCancel();
                        }}
                      />
                      <span className="text-sm text-muted-foreground">/day</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7" 
                        onClick={() => handleEditSave(campaign.campaignId)}
                        disabled={saving}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-7 w-7" 
                        onClick={handleEditCancel}
                        disabled={saving}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEditStart(campaign.campaignId, campaign.targetLeadsPerDay)}
                      className="flex items-center gap-1 text-sm bg-primary/10 text-primary px-2 py-1 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      <Target className="h-3.5 w-3.5" />
                      <span>{campaign.targetLeadsPerDay > 0 ? `${campaign.targetLeadsPerDay}/day` : "Set cap"}</span>
                      <Pencil className="h-3 w-3 ml-1 opacity-70" />
                    </button>
                  )}
                  {hasTarget && editingCampaignId !== campaign.campaignId && (
                    <Badge 
                      variant={weeklyHit ? "default" : "destructive"}
                      className="flex items-center gap-1"
                    >
                      {weeklyHit ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                      <span>
                        7-Day: {campaign.trailing7DayActual}/{campaign.weeklyTarget} ({weeklyPercentage}%)
                      </span>
                    </Badge>
                  )}
                </div>
                <div className="flex gap-6 text-base">
                  <div>
                    <span className="text-muted-foreground">Total Leads: </span>
                    <span className="font-bold text-lg">{campaign.totalLeads}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Spend: </span>
                    <span className="font-bold text-lg">{formatCurrency(campaign.totalSpend)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Avg CPL: </span>
                    <span className="font-bold text-lg">{formatCurrency(campaign.avgCostPerLead)}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Leads Chart with Target Line and Trailing 7-Day */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Daily Leads</h4>
                  {hasTarget && (
                    <div className="text-xs text-muted-foreground">
                      Dashed line = daily target ({campaign.targetLeadsPerDay})
                    </div>
                  )}
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={campaign.data} margin={{ top: 25, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => format(parseISO(val), "MMM d")}
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tickFormatter={(val) => val.toFixed(0)}
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                        domain={[0, "auto"]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload as LeadData;
                          const isAboveTarget = hasTarget && data.leads >= campaign.targetLeadsPerDay;
                          const isWeeklyAboveTarget = hasTarget && data.trailing7DayLeads >= campaign.weeklyTarget;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-4 shadow-lg">
                              <p className="font-semibold text-lg mb-3">
                                {format(parseISO(data.date), "EEE, MMM d")}
                              </p>
                              <div className="space-y-2 text-base">
                                <p>
                                  <span className="text-muted-foreground">Daily Leads: </span>
                                  <span className={`font-bold text-lg ${isAboveTarget ? 'text-green-500' : hasTarget ? 'text-red-500' : ''}`}>
                                    {data.leads}
                                  </span>
                                  {hasTarget && (
                                    <span className="text-muted-foreground text-sm ml-1">
                                      / {campaign.targetLeadsPerDay}
                                    </span>
                                  )}
                                </p>
                                {hasTarget && (
                                  <p>
                                    <span className="text-muted-foreground">Trailing 7-Day: </span>
                                    <span className={`font-bold text-lg ${isWeeklyAboveTarget ? 'text-green-500' : 'text-red-500'}`}>
                                      {data.trailing7DayLeads}
                                    </span>
                                    <span className="text-muted-foreground text-sm ml-1">
                                      / {campaign.weeklyTarget} ({Math.round((data.trailing7DayLeads / campaign.weeklyTarget) * 100)}%)
                                    </span>
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        }}
                      />
                      {hasTarget && (
                        <ReferenceLine
                          y={campaign.targetLeadsPerDay}
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          strokeDasharray="8 4"
                        />
                      )}
                      <Line
                        type="monotone"
                        dataKey="leads"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ r: 5, fill: "hsl(var(--chart-2))", strokeWidth: 0 }}
                        activeDot={{ r: 7 }}
                        connectNulls={false}
                      >
                        <LabelList
                          dataKey="leads"
                          position="top"
                          offset={8}
                          formatter={(value: number) => value > 0 ? value : ""}
                          style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Trailing 7-Day Chart - only show if target exists */}
              {hasTarget && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Trailing 7-Day Leads vs Weekly Target</h4>
                    <div className="text-xs text-muted-foreground">
                      Target: {campaign.weeklyTarget} leads/week
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={campaign.data} margin={{ top: 25, right: 30, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(val) => format(parseISO(val), "MMM d")}
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                        />
                        <YAxis
                          tickFormatter={(val) => val.toFixed(0)}
                          tick={{ fontSize: 12 }}
                          className="text-muted-foreground"
                          domain={[0, "auto"]}
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const data = payload[0].payload as LeadData;
                            const percentage = Math.round((data.trailing7DayLeads / campaign.weeklyTarget) * 100);
                            const isHit = data.trailing7DayLeads >= campaign.weeklyTarget;
                            return (
                              <div className="bg-popover border border-border rounded-lg p-4 shadow-lg">
                                <p className="font-semibold text-lg mb-3">
                                  Week ending {format(parseISO(data.date), "MMM d")}
                                </p>
                                <div className="space-y-2 text-base">
                                  <p>
                                    <span className="text-muted-foreground">7-Day Leads: </span>
                                    <span className={`font-bold text-lg ${isHit ? 'text-green-500' : 'text-red-500'}`}>
                                      {data.trailing7DayLeads}
                                    </span>
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">Weekly Target: </span>
                                    <span className="font-bold text-lg">{campaign.weeklyTarget}</span>
                                  </p>
                                  <p>
                                    <span className="text-muted-foreground">Progress: </span>
                                    <span className={`font-bold text-lg ${isHit ? 'text-green-500' : 'text-red-500'}`}>
                                      {percentage}%
                                    </span>
                                  </p>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine
                          y={campaign.weeklyTarget}
                          stroke="hsl(var(--destructive))"
                          strokeWidth={2}
                          strokeDasharray="8 4"
                          label={{
                            value: `Weekly Target: ${campaign.weeklyTarget}`,
                            position: "insideTopRight",
                            fill: "hsl(var(--destructive))",
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="trailing7DayLeads"
                          stroke="hsl(var(--chart-4))"
                          strokeWidth={2}
                          dot={{ r: 4, fill: "hsl(var(--chart-4))", strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                          connectNulls={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Cost Per Lead Chart */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Cost Per Lead</h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={campaign.data} margin={{ top: 25, right: 30, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(val) => format(parseISO(val), "MMM d")}
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                      />
                      <YAxis
                        tickFormatter={(val) => `$${val.toFixed(0)}`}
                        tick={{ fontSize: 12 }}
                        className="text-muted-foreground"
                        domain={[0, "auto"]}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const data = payload[0].payload as LeadData;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-4 shadow-lg">
                              <p className="font-semibold text-lg mb-3">
                                {format(parseISO(data.date), "EEE, MMM d")}
                              </p>
                              <div className="space-y-2 text-base">
                                <p>
                                  <span className="text-muted-foreground">Leads: </span>
                                  <span className="font-bold text-lg">{data.leads}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Lead Cost: </span>
                                  <span className="font-bold text-lg">{formatCurrency(data.costPerLead)}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Spend: </span>
                                  <span className="font-bold text-lg">{formatCurrency(data.adSpend)}</span>
                                </p>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="costPerLead"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 0 }}
                        activeDot={{ r: 7 }}
                        connectNulls={false}
                      >
                        <LabelList
                          dataKey="costPerLead"
                          position="top"
                          offset={8}
                          formatter={(value: number) => value > 0 ? `$${value.toFixed(0)}` : ""}
                          style={{ fontSize: 11, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                        />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DailyLeadCostsTab;
