
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeStat } from "@/components/ui/badge-stat";
import { StatCard } from "@/components/ui/stat-card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  Users,
  FileCheck,
  TrendingUp,
  BarChart3,
  CreditCard,
  Percent,
  Save,
  X,
  CalendarDays,
  Target,
  PlusCircle,
  Calendar,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GoogleAdsMetrics from "@/components/campaigns/GoogleAdsMetrics";

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    campaigns, 
    updateCampaign, 
    deleteCampaign, 
    setSelectedCampaignId, 
    addStatHistoryEntry, 
    updateStatHistoryEntry,
    deleteStatHistoryEntry,
    dateRange, 
    setDateRange 
  } = useCampaign();
  
  useEffect(() => {
    if (id) {
      setSelectedCampaignId(id);
    }
    
    console.log("Campaign ID from URL:", id);
    console.log("Available campaigns:", campaigns.map(c => ({ id: c.id, name: c.name })));
  }, [id, setSelectedCampaignId, campaigns]);
  
  const campaign = campaigns.find((c) => c.id === id);
  
  useEffect(() => {
    console.log("Found campaign:", campaign);
  }, [campaign]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingManualStats, setIsAddingManualStats] = useState(false);
  const [leadCount, setLeadCount] = useState("0");
  const [caseCount, setCaseCount] = useState("0");
  const [revenue, setRevenue] = useState("0");
  
  const [isDailyStatsDialogOpen, setIsDailyStatsDialogOpen] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    leads: "0",
    cases: "0",
    revenue: "0",
    adSpend: "0"
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryData, setEditEntryData] = useState({
    leads: "0",
    cases: "0",
    revenue: "0",
    adSpend: "0"
  });
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [deleteEntryDialogOpen, setDeleteEntryDialogOpen] = useState(false);
  
  useEffect(() => {
    if (campaign) {
      setLeadCount(campaign.manualStats.leads.toString());
      setCaseCount(campaign.manualStats.cases.toString());
      setRevenue(campaign.manualStats.revenue.toString());
      
      console.log("Updated form fields with campaign data", {
        leads: campaign.manualStats.leads,
        cases: campaign.manualStats.cases,
        revenue: campaign.manualStats.revenue
      });
    }
  }, [campaign]);
  
  if (!campaign) {
    console.log("Campaign not found for ID:", id);
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h1 className="text-2xl font-bold mb-4">Campaign not found</h1>
        <Button onClick={() => navigate("/campaigns")} variant="default">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
      </div>
    );
  }
  
  const metrics = calculateMetrics(campaign);

  const getRoiClass = () => {
    if (metrics.roi > 200) return "text-success-DEFAULT";
    if (metrics.roi > 0) return "text-secondary"; 
    return "text-error-DEFAULT";
  };
  
  const handleSave = () => {
    updateCampaign(campaign.id, {
      manualStats: {
        ...campaign.manualStats,
        leads: parseInt(leadCount) || 0,
        cases: parseInt(caseCount) || 0,
        revenue: parseFloat(revenue) || 0,
      },
    });
    
    setIsEditing(false);
    toast.success("Campaign updated successfully");
  };
  
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaign(campaign.id);
      navigate("/campaigns");
      toast.success("Campaign deleted successfully");
    }
  };
  
  const handleSaveDailyStats = () => {
    const newLeads = parseInt(dailyStats.leads) || 0;
    const newCases = parseInt(dailyStats.cases) || 0;
    const newRevenue = parseFloat(dailyStats.revenue) || 0;
    const newAdSpend = parseFloat(dailyStats.adSpend) || 0;
    
    if (newLeads === 0 && newCases === 0 && newRevenue === 0 && newAdSpend === 0) {
      toast.error("Please enter at least one value greater than 0");
      return;
    }
    
    console.log("Adding new stats history entry:", {
      campaignId: campaign.id,
      date: selectedDate.toISOString(),
      leads: newLeads,
      cases: newCases,
      revenue: newRevenue,
      adSpend: newAdSpend
    });
    
    addStatHistoryEntry(campaign.id, {
      date: selectedDate.toISOString(),
      leads: newLeads,
      cases: newCases,
      retainers: newCases,
      revenue: newRevenue,
      adSpend: newAdSpend
    });
    
    setIsDailyStatsDialogOpen(false);
    toast.success("Daily stats added successfully");
    
    setDailyStats({
      leads: "0",
      cases: "0",
      revenue: "0",
      adSpend: "0"
    });
    
    setLeadCount((parseInt(leadCount) + newLeads).toString());
    setCaseCount((parseInt(caseCount) + newCases).toString());
    setRevenue((parseFloat(revenue) + newRevenue).toString());
  };
  
  const handleEditEntry = (entry: any) => {
    setEditingEntryId(entry.id);
    setEditEntryData({
      leads: entry.leads.toString(),
      cases: entry.cases.toString(), 
      revenue: entry.revenue.toString(),
      adSpend: (entry.adSpend || 0).toString()
    });
    setEditEntryDialogOpen(true);
  };
  
  const handleSaveEditedEntry = () => {
    if (!editingEntryId) return;
    
    const entry = campaign.statsHistory.find(e => e.id === editingEntryId);
    if (!entry) return;
    
    const updatedEntry = {
      ...entry,
      leads: parseInt(editEntryData.leads) || 0,
      cases: parseInt(editEntryData.cases) || 0,
      retainers: parseInt(editEntryData.cases) || 0,
      revenue: parseFloat(editEntryData.revenue) || 0,
      adSpend: parseFloat(editEntryData.adSpend) || 0
    };
    
    updateStatHistoryEntry(campaign.id, updatedEntry);
    setEditEntryDialogOpen(false);
    setEditingEntryId(null);
  };
  
  const handleDeleteEntryConfirm = (entryId: string) => {
    setEntryToDelete(entryId);
    setDeleteEntryDialogOpen(true);
  };
  
  const confirmDeleteEntry = () => {
    if (!entryToDelete) return;
    
    deleteStatHistoryEntry(campaign.id, entryToDelete);
    setDeleteEntryDialogOpen(false);
    setEntryToDelete(null);
  };

  const roiProgress = Math.min(Math.round((metrics.roi / campaign.targets.targetROAS) * 100), 100);
  const casesProgress = Math.min(Math.round((campaign.manualStats.cases / campaign.targets.monthlyRetainers) * 100), 100);
  const profitProgress = Math.min(Math.round((metrics.profit / campaign.targets.targetProfit) * 100), 100);
  
  const getRoiVariant = () => {
    if (roiProgress >= 100) return "success";
    if (roiProgress >= 70) return "warning";
    return "error";
  };
  
  const getCasesVariant = () => {
    if (casesProgress >= 100) return "success";
    if (casesProgress >= 70) return "warning";
    return "error";
  };
  
  const getProfitVariant = () => {
    if (profitProgress >= 100) return "success";
    if (profitProgress >= 70) return "warning";
    return "error";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <Button
          onClick={() => navigate("/campaigns")}
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground px-0"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Campaigns
        </Button>
      </div>
      
      <div className="bg-accent/20 rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <DateRangePicker />
        </div>
        
        <div className="flex flex-wrap gap-6 mt-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">ROI</span>
            <span className={`text-2xl font-bold ${getRoiClass()}`}>
              {metrics.roi.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Total Profit</span>
            <span className={`text-2xl font-bold ${getRoiClass()}`}>
              {formatCurrency(metrics.profit)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Cost Per Case</span>
            <span className={`text-2xl font-bold ${metrics.cpa < campaign.targets.casePayoutAmount ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
              {formatCurrency(metrics.cpa)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Return on Investment"
          value={`${metrics.roi.toFixed(1)}%`}
          icon={<Percent className="h-5 w-5" />}
          trend={metrics.roi > 0 ? "up" : "down"}
          trendValue={metrics.roi > 200 ? "Excellent" : metrics.roi > 100 ? "Good" : metrics.roi > 0 ? "Positive" : "Needs Attention"}
          className="border-2 border-accent"
          isHighlighted={true}
          valueClassName={getRoiClass()}
        />
        
        <StatCard
          title="Campaign Profit"
          value={formatCurrency(metrics.profit)}
          icon={<CreditCard className="h-5 w-5" />}
          trend={metrics.profit > 0 ? "up" : "down"}
          trendValue={metrics.profit > 5000 ? "High Performer" : metrics.profit > 0 ? "Profitable" : "Loss"}
          className="border-2 border-accent"
          isHighlighted={true}
          valueClassName={getRoiClass()}
        />
        
        <StatCard
          title="Cost Per Case"
          value={formatCurrency(metrics.cpa)}
          icon={<FileCheck className="h-5 w-5" />}
          trend={metrics.cpa < campaign.targets.casePayoutAmount / 2 ? "up" : "down"}
          trendValue={metrics.cpa < campaign.targets.casePayoutAmount ? "Under Target" : "Over Target"}
          className="border-2 border-accent"
          isHighlighted={true}
          valueClassName={metrics.cpa < campaign.targets.casePayoutAmount ? "text-success-DEFAULT" : "text-error-DEFAULT"}
        />
      </div>
      
      <div className="flex justify-end gap-2">
        {isEditing ? (
          <>
            <Button onClick={() => setIsEditing(false)} variant="outline">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} variant="default">
              <Save className="mr-2 h-4 w-4" />
              Save All
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={() => setIsDailyStatsDialogOpen(true)}
              variant="outline"
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              Add Daily Stats
            </Button>
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Stats
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-md border-accent/30">
          <CardHeader className="bg-card/50 border-b pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-accent/10 rounded-lg p-4">
                <span className="text-sm text-muted-foreground block mb-1">Ad Spend</span>
                <span className="text-xl font-semibold">{formatCurrency(campaign.stats.adSpend)}</span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <span className="text-sm text-muted-foreground block mb-1">Revenue</span>
                <span className="text-xl font-semibold">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      className="h-8 w-full"
                    />
                  ) : (
                    formatCurrency(campaign.manualStats.revenue)
                  )}
                </span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <span className="text-sm text-muted-foreground block mb-1">Leads</span>
                <span className="text-xl font-semibold">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={leadCount}
                      onChange={(e) => setLeadCount(e.target.value)}
                      className="h-8 w-full"
                    />
                  ) : (
                    formatNumber(campaign.manualStats.leads)
                  )}
                </span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <span className="text-sm text-muted-foreground block mb-1">Cases</span>
                <span className="text-xl font-semibold">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={caseCount}
                      onChange={(e) => setCaseCount(e.target.value)}
                      className="h-8 w-full"
                    />
                  ) : (
                    formatNumber(campaign.manualStats.cases)
                  )}
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Key Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <BadgeStat
                  label="Cost Per Lead"
                  value={formatCurrency(metrics.costPerLead)}
                />
                <BadgeStat
                  label="Cost Per Case"
                  value={formatCurrency(metrics.cpa)}
                />
                <BadgeStat
                  label="Lead to Case Ratio"
                  value={`${campaign.manualStats.leads > 0 ? ((campaign.manualStats.cases / campaign.manualStats.leads) * 100).toFixed(1) : "0"}%`}
                />
                <BadgeStat
                  label="Avg. Revenue Per Case"
                  value={campaign.manualStats.cases > 0 
                    ? formatCurrency(campaign.manualStats.revenue / campaign.manualStats.cases) 
                    : "$0.00"}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-md border-accent/30">
          <CardHeader className="bg-card/50 border-b pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Campaign Targets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-accent/10 rounded-lg p-4">
                <span className="text-sm text-muted-foreground block mb-1">Monthly Target</span>
                <span className="text-xl font-semibold">{campaign.targets.monthlyRetainers} Cases</span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <span className="text-sm text-muted-foreground block mb-1">Case Payout</span>
                <span className="text-xl font-semibold">{formatCurrency(campaign.targets.casePayoutAmount)}</span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <span className="text-sm text-muted-foreground block mb-1">Target ROAS</span>
                <span className="text-xl font-semibold">{campaign.targets.targetROAS}%</span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4">
                <span className="text-sm text-muted-foreground block mb-1">Target Profit</span>
                <span className="text-xl font-semibold">{formatCurrency(campaign.targets.targetProfit)}</span>
              </div>
            </div>
            
            <div className="mt-6">
              <GoogleAdsMetrics campaign={campaign} />
            </div>
            
            <div className="mt-6 bg-accent/5 rounded-lg p-6 border">
              <h4 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Performance vs. Targets</h4>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">ROAS</span>
                    <div className="flex items-center gap-2">
                      <span className={metrics.roi >= campaign.targets.targetROAS ? "text-success-DEFAULT font-bold" : "text-error-DEFAULT font-bold"}>
                        {metrics.roi.toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground text-xs">vs {campaign.targets.targetROAS}%</span>
                    </div>
                  </div>
                  <Progress 
                    value={roiProgress} 
                    variant={getRoiVariant()} 
                    size="md" 
                    showValue 
                    valuePosition="inside"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Cases</span>
                    <div className="flex items-center gap-2">
                      <span className={campaign.manualStats.cases >= campaign.targets.monthlyRetainers ? "text-success-DEFAULT font-bold" : "text-error-DEFAULT font-bold"}>
                        {campaign.manualStats.cases}
                      </span>
                      <span className="text-muted-foreground text-xs">vs {campaign.targets.monthlyRetainers}</span>
                    </div>
                  </div>
                  <Progress 
                    value={casesProgress} 
                    variant={getCasesVariant()} 
                    size="md" 
                    showValue 
                    valuePosition="inside"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Profit</span>
                    <div className="flex items-center gap-2">
                      <span className={metrics.profit >= campaign.targets.targetProfit ? "text-success-DEFAULT font-bold" : "text-error-DEFAULT font-bold"}>
                        {formatCurrency(metrics.profit)}
                      </span>
                      <span className="text-muted-foreground text-xs">vs {formatCurrency(campaign.targets.targetProfit)}</span>
                    </div>
                  </div>
                  <Progress 
                    value={profitProgress} 
                    variant={getProfitVariant()} 
                    size="md" 
                    showValue 
                    valuePosition="inside"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="shadow-md border-accent/30">
        <CardHeader className="bg-card/50 border-b pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Stats History
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsDailyStatsDialogOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {campaign.statsHistory && campaign.statsHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium">Leads</TableHead>
                    <TableHead className="font-medium">Cases</TableHead>
                    <TableHead className="font-medium">Ad Spend</TableHead>
                    <TableHead className="font-medium">Revenue</TableHead>
                    <TableHead className="font-medium">Added On</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.statsHistory.map((entry) => (
                    <TableRow key={entry.id} className="hover:bg-accent/5">
                      <TableCell className="font-medium">{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{entry.leads}</TableCell>
                      <TableCell>{entry.cases}</TableCell>
                      <TableCell>{formatCurrency(entry.adSpend || 0)}</TableCell>
                      <TableCell>{formatCurrency(entry.revenue)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(entry.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditEntry(entry)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteEntryConfirm(entry.id)}
                              className="text-error-DEFAULT"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 bg-muted/10 rounded-lg border border-dashed">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-2 opacity-50" />
              <p className="text-muted-foreground">No history records yet. Add daily stats to track your campaign's performance over time.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsDailyStatsDialogOpen(true)}
                className="mt-4"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Your First Entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDailyStatsDialogOpen} onOpenChange={setIsDailyStatsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Daily Stats</DialogTitle>
            <DialogDescription>
              Enter performance metrics for {campaign.name} for a specific date. 
              These values will be added to the existing totals.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date-picker" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date-picker"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, "PPP")
                      ) : (
                        <span>Select date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <div className="p-1">
                      <input
                        type="date"
                        className="form-input w-full p-2 rounded-md border"
                        value={format(selectedDate, "yyyy-MM-dd")}
                        onChange={(e) => {
                          const date = new Date(e.target.value);
                          if (!isNaN(date.getTime())) {
                            setSelectedDate(date);
                          }
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="daily-leads" className="text-right">
                Leads
              </Label>
              <Input
                id="daily-leads"
                type="number"
                value={dailyStats.leads}
                onChange={(e) => setDailyStats({...dailyStats, leads: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="daily-cases" className="text-right">
                Cases
              </Label>
              <Input
                id="daily-cases" 
                type="number"
                value={dailyStats.cases}
                onChange={(e) => setDailyStats({...dailyStats, cases: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="daily-adspend" className="text-right">
                Ad Spend ($)
              </Label>
              <Input
                id="daily-adspend"
                type="number" 
                value={dailyStats.adSpend}
                onChange={(e) => setDailyStats({...dailyStats, adSpend: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="daily-revenue" className="text-right">
                Revenue ($)
              </Label>
              <Input
                id="daily-revenue"
                type="number" 
                value={dailyStats.revenue}
                onChange={(e) => setDailyStats({...dailyStats, revenue: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDailyStatsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDailyStats}>
              Add Stats
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={editEntryDialogOpen} onOpenChange={setEditEntryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Stats Entry</DialogTitle>
            <DialogDescription>
              Modify the values for this stats entry. This will automatically update campaign totals.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-leads" className="text-right">
                Leads
              </Label>
              <Input
                id="edit-leads"
                type="number"
                value={editEntryData.leads}
                onChange={(e) => setEditEntryData({...editEntryData, leads: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-cases" className="text-right">
                Cases
              </Label>
              <Input
                id="edit-cases" 
                type="number"
                value={editEntryData.cases}
                onChange={(e) => setEditEntryData({...editEntryData, cases: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-adspend" className="text-right">
                Ad Spend ($)
              </Label>
              <Input
                id="edit-adspend"
                type="number" 
                value={editEntryData.adSpend}
                onChange={(e) => setEditEntryData({...editEntryData, adSpend: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-revenue" className="text-right">
                Revenue ($)
              </Label>
              <Input
                id="edit-revenue"
                type="number" 
                value={editEntryData.revenue}
                onChange={(e) => setEditEntryData({...editEntryData, revenue: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditedEntry}>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={deleteEntryDialogOpen} onOpenChange={setDeleteEntryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Stats Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this stats entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEntryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDeleteEntry} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignDetail;
