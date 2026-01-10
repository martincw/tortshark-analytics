import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useCampaign } from "@/contexts/CampaignContext";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { formatCurrency } from "@/utils/campaignUtils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeadData {
  date: string;
  leads: number;
  revenue: number;
  cost: number;
}

interface CampaignLeadData {
  campaignId: string;
  campaignName: string;
  data: LeadData[];
  totalLeads: number;
  totalRevenue: number;
  totalCost: number;
}

const DailyLeadCostsTab: React.FC = () => {
  const { dateRange } = useCampaign();
  const [campaignData, setCampaignData] = useState<CampaignLeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<"leads" | "revenue">("leads");

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
        // Fetch leadprosper leads data
        const { data: leads, error } = await supabase
          .from("leadprosper_leads")
          .select("campaign_id, campaign_name, date, cost, revenue")
          .gte("date", dateRange.startDate)
          .lte("date", dateRange.endDate);

        if (error) {
          console.error("Error fetching lead data:", error);
          setLoading(false);
          return;
        }

        // Group by campaign
        const campaignMap = new Map<
          string,
          { name: string; byDate: Map<string, { leads: number; revenue: number; cost: number }> }
        >();

        for (const lead of leads || []) {
          const cId = lead.campaign_id;
          if (!campaignMap.has(cId)) {
            campaignMap.set(cId, {
              name: lead.campaign_name || cId,
              byDate: new Map(),
            });
          }

          const campaign = campaignMap.get(cId)!;
          const existing = campaign.byDate.get(lead.date) || { leads: 0, revenue: 0, cost: 0 };
          existing.leads += 1;
          existing.revenue += lead.revenue || 0;
          existing.cost += lead.cost || 0;
          campaign.byDate.set(lead.date, existing);
        }

        // Build result for each campaign
        const results: CampaignLeadData[] = [];

        campaignMap.forEach((value, campaignId) => {
          const data: LeadData[] = allDates.map((date) => {
            const dayData = value.byDate.get(date) || { leads: 0, revenue: 0, cost: 0 };
            return {
              date,
              leads: dayData.leads,
              revenue: dayData.revenue,
              cost: dayData.cost,
            };
          });

          const totalLeads = data.reduce((sum, d) => sum + d.leads, 0);
          const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
          const totalCost = data.reduce((sum, d) => sum + d.cost, 0);

          results.push({
            campaignId,
            campaignName: value.name,
            data,
            totalLeads,
            totalRevenue,
            totalCost,
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
  }, [dateRange, allDates]);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Lead Data by Campaign</h2>
          <p className="text-lg text-muted-foreground">
            {dateRange?.startDate && dateRange?.endDate
              ? `${format(parseISO(dateRange.startDate), "MMM d, yyyy")} - ${format(
                  parseISO(dateRange.endDate),
                  "MMM d, yyyy"
                )}`
              : "Select a date range"}
          </p>
        </div>
        <Tabs value={metric} onValueChange={(v) => setMetric(v as "leads" | "revenue")}>
          <TabsList>
            <TabsTrigger value="leads" className="text-base px-6">Leads</TabsTrigger>
            <TabsTrigger value="revenue" className="text-base px-6">Revenue</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {campaignData.map((campaign) => (
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
                  <span className="text-muted-foreground">Total Revenue: </span>
                  <span className="font-bold text-lg">{formatCurrency(campaign.totalRevenue)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg/Day: </span>
                  <span className="font-bold text-lg">
                    {metric === "leads"
                      ? (campaign.totalLeads / (allDates.length || 1)).toFixed(1)
                      : formatCurrency(campaign.totalRevenue / (allDates.length || 1))}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={campaign.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => format(parseISO(val), "MMM d")}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(val) =>
                      metric === "revenue" ? `$${val.toFixed(0)}` : val.toString()
                    }
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as LeadData;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-4 shadow-lg">
                          <p className="font-semibold text-base mb-2">
                            {format(parseISO(label), "EEE, MMM d")}
                          </p>
                          <div className="space-y-1 text-base">
                            <p>
                              <span className="text-muted-foreground">Leads: </span>
                              <span className="font-medium">{data.leads}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Revenue: </span>
                              <span className="font-medium">{formatCurrency(data.revenue)}</span>
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey={metric}
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DailyLeadCostsTab;
