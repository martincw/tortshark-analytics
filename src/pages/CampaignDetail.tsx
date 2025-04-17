import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeStat } from "@/components/ui/badge-stat";
import { StatCard } from "@/components/ui/stat-card";
import { CustomProgressBar } from "@/components/ui/custom-progress-bar";
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
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Wallet,
  TrendingDown,
  LineChart,
  BarChart,
  CircleDollarSign,
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
import { format, parseISO, isValid } from "date-fns";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import GoogleAdsMetrics from "@/components/campaigns/GoogleAdsMetrics";
import { DatePicker } from "@/components/ui/date-picker";
import { CampaignPerformanceSection } from "@/components/campaigns/CampaignPerformanceSection";
import { CaseAttributionForm } from "@/components/campaigns/CaseAttributionForm";

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
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryData, setEditEntryData] = useState({
    leads: "0",
    cases: "0",
    revenue: "0",
    adSpend: "0"
  });
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date>(new Date());
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
  
  const onCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(12, 0, 0, 0);
      
      console.log("Selected date in add dialog:", normalizedDate);
      setSelectedDate(normalizedDate);
      setCalendarOpen(false);
    }
  };
  
  const onEditCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const normalizedDate = new Date(date);
      normalizedDate.setHours(12, 0, 0, 0);
      
      console.log("Selected edit date:", normalizedDate);
      setEditDate(normalizedDate);
      setEditCalendarOpen(false);
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
    
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    
    console.log("Adding new stats history entry:", {
      campaignId: campaign.id,
      date: formattedDate,
      leads: newLeads,
      cases: newCases,
      revenue: newRevenue,
      adSpend: newAdSpend
    });
    
    addStatHistoryEntry(campaign.id, {
      date: formattedDate,
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
    console.log("Editing entry:", entry);
    
    // Reset states first to avoid UI issues
    setEditEntryDialogOpen(false);
    setEditingEntryId(null);
    
    setTimeout(() => {
      setEditingEntryId(entry.id);
      setEditEntryData({
        leads: entry.leads.toString(),
        cases: entry.cases.toString(), 
        revenue: entry.revenue.toString(),
        adSpend: (entry.adSpend || 0).toString()
      });
      
      // Parse the date from entry.date
      let entryDate: Date;
      try {
        entryDate = parseISO(entry.date);
        if (!isValid(entryDate)) {
          console.warn(`Invalid date from entry: ${entry.date}, using current date instead`);
          entryDate = new Date();
        }
      } catch (error) {
        console.error(`Error parsing date: ${entry.date}`, error);
        entryDate = new Date();
      }
      
      console.log("Original entry date:", entry.date, "Parsed date:", entryDate);
      setEditDate(entryDate);
      
      setEditEntryDialogOpen(true);
    }, 100);
  };
  
  const handleSaveEditedEntry = () => {
    if (!editingEntryId) return;
    
    const entry = campaign.statsHistory.find(e => e.id === editingEntryId);
    if (!entry) return;
    
    console.log("Saving edited entry. Current edit date:", editDate);
    
    const formattedDate = format(editDate, "yyyy-MM-dd");
    
    console.log("Formatted date to save:", formattedDate);
    
    const updatedEntry = {
      ...entry,
      date: formattedDate,
      leads: parseInt(editEntryData.leads) || 0,
      cases: parseInt(editEntryData.cases) || 0,
      retainers: parseInt(editEntryData.cases) || 0,
      revenue: parseFloat(editEntryData.revenue) || 0,
      adSpend: parseFloat(editEntryData.adSpend) || 0
    };
    
    console.log("Updating entry with:", updatedEntry);
    
    updateStatHistoryEntry(campaign.id, updatedEntry);
    toast.success("Entry updated successfully");
    
    setEditEntryDialogOpen(false);
    setEditingEntryId(null);
    setEditCalendarOpen(false);
  };
  
  const handleCancelEditEntry = () => {
    setEditEntryDialogOpen(false);
    setEditingEntryId(null);
    setEditCalendarOpen(false);
  };
  
  const handleDeleteEntryConfirm = (entryId: string) => {
    setEditEntryDialogOpen(false);
    setEditingEntryId(null);
    
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
  
  const profitPerCase = campaign.manualStats.cases > 0 
    ? metrics.profit / campaign.manualStats.cases 
    : 0;

  const formatSafeDate = (dateString: string, formatStr: string = "PP"): string => {
    try {
      const date = parseISO(dateString);
      
      if (!isValid(date)) {
        console.warn(`Invalid date after parsing: ${dateString}`);
        return "Invalid date";
      }
      
      return format(date, formatStr);
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error);
      return "Invalid date";
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button
            onClick={() => navigate("/campaigns")}
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground px-0 mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Campaigns
          </Button>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker />
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
                Add Stats
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
      </div>
      
      <div className="bg-gradient-to-br from-card/90 to-accent/10 rounded-xl p-6 shadow-md border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-2 bg-background/50 p-5 rounded-lg shadow-sm border border-accent/20">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-6 w-6 text-primary opacity-80" />
              <h3 className="text-lg font-semibold">Financial Overview</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground block">Revenue</span>
                <span className="text-2xl font-bold">{formatCurrency(campaign.manualStats.revenue)}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Ad Spend</span>
                <span className="text-2xl font-bold">{formatCurrency(campaign.stats.adSpend)}</span>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Profit</span>
                <span className={`font-bold ${getRoiClass()}`}>{formatCurrency(metrics.profit)}</span>
              </div>
              <CustomProgressBar
                value={profitProgress}
                variant={getProfitVariant()}
                size="md"
                showValue
                valuePosition="right"
              />
            </div>
          </div>
          
          <div className="space-y-2 bg-background/50 p-5 rounded-lg shadow-sm border border-accent/20">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-6 w-6 text-primary opacity-80" />
              <h3 className="text-lg font-semibold">Case Acquisition</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground block">Leads</span>
                <span className="text-2xl font-bold">{formatNumber(campaign.manualStats.leads)}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Cases</span>
                <span className="text-2xl font-bold">{formatNumber(campaign.manualStats.cases)}</span>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Target Cases</span>
                <span className="font-bold">{campaign.manualStats.cases} of {campaign.targets.monthlyRetainers}</span>
              </div>
              <CustomProgressBar
                value={casesProgress}
                variant={getCasesVariant()}
                size="md"
                showValue
                valuePosition="right"
              />
            </div>
          </div>
          
          <div className="space-y-2 bg-background/50 p-5 rounded-lg shadow-sm border border-accent/20">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-6 w-6 text-primary opacity-80" />
              <h3 className="text-lg font-semibold">ROI Performance</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground block">ROI</span>
                <span className={`text-2xl font-bold ${getRoiClass()}`}>{metrics.roi.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Profit Per Case</span>
                <span className={`text-2xl font-bold ${profitPerCase > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
                  {formatCurrency(profitPerCase)}
                </span>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Target ROI</span>
                <span className="font-bold">{metrics.roi.toFixed(1)}% of {campaign.targets.targetROAS}%</span>
              </div>
              <CustomProgressBar
                value={roiProgress}
                variant={getRoiVariant()}
                size="md"
                showValue
                valuePosition="right"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t">
          <div className="flex flex-col items-center bg-background/60 p-4 rounded-lg border border-accent/10">
            <Clock className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Cost Per Lead</span>
            <span className={`text-xl font-semibold ${metrics.costPerLead > 50 ? "text-warning-DEFAULT" : ""}`}>
              {formatCurrency(metrics.costPerLead)}
            </span>
          </div>
          
          <div className="flex flex-col items-center bg-background/60 p-4 rounded-lg border border-accent/10">
            <FileText className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Cost Per Case</span>
            <span className={`text-xl font-semibold ${metrics.cpa < campaign.targets.casePayoutAmount ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
              {formatCurrency(metrics.cpa)}
            </span>
          </div>
          
          <div className="flex flex-col items-center bg-background/60 p-4 rounded-lg border border-accent/10">
            <Wallet className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Earnings Per Lead</span>
            <span className={`text-xl font-semibold ${campaign.manualStats.leads > 0 && campaign.manualStats.revenue / campaign.manualStats.leads > metrics.costPerLead ? "text-success-DEFAULT" : ""}`}>
              {campaign.manualStats.leads > 0 
                ? formatCurrency(campaign.manualStats.revenue / campaign.manualStats.leads) 
                : "$0.00"}
            </span>
          </div>
          
          <div className="flex flex-col items-center bg-background/60 p-4 rounded-lg border border-accent/10">
            <Target className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Conversion Rate</span>
            <span className="text-xl font-semibold">
              {campaign.manualStats.leads > 0 
                ? `${((campaign.manualStats.cases / campaign.manualStats.leads) * 100).toFixed(1)}%` 
                : "0%"}
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
          className="shadow-md border-2 border-accent/20 bg-gradient-to-br from-background to-accent/5"
          isHighlighted={true}
          valueClassName={getRoiClass()}
        />
        
        <StatCard
          title="Campaign Profit"
          value={formatCurrency(metrics.profit)}
          icon={<CreditCard className="h-5 w-5" />}
          trend={metrics.profit > 0 ? "up" : "down"}
          trendValue={metrics.profit > 5000 ? "High Performer" : metrics.profit > 0 ? "Profitable" : "Loss"}
          className="shadow-md border-2 border-accent/20 bg-gradient-to-br from-background to-accent/5"
          isHighlighted={true}
          valueClassName={getRoiClass()}
        />
        
        <StatCard
          title="Profit Per Case"
          value={formatCurrency(profitPerCase)}
          icon={<CircleDollarSign className="h-5 w-5" />}
          trend={profitPerCase > campaign.targets.casePayoutAmount / 2 ? "up" : "down"}
          trendValue={profitPerCase > campaign.targets.casePayoutAmount ? "Excellent" : "Average"}
          className="shadow-md border-2 border-accent/20 bg-gradient-to-br from-background to-accent/5"
          isHighlighted={true}
          valueClassName={profitPerCase > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-md border-accent/30 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Performance Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                <span className="text-sm text-muted-foreground block mb-1">Ad Spend</span>
                <span className="text-xl font-semibold">{formatCurrency(campaign.stats.adSpend)}</span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
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
              <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
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
              <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
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
                  className="bg-background/50"
                />
                <BadgeStat
                  label="Cost Per Case"
                  value={formatCurrency(metrics.cpa)}
                  className="bg-background/50"
                />
                <BadgeStat
                  label="Lead to Case Ratio"
                  value={`${campaign.manualStats.leads > 0 ? ((campaign.manualStats.cases / campaign.manualStats.leads) * 100).toFixed(1) : "0"}%`}
                  className="bg-background/50"
                />
                <BadgeStat
                  label="Avg. Revenue Per Case"
                  value={campaign.manualStats.cases > 0 
                    ? formatCurrency(campaign.manualStats.revenue / campaign.manualStats.cases) 
                    : "$0.00"}
                  className="bg-background/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-md border-accent/30 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Campaign Targets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                <span className="text-sm text-muted-foreground block mb-1">Monthly Target</span>
                <span className="text-xl font-semibold">{campaign.targets.monthlyRetainers} Cases</span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                <span className="text-sm text-muted-foreground block mb-1">Case Payout</span>
                <span className="text-xl font-semibold">{formatCurrency(campaign.targets.casePayoutAmount)}</span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                <span className="text-sm text-muted-foreground block mb-1">Target ROAS</span>
                <span className="text-xl font-semibold">{campaign.targets.targetROAS}%</span>
              </div>
              <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                <span className="text-sm text-muted-foreground block mb-1">Target Profit</span>
                <span className="text-xl font-semibold">{formatCurrency(campaign.targets.targetProfit)}</span>
              </div>
            </div>
            
            <div className="mt-6">
              <GoogleAdsMetrics campaign={campaign} />
            </div>
            
            <div className="mt-6 bg-gradient-to-br from-background to-accent/10 rounded-lg p-6 border shadow-sm">
              <h4 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Performance vs. Targets</h4>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      ROAS
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={metrics.roi >= campaign.targets.targetROAS ? "text-success-DEFAULT font-bold" : "text-error-DEFAULT font-bold"}>
                        {metrics.roi.toFixed(1)}%
                      </span>
                      <span className="text-muted-foreground text-xs">vs {campaign.targets.targetROAS}%</span>
                    </div>
                  </div>
                  <CustomProgressBar 
                    value={roiProgress} 
                    variant={getRoiVariant()} 
                    size="md" 
                    showValue 
                    valuePosition="inside"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-1">
                      <FileCheck className="h-4 w-4 text-muted-foreground" />
                      Cases
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={campaign.manualStats.cases >= campaign.targets.monthlyRetainers ? "text-success-DEFAULT font-bold" : "text-error-DEFAULT font-bold"}>
                        {campaign.manualStats.cases}
                      </span>
                      <span className="text-muted-foreground text-xs">vs {campaign.targets.monthlyRetainers}</span>
                    </div>
                  </div>
                  <CustomProgressBar 
                    value={casesProgress} 
                    variant={getCasesVariant()} 
                    size="md" 
                    showValue 
                    valuePosition="inside"
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      Profit
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={metrics.profit >= campaign.targets.targetProfit ? "text-success-DEFAULT font-bold" : "text-error-DEFAULT font-bold"}>
                        {formatCurrency(metrics.profit)}
                      </span>
                      <span className="text-muted-foreground text-xs">vs {formatCurrency(campaign.targets.targetProfit)}</span>
                    </div>
                  </div>
                  <CustomProgressBar 
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
      
      <Card className="shadow-md border-accent/30 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            Stats History
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setEditEntryDialogOpen(false);
              setEditingEntryId(null);
              setIsDailyStatsDialogOpen(true);
            }}
            className="shadow-sm"
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
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium">Leads</TableHead>
                    <TableHead className="font-medium">Cases</TableHead>
                    <TableHead className="font-medium">Ad Spend</TableHead>
                    <TableHead className="font-medium">Revenue</TableHead>
                    <TableHead className="font-medium">Added On</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...campaign.statsHistory]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {formatSafeDate(entry.date, "PP")}
                        </TableCell>
                        <TableCell>{entry.leads}</TableCell>
                        <TableCell>{entry.cases}</TableCell>
                        <TableCell>{formatCurrency(entry.adSpend || 0)}</TableCell>
                        <TableCell>{formatCurrency(entry.revenue)}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatSafeDate(entry.createdAt, "PP")}
                        </TableCell>
                        <TableCell className="text-right p-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditEntry(entry)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteEntryConfirm(entry.id)}>
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
            <div className="text-center py-8 text-muted-foreground">
              No stats history available
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="shadow-md border-accent/30 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Case Attribution
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <CaseAttributionForm 
            campaignId={campaign.id}
            onAttributionAdded={() => {
              // Replace this with a refresh method that exists in your context
              // or just remove it if not needed for now
              // fetchCampaigns();
            }}
          />
        </CardContent>
      </Card>
      
      <CampaignPerformanceSection campaign={campaign} />
      
      <Dialog open={isDailyStatsDialogOpen} onOpenChange={setIsDailyStatsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Daily Stats</DialogTitle>
            <DialogDescription>
              Enter the stats for a specific date to track your campaign performance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="daily-date">Date</Label>
              <DatePicker
                date={selectedDate} 
                onSelect={onCalendarSelect}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="daily-leads">Leads</Label>
                <Input
                  id="daily-leads"
                  type="number"
                  value={dailyStats.leads}
                  onChange={(e) => setDailyStats({...dailyStats, leads: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="daily-cases">Cases</Label>
                <Input
                  id="daily-cases"
                  type="number"
                  value={dailyStats.cases}
                  onChange={(e) => setDailyStats({...dailyStats, cases: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="daily-revenue">Revenue</Label>
                <Input
                  id="daily-revenue"
                  type="number"
                  value={dailyStats.revenue}
                  onChange={(e) => setDailyStats({...dailyStats, revenue: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="daily-ad-spend">Ad Spend</Label>
                <Input
                  id="daily-ad-spend"
                  type="number"
                  value={dailyStats.adSpend}
                  onChange={(e) => setDailyStats({...dailyStats, adSpend: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDailyStatsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDailyStats}>Save Stats</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={editEntryDialogOpen} onOpenChange={handleCancelEditEntry}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Stats Entry</DialogTitle>
            <DialogDescription>
              Update the stats for this entry.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <DatePicker
                date={editDate} 
                onSelect={onEditCalendarSelect}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-leads">Leads</Label>
                <Input
                  id="edit-leads"
                  type="number"
                  value={editEntryData.leads}
                  onChange={(e) => setEditEntryData({...editEntryData, leads: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-cases">Cases</Label>
                <Input
                  id="edit-cases"
                  type="number"
                  value={editEntryData.cases}
                  onChange={(e) => setEditEntryData({...editEntryData, cases: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-revenue">Revenue</Label>
                <Input
                  id="edit-revenue"
                  type="number"
                  value={editEntryData.revenue}
                  onChange={(e) => setEditEntryData({...editEntryData, revenue: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-ad-spend">Ad Spend</Label>
                <Input
                  id="edit-ad-spend"
                  type="number"
                  value={editEntryData.adSpend}
                  onChange={(e) => setEditEntryData({...editEntryData, adSpend: e.target.value})}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEditEntry}>Cancel</Button>
            <Button onClick={handleSaveEditedEntry}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={deleteEntryDialogOpen} onOpenChange={setDeleteEntryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEntryDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteEntry}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignDetail;
