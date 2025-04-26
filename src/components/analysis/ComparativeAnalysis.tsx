import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign } from "@/types/campaign";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ArrowDownUp, BarChart3, LineChart, Medal, PieChart as PieChartIcon, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ComparativeAnalysisProps {
  campaign: Campaign;
  allCampaigns: Campaign[];
}

export const ComparativeAnalysis: React.FC<ComparativeAnalysisProps> = ({ campaign, allCampaigns }) => {
  const [comparisonType, setComparisonType] = useState<string>("campaigns");
  const [timeFrame, setTimeFrame] = useState<string>("month");
  
  const comparisonDateRanges = useMemo(() => {
    const today = new Date();
    
    if (timeFrame === "week") {
      const currentStart = format(subDays(today, 7), 'yyyy-MM-dd');
      const currentEnd = format(today, 'yyyy-MM-dd');
      const previousStart = format(subDays(today, 14), 'yyyy-MM-dd');
      const previousEnd = format(subDays(today, 7), 'yyyy-MM-dd');
      
      return {
        current: { startDate: currentStart, endDate: currentEnd },
        previous: { startDate: previousStart, endDate: previousEnd },
        currentLabel: "Last 7 Days",
        previousLabel: "Previous 7 Days"
      };
    } else if (timeFrame === "month") {
      const currentMonthStart = format(startOfMonth(today), 'yyyy-MM-dd');
      const currentMonthEnd = format(today, 'yyyy-MM-dd');
      
      const lastMonth = subMonths(today, 1);
      const lastMonthStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
      const lastMonthEnd = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
      
      return {
        current: { startDate: currentMonthStart, endDate: currentMonthEnd },
        previous: { startDate: lastMonthStart, endDate: lastMonthEnd },
        currentLabel: "This Month",
        previousLabel: "Last Month"
      };
    } else {
      const currentStart = format(subMonths(today, 3), 'yyyy-MM-dd');
      const currentEnd = format(today, 'yyyy-MM-dd');
      const previousStart = format(subMonths(today, 6), 'yyyy-MM-dd');
      const previousEnd = format(subMonths(today, 3), 'yyyy-MM-dd');
      
      return {
        current: { startDate: currentStart, endDate: currentEnd },
        previous: { startDate: previousStart, endDate: previousEnd },
        currentLabel: "Last 3 Months",
        previousLabel: "Previous 3 Months"
      };
    }
  }, [timeFrame]);
  
  const comparisonData = useMemo(() => {
    if (comparisonType === "campaigns") {
      const campaignsData = allCampaigns.map(camp => {
        const metrics = calculateMetrics(camp);
        return {
          name: camp.name,
          revenue: metrics.revenue || 0,
          adSpend: metrics.adSpend || 0,
          profit: metrics.profit,
          roi: metrics.roi,
          leads: metrics.leads || 0,
          cases: metrics.cases || 0,
          costPerLead: metrics.costPerLead,
          cpa: metrics.cpa,
          isCurrentCampaign: camp.id === campaign.id,
          platform: camp.platform
        };
      });
      
      return {
        type: "campaigns",
        data: campaignsData
      };
    } else {
      const currentMetrics = calculateMetrics(campaign, comparisonDateRanges.current);
      const previousMetrics = calculateMetrics(campaign, comparisonDateRanges.previous);
      
      const revenueChange = previousMetrics.revenue && previousMetrics.revenue > 0 
        ? ((currentMetrics.revenue || 0) - previousMetrics.revenue) / previousMetrics.revenue * 100
        : 0;
        
      const adSpendChange = previousMetrics.adSpend && previousMetrics.adSpend > 0
        ? ((currentMetrics.adSpend || 0) - previousMetrics.adSpend) / previousMetrics.adSpend * 100
        : 0;
        
      const profitChange = previousMetrics.profit && previousMetrics.profit > 0
        ? (currentMetrics.profit - previousMetrics.profit) / previousMetrics.profit * 100
        : 0;
        
      const roiChange = previousMetrics.roi && previousMetrics.roi > 0
        ? (currentMetrics.roi - previousMetrics.roi) / previousMetrics.roi * 100
        : 0;
        
      const leadsChange = previousMetrics.leads && previousMetrics.leads > 0
        ? ((currentMetrics.leads || 0) - previousMetrics.leads) / previousMetrics.leads * 100
        : 0;
        
      const casesChange = previousMetrics.cases && previousMetrics.cases > 0
        ? ((currentMetrics.cases || 0) - previousMetrics.cases) / previousMetrics.cases * 100
        : 0;
        
      const costPerLeadChange = previousMetrics.costPerLead && previousMetrics.costPerLead > 0
        ? (currentMetrics.costPerLead - previousMetrics.costPerLead) / previousMetrics.costPerLead * 100
        : 0;
        
      const cpaChange = previousMetrics.cpa && previousMetrics.cpa > 0
        ? (currentMetrics.cpa - previousMetrics.cpa) / previousMetrics.cpa * 100
        : 0;
      
      return {
        type: "time",
        currentLabel: comparisonDateRanges.currentLabel,
        previousLabel: comparisonDateRanges.previousLabel,
        current: currentMetrics,
        previous: previousMetrics,
        changes: {
          revenue: revenueChange,
          adSpend: adSpendChange,
          profit: profitChange,
          roi: roiChange,
          leads: leadsChange,
          cases: casesChange,
          costPerLead: costPerLeadChange,
          cpa: cpaChange
        }
      };
    }
  }, [comparisonType, campaign, allCampaigns, comparisonDateRanges]);
  
  const platformData = useMemo(() => {
    const platformCounts = allCampaigns.reduce((acc, camp) => {
      acc[camp.platform] = (acc[camp.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(platformCounts).map(([name, value]) => ({ name, value }));
  }, [allCampaigns]);
  
  const performanceRanking = useMemo(() => {
    if (!comparisonData || comparisonData.type !== "campaigns") {
      return { roi: 0, profit: 0, cpa: 0, leads: 0 };
    }
    
    const roiSorted = [...comparisonData.data].sort((a, b) => b.roi - a.roi);
    const profitSorted = [...comparisonData.data].sort((a, b) => b.profit - a.profit);
    const cpaSorted = [...comparisonData.data].sort((a, b) => a.cpa - b.cpa);
    const leadsSorted = [...comparisonData.data].sort((a, b) => b.leads - a.leads);
    
    const roiRank = roiSorted.findIndex(c => c.isCurrentCampaign) + 1;
    const profitRank = profitSorted.findIndex(c => c.isCurrentCampaign) + 1;
    const cpaRank = cpaSorted.findIndex(c => c.isCurrentCampaign) + 1;
    const leadsRank = leadsSorted.findIndex(c => c.isCurrentCampaign) + 1;
    
    return { roi: roiRank, profit: profitRank, cpa: cpaRank, leads: leadsRank };
  }, [comparisonData]);
  
  const radarData = useMemo(() => {
    if (!comparisonData || comparisonData.type !== "campaigns") {
      return [];
    }
    
    const maxROI = Math.max(...comparisonData.data.map(c => c.roi));
    const maxProfit = Math.max(...comparisonData.data.map(c => c.profit));
    const minCPA = Math.min(...comparisonData.data.filter(c => c.cpa > 0).map(c => c.cpa));
    const maxLeads = Math.max(...comparisonData.data.map(c => c.leads));
    const maxCases = Math.max(...comparisonData.data.map(c => c.cases));
    
    return comparisonData.data.map(camp => {
      return {
        name: camp.name,
        ROI: maxROI > 0 ? (camp.roi / maxROI) * 100 : 0,
        Profit: maxProfit > 0 ? (camp.profit / maxProfit) * 100 : 0,
        "Cost Per Case": minCPA > 0 ? (minCPA / camp.cpa) * 100 : 0,
        Leads: maxLeads > 0 ? (camp.leads / maxLeads) * 100 : 0,
        Cases: maxCases > 0 ? (camp.cases / maxCases) * 100 : 0,
        isCurrentCampaign: camp.isCurrentCampaign
      };
    });
  }, [comparisonData]);

  const tooltipFormatter = (value: number, name: string, props: any) => {
    switch (name) {
      case 'revenue':
      case 'adSpend':
      case 'profit':
      case 'costPerLead':
      case 'cpa':
        return [formatCurrency(value), name];
      case 'roi':
      case 'ROI':
        return [formatPercent(value), name];
      default:
        return [formatNumber(value), name];
    }
  };
  
  const getChangeBadge = (change: number, inverse: boolean = false) => {
    let type = change > 0 ? "positive" : change < 0 ? "negative" : "neutral";
    
    if (inverse) {
      type = type === "positive" ? "negative" : type === "negative" ? "positive" : "neutral";
    }
    
    return (
      <Badge 
        variant="outline"
        className={`ml-2 ${
          type === "positive" ? "bg-success-DEFAULT/20 text-success-DEFAULT border-success-DEFAULT" : 
          type === "negative" ? "bg-error-DEFAULT/20 text-error-DEFAULT border-error-DEFAULT" : 
          "bg-muted"
        }`}
      >
        {change > 0 ? "+" : ""}{change.toFixed(1)}%
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Comparative Analysis</CardTitle>
          <CardDescription>
            Compare performance across campaigns or time periods
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="comparison-type">Compare Against</Label>
              <Select 
                value={comparisonType} 
                onValueChange={setComparisonType}
              >
                <SelectTrigger id="comparison-type" className="mt-2">
                  <SelectValue placeholder="Select comparison type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="campaigns">Other Campaigns</SelectItem>
                  <SelectItem value="time">Previous Time Period</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="time-frame">Time Frame</Label>
              <Select 
                value={timeFrame} 
                onValueChange={setTimeFrame}
              >
                <SelectTrigger id="time-frame" className="mt-2">
                  <SelectValue placeholder="Select time frame" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week over Week</SelectItem>
                  <SelectItem value="month">Month over Month</SelectItem>
                  <SelectItem value="quarter">Quarter over Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {comparisonType === "campaigns" && comparisonData && (
        <>
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" />
                Performance Ranking
              </CardTitle>
              <CardDescription>
                How {campaign.name} ranks among {allCampaigns.length} campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">ROI Ranking</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">#{performanceRanking.roi}</span>
                    <span className="text-sm text-muted-foreground">of {allCampaigns.length}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Profit Ranking</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">#{performanceRanking.profit}</span>
                    <span className="text-sm text-muted-foreground">of {allCampaigns.length}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">CPA Ranking</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">#{performanceRanking.cpa}</span>
                    <span className="text-sm text-muted-foreground">of {allCampaigns.length}</span>
                  </div>
                </div>
                
                <div className="p-3 bg-background rounded-lg border">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Leads Ranking</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">#{performanceRanking.leads}</span>
                    <span className="text-sm text-muted-foreground">of {allCampaigns.length}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Revenue & Profit by Campaign
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonData.data}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis tickFormatter={(value) => `$${value}`} />
                      <Tooltip 
                        formatter={tooltipFormatter}
                        labelFormatter={(value) => `Campaign: ${value}`} 
                      />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="#8884d8">
                        {comparisonData.data.map((entry, index) => (
                          <Cell 
                            key={`cell-revenue-${index}`} 
                            fill={entry.isCurrentCampaign ? '#8884d8' : '#8884d880'}
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="profit" name="Profit" fill="#82ca9d">
                        {comparisonData.data.map((entry, index) => (
                          <Cell 
                            key={`cell-profit-${index}`} 
                            fill={entry.isCurrentCampaign ? '#82ca9d' : '#82ca9d80'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  ROI Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonData.data}
                      margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={70}
                      />
                      <YAxis tickFormatter={(value) => `${value}%`} />
                      <Tooltip 
                        formatter={tooltipFormatter}
                        labelFormatter={(value) => `Campaign: ${value}`} 
                      />
                      <Legend />
                      <Bar dataKey="roi" name="ROI %" fill="#ff7300">
                        {comparisonData.data.map((entry, index) => (
                          <Cell 
                            key={`cell-roi-${index}`} 
                            fill={entry.isCurrentCampaign ? '#ff7300' : '#ff730080'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Radar</CardTitle>
                <CardDescription>
                  Multidimensional comparison of key metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart outerRadius="80%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                      <Radar 
                        name={campaign.name} 
                        dataKey="ROI" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.6} 
                      />
                      <Radar 
                        name="Profit" 
                        dataKey="Profit" 
                        stroke="#82ca9d" 
                        fill="#82ca9d" 
                        fillOpacity={0.6} 
                      />
                      <Radar 
                        name="CPA Efficiency" 
                        dataKey="Cost Per Case" 
                        stroke="#ffc658" 
                        fill="#ffc658" 
                        fillOpacity={0.6} 
                      />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Campaign Platform Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {platformData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.name === 'google' ? '#4285F4' : 
                              entry.name === 'facebook' ? '#3b5998' : 
                              entry.name === 'linkedin' ? '#0077b5' : 
                              '#8884d8'
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} campaigns`, 'Count']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownUp className="h-5 w-5" />
                Campaign Metrics Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Ad Spend</TableHead>
                      <TableHead>Profit</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead>Cost Per Lead</TableHead>
                      <TableHead>Cost Per Case</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Cases</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.data.map((camp, index) => (
                      <TableRow key={index} className={camp.isCurrentCampaign ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium">
                          {camp.name}
                          {camp.isCurrentCampaign && <Badge variant="outline" className="ml-2">Current</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{camp.platform}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(camp.revenue)}</TableCell>
                        <TableCell>{formatCurrency(camp.adSpend)}</TableCell>
                        <TableCell className={camp.profit >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                          {formatCurrency(camp.profit)}
                        </TableCell>
                        <TableCell className={camp.roi >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                          {formatPercent(camp.roi)}
                        </TableCell>
                        <TableCell>{formatCurrency(camp.costPerLead)}</TableCell>
                        <TableCell>{formatCurrency(camp.cpa)}</TableCell>
                        <TableCell>{formatNumber(camp.leads)}</TableCell>
                        <TableCell>{formatNumber(camp.cases)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
      {comparisonType === "time" && comparisonData && comparisonData.type === "time" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {comparisonData.currentLabel} vs {comparisonData.previousLabel}
              </CardTitle>
              <CardDescription>
                Comparing performance between time periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">Revenue</div>
                    {getChangeBadge(comparisonData.changes.revenue)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Current:</span>
                      <span className="font-medium">{formatCurrency(comparisonData.current.revenue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Previous:</span>
                      <span>{formatCurrency(comparisonData.previous.revenue || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">Profit</div>
                    {getChangeBadge(comparisonData.changes.profit)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Current:</span>
                      <span className={`font-medium ${comparisonData.current.profit >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
                        {formatCurrency(comparisonData.current.profit)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Previous:</span>
                      <span className={comparisonData.previous.profit >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                        {formatCurrency(comparisonData.previous.profit)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">ROI</div>
                    {getChangeBadge(comparisonData.changes.roi)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Current:</span>
                      <span className={`font-medium ${comparisonData.current.roi >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
                        {formatPercent(comparisonData.current.roi)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Previous:</span>
                      <span className={comparisonData.previous.roi >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                        {formatPercent(comparisonData.previous.roi)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">Ad Spend</div>
                    {getChangeBadge(comparisonData.changes.adSpend, true)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Current:</span>
                      <span className="font-medium">{formatCurrency(comparisonData.current.adSpend || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Previous:</span>
                      <span>{formatCurrency(comparisonData.previous.adSpend || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">Leads</div>
                    {getChangeBadge(comparisonData.changes.leads)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Current:</span>
                      <span className="font-medium">{formatNumber(comparisonData.current.leads || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Previous:</span>
                      <span>{formatNumber(comparisonData.previous.leads || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">Cases</div>
                    {getChangeBadge(comparisonData.changes.cases)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Current:</span>
                      <span className="font-medium">{formatNumber(comparisonData.current.cases || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Previous:</span>
                      <span>{formatNumber(comparisonData.previous.cases || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">Cost Per Lead</div>
                    {getChangeBadge(comparisonData.changes.costPerLead, true)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Current:</span>
                      <span className="font-medium">{formatCurrency(comparisonData.current.costPerLead)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Previous:</span>
                      <span>{formatCurrency(comparisonData.previous.costPerLead)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-accent/10 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">Cost Per Acquisition</div>
                    {getChangeBadge(comparisonData.changes.cpa, true)}
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Current:</span>
                      <span className="font-medium">{formatCurrency(comparisonData.current.cpa)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Previous:</span>
                      <span>{formatCurrency(comparisonData.previous.cpa)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6">
                <Tabs defaultValue="revenue" className="w-full">
                  <TabsList>
                    <TabsTrigger value="revenue">Revenue & Profit</TabsTrigger>
                    <TabsTrigger value="leads">Leads & Cases</TabsTrigger>
                    <TabsTrigger value="costs">CPA & CPL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="revenue" className="mt-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              period: comparisonData.previousLabel, 
                              revenue: comparisonData.previous.revenue || 0, 
                              profit: comparisonData.previous.profit
                            },
                            {
                              period: comparisonData.currentLabel, 
                              revenue: comparisonData.current.revenue || 0, 
                              profit: comparisonData.current.profit
                            }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis tickFormatter={(value) => `$${value}`} />
                          <Tooltip formatter={tooltipFormatter} />
                          <Legend />
                          <Bar dataKey="revenue" name="Revenue" fill="#8884d8" />
                          <Bar dataKey="profit" name="Profit" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="leads" className="mt-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              period: comparisonData.previousLabel, 
                              leads: comparisonData.previous.leads || 0, 
                              cases: comparisonData.previous.cases || 0
                            },
                            {
                              period: comparisonData.currentLabel, 
                              leads: comparisonData.current.leads || 0, 
                              cases: comparisonData.current.cases || 0
                            }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip formatter={tooltipFormatter} />
                          <Legend />
                          <Bar dataKey="leads" name="Leads" fill="#8884d8" />
                          <Bar dataKey="cases" name="Cases" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="costs" className="mt-4">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              period: comparisonData.previousLabel, 
                              costPerLead: comparisonData.previous.costPerLead, 
                              cpa: comparisonData.previous.cpa
                            },
                            {
                              period: comparisonData.currentLabel, 
                              costPerLead: comparisonData.current.costPerLead, 
                              cpa: comparisonData.current.cpa
                            }
                          ]}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis tickFormatter={(value) => `$${value}`} />
                          <Tooltip formatter={tooltipFormatter} />
                          <Legend />
                          <Bar dataKey="costPerLead" name="Cost Per Lead" fill="#8884d8" />
                          <Bar dataKey="cpa" name="Cost Per Case" fill="#82ca9d" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
