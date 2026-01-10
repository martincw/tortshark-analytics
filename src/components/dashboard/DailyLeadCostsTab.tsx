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
} from "recharts";
import { TrendingUp } from "lucide-react";

interface LeadCostData {
  date: string;
  cost: number;
  leads: number;
  costPerLead: number;
}

interface CampaignLeadCosts {
  campaignId: string;
  campaignName: string;
  data: LeadCostData[];
  totalCost: number;
  totalLeads: number;
  avgCostPerLead: number;
}

const DailyLeadCostsTab: React.FC = () => {
  const { dateRange, campaigns } = useCampaign();
  const [campaignCosts, setCampaignCosts] = useState<CampaignLeadCosts[]>([]);
  const [loading, setLoading] = useState(true);

  // Get active campaigns
  const activeCampaigns = useMemo(() => {
    return campaigns.filter((c) => c.is_active);
  }, [campaigns]);

  // Generate all dates in range
  const allDates = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) return [];
    return eachDayOfInterval({
      start: parseISO(dateRange.startDate),
      end: parseISO(dateRange.endDate),
    }).map((d) => format(d, "yyyy-MM-dd"));
  }, [dateRange]);

  useEffect(() => {
    const fetchLeadCosts = async () => {
      if (!dateRange?.startDate || !dateRange?.endDate || activeCampaigns.length === 0) {
        setCampaignCosts([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Fetch leadprosper leads data for cost per lead
        const { data: leads, error } = await supabase
          .from("leadprosper_leads")
          .select("campaign_id, campaign_name, date, cost, revenue")
          .gte("date", dateRange.startDate)
          .lte("date", dateRange.endDate);

        if (error) {
          console.error("Error fetching lead costs:", error);
          setLoading(false);
          return;
        }

        // Group by campaign
        const campaignMap = new Map<
          string,
          { name: string; byDate: Map<string, { cost: number; leads: number }> }
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
          const existing = campaign.byDate.get(lead.date) || { cost: 0, leads: 0 };
          existing.cost += lead.cost || 0;
          existing.leads += 1;
          campaign.byDate.set(lead.date, existing);
        }

        // Build result for each campaign
        const results: CampaignLeadCosts[] = [];

        campaignMap.forEach((value, campaignId) => {
          const data: LeadCostData[] = allDates.map((date) => {
            const dayData = value.byDate.get(date) || { cost: 0, leads: 0 };
            return {
              date,
              cost: dayData.cost,
              leads: dayData.leads,
              costPerLead: dayData.leads > 0 ? dayData.cost / dayData.leads : 0,
            };
          });

          const totalCost = data.reduce((sum, d) => sum + d.cost, 0);
          const totalLeads = data.reduce((sum, d) => sum + d.leads, 0);

          results.push({
            campaignId,
            campaignName: value.name,
            data,
            totalCost,
            totalLeads,
            avgCostPerLead: totalLeads > 0 ? totalCost / totalLeads : 0,
          });
        });

        // Sort by total cost descending
        results.sort((a, b) => b.totalCost - a.totalCost);

        setCampaignCosts(results);
      } catch (e) {
        console.error("Error in fetchLeadCosts:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchLeadCosts();
  }, [dateRange, activeCampaigns, allDates]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-2 animate-pulse" />
          <p>Loading daily lead costs...</p>
        </div>
      </div>
    );
  }

  if (campaignCosts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No lead cost data available for the selected date range.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Daily Lead Costs by Campaign</h2>
        <p className="text-muted-foreground">
          {dateRange?.startDate && dateRange?.endDate
            ? `${format(parseISO(dateRange.startDate), "MMM d, yyyy")} - ${format(
                parseISO(dateRange.endDate),
                "MMM d, yyyy"
              )}`
            : "Select a date range"}
        </p>
      </div>

      {campaignCosts.map((campaign) => (
        <Card key={campaign.campaignId} className="shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold">
                {campaign.campaignName}
              </CardTitle>
              <div className="flex gap-6 text-base">
                <div>
                  <span className="text-muted-foreground">Total Cost: </span>
                  <span className="font-bold">{formatCurrency(campaign.totalCost)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Leads: </span>
                  <span className="font-bold">{campaign.totalLeads}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg CPL: </span>
                  <span className="font-bold">
                    {formatCurrency(campaign.avgCostPerLead)}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={campaign.data}>
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
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload as LeadCostData;
                      return (
                        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold text-base mb-2">
                            {format(parseISO(label), "EEE, MMM d")}
                          </p>
                          <div className="space-y-1 text-sm">
                            <p>
                              <span className="text-muted-foreground">Cost: </span>
                              <span className="font-medium">{formatCurrency(data.cost)}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Leads: </span>
                              <span className="font-medium">{data.leads}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">CPL: </span>
                              <span className="font-medium">
                                {formatCurrency(data.costPerLead)}
                              </span>
                            </p>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DailyLeadCostsTab;
