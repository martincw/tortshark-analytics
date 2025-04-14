
import React, { useMemo } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { formatCurrency, calculateMetrics } from "@/utils/campaignUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AggregateStats() {
  const { campaigns, dateRange } = useCampaign();
  const [sortField, setSortField] = React.useState<string>("adSpend");
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const aggregateData = useMemo(() => {
    // Calculate aggregate metrics for all campaigns
    const totalStats = {
      adSpend: 0,
      leads: 0,
      cases: 0,
      revenue: 0,
      impressions: 0,
      clicks: 0
    };

    campaigns.forEach(campaign => {
      totalStats.adSpend += campaign.stats.adSpend || 0;
      totalStats.leads += campaign.manualStats.leads || 0;
      totalStats.cases += campaign.manualStats.cases || 0;
      totalStats.revenue += campaign.manualStats.revenue || 0;
      totalStats.impressions += campaign.stats.impressions || 0;
      totalStats.clicks += campaign.stats.clicks || 0;
    });

    // Calculate derived metrics
    const costPerLead = totalStats.leads > 0 ? totalStats.adSpend / totalStats.leads : 0;
    const costPerCase = totalStats.cases > 0 ? totalStats.adSpend / totalStats.cases : 0;
    const conversionRate = totalStats.leads > 0 ? (totalStats.cases / totalStats.leads) * 100 : 0;
    const profit = totalStats.revenue - totalStats.adSpend;
    const roi = totalStats.adSpend > 0 ? (profit / totalStats.adSpend) * 100 : 0;
    const ctr = totalStats.impressions > 0 ? (totalStats.clicks / totalStats.impressions) * 100 : 0;

    return {
      ...totalStats,
      costPerLead,
      costPerCase,
      conversionRate,
      profit,
      roi,
      ctr
    };
  }, [campaigns]);

  const sortedCampaigns = useMemo(() => {
    if (campaigns.length === 0) return [];

    return [...campaigns].sort((a, b) => {
      let valueA: number = 0;
      let valueB: number = 0;

      switch (sortField) {
        case "adSpend":
          valueA = a.stats.adSpend || 0;
          valueB = b.stats.adSpend || 0;
          break;
        case "leads":
          valueA = a.manualStats.leads || 0;
          valueB = b.manualStats.leads || 0;
          break;
        case "cases":
          valueA = a.manualStats.cases || 0;
          valueB = b.manualStats.cases || 0;
          break;
        case "revenue":
          valueA = a.manualStats.revenue || 0;
          valueB = b.manualStats.revenue || 0;
          break;
        case "profit": {
          const metricsA = calculateMetrics(a);
          const metricsB = calculateMetrics(b);
          valueA = metricsA.profit;
          valueB = metricsB.profit;
          break;
        }
        case "roi": {
          const metricsA = calculateMetrics(a);
          const metricsB = calculateMetrics(b);
          valueA = metricsA.roi;
          valueB = metricsB.roi;
          break;
        }
        case "cpl": {
          const metricsA = calculateMetrics(a);
          const metricsB = calculateMetrics(b);
          valueA = metricsA.costPerLead;
          valueB = metricsB.costPerLead;
          break;
        }
        case "cpa": {
          const metricsA = calculateMetrics(a);
          const metricsB = calculateMetrics(b);
          valueA = metricsA.cpa;
          valueB = metricsB.cpa;
          break;
        }
        default:
          valueA = a.stats.adSpend || 0;
          valueB = b.stats.adSpend || 0;
      }

      return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
    });
  }, [campaigns, sortField, sortDirection]);

  // Format date range for display
  const formattedDateRange = useMemo(() => {
    const start = new Date(dateRange.startDate).toLocaleDateString();
    const end = new Date(dateRange.endDate).toLocaleDateString();
    return `${start} - ${end}`;
  }, [dateRange]);

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6">
            <p className="text-muted-foreground">No campaign data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Campaign Performance Summary</span>
            <Badge variant="outline">{formattedDateRange}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Ad Spend</div>
              <div className="text-xl font-semibold mt-1">{formatCurrency(aggregateData.adSpend)}</div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Revenue</div>
              <div className="text-xl font-semibold mt-1">{formatCurrency(aggregateData.revenue)}</div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Profit</div>
              <div className={`text-xl font-semibold mt-1 ${aggregateData.profit >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`}>
                {formatCurrency(aggregateData.profit)}
              </div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">ROI</div>
              <div className={`text-xl font-semibold mt-1 flex items-center ${aggregateData.roi >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`}>
                {aggregateData.roi.toFixed(1)}%
                {aggregateData.roi > 0 ? 
                  <TrendingUp className="ml-1 h-4 w-4" /> : 
                  aggregateData.roi < 0 ? 
                  <TrendingDown className="ml-1 h-4 w-4" /> : null
                }
              </div>
            </div>
            
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Leads</div>
              <div className="text-xl font-semibold mt-1">{aggregateData.leads}</div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Cases</div>
              <div className="text-xl font-semibold mt-1">{aggregateData.cases}</div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Cost Per Lead</div>
              <div className="text-xl font-semibold mt-1">{formatCurrency(aggregateData.costPerLead)}</div>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Cost Per Case</div>
              <div className="text-xl font-semibold mt-1">{formatCurrency(aggregateData.costPerCase)}</div>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>
                    <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("adSpend")}>
                      Ad Spend <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("leads")}>
                      Leads <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("cases")}>
                      Cases <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("revenue")}>
                      Revenue <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("profit")}>
                      Profit <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" className="p-0 h-auto font-medium" onClick={() => toggleSort("roi")}>
                      ROI <ArrowUpDown className="ml-1 h-3 w-3" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCampaigns.map((campaign) => {
                  const metrics = calculateMetrics(campaign);
                  return (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">
                        {campaign.name}
                        <div className="text-xs text-muted-foreground">{campaign.accountName}</div>
                      </TableCell>
                      <TableCell>{formatCurrency(campaign.stats.adSpend)}</TableCell>
                      <TableCell>{campaign.manualStats.leads}</TableCell>
                      <TableCell>{campaign.manualStats.cases}</TableCell>
                      <TableCell>{formatCurrency(campaign.manualStats.revenue)}</TableCell>
                      <TableCell className={metrics.profit >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}>
                        {formatCurrency(metrics.profit)}
                      </TableCell>
                      <TableCell className={metrics.roi >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}>
                        {metrics.roi.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
