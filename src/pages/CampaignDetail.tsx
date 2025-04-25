
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent, sortStatHistoryByDate } from "@/utils/campaignUtils";
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
  Plus,
  TrendingUp,
  BarChart3,
  CreditCard,
  Percent,
  Save,
  X,
  CalendarDays,
  Target,
  Check,
  Clock,
  FileText,
  Wallet,
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
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { CampaignPerformanceSection } from "@/components/campaigns/CampaignPerformanceSection";
import { formatDateForStorage, parseStoredDate, format } from "@/lib/utils/ManualDateUtils";
import { StatsHistoryTable } from "@/components/campaigns/StatsHistoryTable";
import { StatHistoryEntry } from "@/types/campaign";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
    deleteStatHistoryEntries,
    dateRange, 
    setDateRange 
  } = useCampaign();
  
  useEffect(() => {
    if (id) {
      setSelectedCampaignId(id);
    }
  }, [id, setSelectedCampaignId]);
  
  const campaign = campaigns.find((c) => c.id === id);
  
  const [isEditing, setIsEditing] = useState(false);
  const [leadCount, setLeadCount] = useState("0");
  const [caseCount, setCaseCount] = useState("0");
  const [revenue, setRevenue] = useState("0");
  
  // Stats dialog states
  const [isDailyStatsDialogOpen, setIsDailyStatsDialogOpen] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    leads: "0",
    cases: "0",
    revenue: "0",
    adSpend: "0"
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Entry editing states
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
  
  // Title editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  
  // Deletion states
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [deleteEntryDialogOpen, setDeleteEntryDialogOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState("");
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  // Calculate metrics consistently using the utility function
  const metrics = useMemo(() => {
    if (!campaign) {
      return {
        revenue: 0,
        leads: 0,
        cases: 0,
        adSpend: 0,
        costPerLead: 0,
        cpa: 0,
        profit: 0,
        roi: 0,
        earningsPerLead: 0,
        conversionRate: 0,
        profitMargin: 0
      };
    }
    
    console.log('CampaignDetail - Calculating metrics with date range:', dateRange);
    return calculateMetrics(campaign, dateRange);
  }, [campaign, dateRange]);

  console.log('CampaignDetail - Calculated metrics:', metrics);
  
  // Update form fields when campaign changes
  useEffect(() => {
    if (campaign) {
      setLeadCount(campaign.manualStats.leads.toString());
      setCaseCount(campaign.manualStats.cases.toString());
      setRevenue(campaign.manualStats.revenue.toString());
    }
  }, [campaign]);
  
  if (!campaign) {
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

  // Helper functions for styling
  const getRoiClass = () => {
    if (metrics.roi > 200) return "text-success-DEFAULT";
    if (metrics.roi > 0) return "text-secondary"; 
    return "text-error-DEFAULT";
  };
  
  const getRoiVariant = () => {
    if (metrics.roi >= 100) return "success";
    if (metrics.roi >= 70) return "warning";
    return "error";
  };
  
  const getCasesVariant = () => {
    const casesProgress = Math.min(Math.round((campaign.manualStats.cases / campaign.targets.monthlyRetainers) * 100), 100);
    if (casesProgress >= 100) return "success";
    if (casesProgress >= 70) return "warning";
    return "error";
  };
  
  const getProfitVariant = () => {
    const profitProgress = Math.min(Math.round((metrics.profit / campaign.targets.targetProfit) * 100), 100);
    if (profitProgress >= 100) return "success";
    if (profitProgress >= 70) return "warning";
    return "error";
  };
  
  // Calculated values
  const profitPerCase = metrics.cases > 0 ? metrics.profit / metrics.cases : 0;
  const roiProgress = Math.min(Math.round((metrics.roi / campaign.targets.targetROAS) * 100), 100);
  const casesProgress = Math.min(Math.round((metrics.cases / campaign.targets.monthlyRetainers) * 100), 100);
  const profitProgress = Math.min(Math.round((metrics.profit / campaign.targets.targetProfit) * 100), 100);

  // Handler functions
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
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };
  
  const onEditCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setEditDate(date);
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
    
    const formattedDate = formatDateForStorage(selectedDate);
    
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
  };
  
  const handleEditEntry = (entry: StatHistoryEntry) => {
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
      
      // Convert the date string to a Date object
      const entryDate = parseStoredDate(entry.date);
      setEditDate(entryDate);
      setEditEntryDialogOpen(true);
    }, 100);
  };
  
  const handleSaveEditedEntry = () => {
    if (!editingEntryId) return;
    
    const entry = campaign.statsHistory.find(e => e.id === editingEntryId);
    if (!entry) return;
    
    const formattedDate = formatDateForStorage(editDate);
    
    const updatedEntry = {
      ...entry,
      id: editingEntryId,
      date: formattedDate,
      leads: parseInt(editEntryData.leads) || 0,
      cases: parseInt(editEntryData.cases) || 0,
      retainers: parseInt(editEntryData.cases) || 0,
      revenue: parseFloat(editEntryData.revenue) || 0,
      adSpend: parseFloat(editEntryData.adSpend) || 0
    };
    
    updateStatHistoryEntry(campaign.id, updatedEntry);
    
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
    setDeleteConfirmMessage("Are you sure you want to delete this entry? This action cannot be undone.");
    setIsDeletingBulk(false);
    setDeleteEntryDialogOpen(true);
  };
  
  const confirmDeleteEntry = async () => {
    if (!entryToDelete || !id) {
      toast.error("Missing entry or campaign information");
      return;
    }
    
    setIsDeletingEntry(true);
    
    try {
      await deleteStatHistoryEntry(campaign.id, entryToDelete);
      toast.success("Stat entry deleted successfully");
      setSelectedEntries([]);
      setDeleteEntryDialogOpen(false);
    } catch (error) {
      console.error("Error deleting stat entry:", error);
      toast.error("Failed to delete stat entry");
    } finally {
      setIsDeletingEntry(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.length === 0) {
      toast.error("Please select at least one entry to delete");
      return;
    }

    setDeleteConfirmMessage(`Are you sure you want to delete ${selectedEntries.length} selected entries? This action cannot be undone.`);
    setIsDeletingBulk(true);
    setDeleteEntryDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (!id || selectedEntries.length === 0) {
      toast.error("No entries selected for deletion");
      return;
    }
    
    setIsDeletingEntry(true);
    
    try {
      await deleteStatHistoryEntries(campaign.id, selectedEntries);
      toast.success(`${selectedEntries.length} stat entries deleted successfully`);
      setSelectedEntries([]);
      setDeleteEntryDialogOpen(false);
    } catch (error) {
      console.error("Error deleting stat entries:", error);
      toast.error("Failed to delete stat entries");
    } finally {
      setIsDeletingEntry(false);
    }
  };

  const handleEditTitle = () => {
    if (campaign) {
      setEditedTitle(campaign.name);
      setIsEditingTitle(true);
    }
  };

  const handleSaveTitle = async () => {
    if (campaign && editedTitle.trim()) {
      await updateCampaign(campaign.id, {
        name: editedTitle.trim()
      });
      setIsEditingTitle(false);
    }
  };

  const handleCancelTitleEdit = () => {
    setIsEditingTitle(false);
    if (campaign) {
      setEditedTitle(campaign.name);
    }
  };

  const handleEntrySelect = (entryId: string) => {
    setSelectedEntries(prev => {
      if (prev.includes(entryId)) {
        return prev.filter(id => id !== entryId);
      } else {
        return [...prev, entryId];
      }
    });
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
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="text-2xl font-bold h-12 w-[300px]"
                placeholder="Campaign name"
                autoFocus
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSaveTitle}
                disabled={!editedTitle.trim()}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelTitleEdit}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1 
              className="text-3xl font-bold flex items-center gap-2 cursor-pointer group"
              onClick={handleEditTitle}
            >
              {campaign.name}
              <Edit className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h1>
          )}
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
      
      <CampaignPerformanceSection campaign={campaign} />
      
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
                <span className="text-2xl font-bold">{formatCurrency(metrics.revenue)}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Ad Spend</span>
                <span className="text-2xl font-bold">{formatCurrency(metrics.adSpend)}</span>
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
                <span className="text-2xl font-bold">{formatNumber(metrics.leads)}</span>
              </div>
              <div>
                <span className="text-sm text-muted-foreground block">Cases</span>
                <span className="text-2xl font-bold">{formatNumber(metrics.cases)}</span>
              </div>
            </div>
            <div className="pt-4 mt-4 border-t">
              <div className="flex justify-between mb-2">
                <span className="font-medium">Target Cases</span>
                <span className="font-bold">{metrics.cases} of {campaign.targets.monthlyRetainers}</span>
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
            <span className={`text-xl font-semibold ${metrics.earningsPerLead > 0 ? "text-success-DEFAULT" : ""}`}>
              {formatCurrency(metrics.earningsPerLead)}
            </span>
          </div>
          
          <div className="flex flex-col items-center bg-background/60 p-4 rounded-lg border border-accent/10">
            <Target className="h-5 w-5 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground">Conversion Rate</span>
            <span className="text-xl font-semibold">
              {formatPercent(metrics.conversionRate)}
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
      
      <div className="space-y-6">
        <Card className="shadow-md border-accent/30 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3">
            <CardTitle className="text-lg font-medium flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Manual Stats Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="leads">Total Leads</Label>
                <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                  <span className="text-sm text-muted-foreground block mb-1">Leads</span>
                  <span className="text-xl font-semibold">
                    {isEditing ? (
                      <Input
                        id="leads"
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cases">Total Cases</Label>
                <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                  <span className="text-sm text-muted-foreground block mb-1">Cases</span>
                  <span className="text-xl font-semibold">
                    {isEditing ? (
                      <Input
                        id="cases"
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
              
              <div className="space-y-2">
                <Label htmlFor="revenue">Total Revenue</Label>
                <div className="bg-accent/10 rounded-lg p-4 shadow-sm">
                  <span className="text-sm text-muted-foreground block mb-1">Revenue</span>
                  <span className="text-xl font-semibold">
                    {isEditing ? (
                      <Input
                        id="revenue"
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
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Key Metrics</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  label="Lead to Case Conversion"
                  value={formatPercent(metrics.conversionRate)}
                  className="bg-background/50"
                />
                <BadgeStat
                  label="Avg. Revenue Per Case"
                  value={metrics.cases > 0 
                    ? formatCurrency(metrics.revenue / metrics.cases)
                    : "$0"}
                  className="bg-background/50"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6">
          <StatsHistoryTable
            entries={campaign.statsHistory || []}
            dateRange={dateRange}
            onEdit={handleEditEntry}
            onDelete={handleDeleteEntryConfirm}
            selectedEntries={selectedEntries}
            onSelectEntry={handleEntrySelect}
            onBulkDelete={handleBulkDelete}
          />
        </div>
      </div>
      
      {/* Add Stats Dialog */}
      <Dialog open={isDailyStatsDialogOpen} onOpenChange={setIsDailyStatsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Daily Stats</DialogTitle>
            <DialogDescription>
              Enter the daily statistics for this campaign.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stat-date" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="stat-date"
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {selectedDate ? (
                        format(selectedDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={onCalendarSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stat-leads" className="text-right">
                Leads
              </Label>
              <Input
                id="stat-leads"
                type="number"
                placeholder="0"
                value={dailyStats.leads}
                onChange={(e) => setDailyStats({...dailyStats, leads: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stat-cases" className="text-right">
                Cases
              </Label>
              <Input
                id="stat-cases"
                type="number"
                placeholder="0"
                value={dailyStats.cases}
                onChange={(e) => setDailyStats({...dailyStats, cases: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stat-revenue" className="text-right">
                Revenue
              </Label>
              <Input
                id="stat-revenue"
                type="number"
                placeholder="0"
                value={dailyStats.revenue}
                onChange={(e) => setDailyStats({...dailyStats, revenue: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="stat-adspend" className="text-right">
                Ad Spend
              </Label>
              <Input
                id="stat-adspend"
                type="number"
                placeholder="0"
                value={dailyStats.adSpend}
                onChange={(e) => setDailyStats({...dailyStats, adSpend: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDailyStatsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDailyStats}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Entry Dialog */}
      <Dialog open={editEntryDialogOpen} onOpenChange={setEditEntryDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Stats Entry</DialogTitle>
            <DialogDescription>
              Update the statistics for this entry.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-date" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="edit-date"
                      variant={"outline"}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editDate}
                      onSelect={onEditCalendarSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-leads" className="text-right">
                Leads
              </Label>
              <Input
                id="edit-leads"
                type="number"
                placeholder="0"
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
                placeholder="0"
                value={editEntryData.cases}
                onChange={(e) => setEditEntryData({...editEntryData, cases: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-revenue" className="text-right">
                Revenue
              </Label>
              <Input
                id="edit-revenue"
                type="number"
                placeholder="0"
                value={editEntryData.revenue}
                onChange={(e) => setEditEntryData({...editEntryData, revenue: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-adspend" className="text-right">
                Ad Spend
              </Label>
              <Input
                id="edit-adspend"
                type="number"
                placeholder="0"
                value={editEntryData.adSpend}
                onChange={(e) => setEditEntryData({...editEntryData, adSpend: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleCancelEditEntry}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteEntryConfirm(editingEntryId!)}
              className="mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button onClick={handleSaveEditedEntry}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Entry Alert Dialog */}
      <AlertDialog open={deleteEntryDialogOpen} onOpenChange={setDeleteEntryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingEntry}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={isDeletingBulk ? confirmBulkDelete : confirmDeleteEntry} 
              disabled={isDeletingEntry}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingEntry ? (
                <>Loading...</>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CampaignDetail;
