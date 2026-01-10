import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCampaign } from "@/contexts/CampaignContext";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { formatCurrency } from "@/utils/campaignUtils";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ZAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";

interface LeadData {
  date: string;
  leads: number;
  adSpend: number;
  costPerLead: number;
}

interface CampaignLeadData {
  campaignId: string;
  campaignName: string;
  data: LeadData[];
  totalLeads: number;
  totalSpend: number;
  avgCostPerLead: number;
}

const DailyLeadCostsTab: React.FC = () => {
  const { dateRange, campaigns } = useCampaign();
  const [campaignData, setCampaignData] = useState<CampaignLeadData[]>([]);
  const [loading, setLoading] = useState(true);

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
          const data: LeadData[] = allDates.map((date) => {
            const dayData = value.byDate.get(date) || { leads: 0, adSpend: 0 };
            return {
              date,
              leads: dayData.leads,
              adSpend: dayData.adSpend,
              costPerLead: dayData.leads > 0 ? dayData.adSpend / dayData.leads : 0,
            };
          });

          const totalLeads = data.reduce((sum, d) => sum + d.leads, 0);
          const totalSpend = data.reduce((sum, d) => sum + d.adSpend, 0);

          results.push({
            campaignId,
            campaignName: value.name,
            data,
            totalLeads,
            totalSpend,
            avgCostPerLead: totalLeads > 0 ? totalSpend / totalLeads : 0,
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

  // Find max leads for consistent dot sizing
  const maxLeads = Math.max(...campaignData.flatMap((c) => c.data.map((d) => d.leads)));

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
        // Filter out days with 0 leads for cleaner dot plot
        const dotsData = campaign.data.filter((d) => d.leads > 0);

        return (
          <Card key={campaign.campaignId} className="shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="text-xl font-semibold">
                  {campaign.campaignName}
                </CardTitle>
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
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      type="category"
                      dataKey="date"
                      name="Date"
                      tickFormatter={(val) => format(parseISO(val), "MMM d")}
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      allowDuplicatedCategory={false}
                    />
                    <YAxis
                      type="number"
                      dataKey="leads"
                      name="Leads"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      domain={[0, "auto"]}
                    />
                    <ZAxis
                      type="number"
                      dataKey="leads"
                      range={[100, 400]}
                      domain={[0, maxLeads || 1]}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
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
                    <Scatter
                      name={campaign.campaignName}
                      data={dotsData}
                      fill="hsl(var(--primary))"
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DailyLeadCostsTab;
