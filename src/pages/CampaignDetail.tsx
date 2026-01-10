import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent, getRoasClass } from "@/utils/campaignUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  Save,
  X,
  CalendarDays,
  Check,
  Loader2,
  ChevronDown,
  AlertCircle,
  PlusCircle,
  Calendar,
  MoreVertical,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CampaignPerformanceSection } from "@/components/campaigns/CampaignPerformanceSection";
import { formatDateForStorage, formatDisplayDate, isSameUTCDay, standardizeDateString } from "@/lib/utils/ManualDateUtils";
import { Checkbox } from "@/components/ui/checkbox";
import CampaignFinancialOverview from "@/components/campaigns/CampaignFinancialOverview";
import CampaignDailyAverages from "@/components/campaigns/CampaignDailyAverages";
import { BuyerStackSection } from "@/components/campaigns/BuyerStackSection";
import { FlexibleTimeComparison } from "@/components/campaigns/FlexibleTimeComparison";
import { MultiDayStatsDialog } from "@/components/dashboard/campaign-card/MultiDayStatsDialog";
import { ChannelSpendBreakdown } from "@/components/campaigns/ChannelSpendBreakdown";
import { ChannelLeadBreakdown } from "@/components/campaigns/ChannelLeadBreakdown";
import { WeeklyReturnsSection } from "@/components/campaigns/WeeklyReturnsSection";
import { useMultiDayStats } from "@/components/dashboard/campaign-card/useMultiDayStats";
import LeadCapEditor from "@/components/campaigns/LeadCapEditor";

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
  
  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  useEffect(() => {
    if (id) {
      setSelectedCampaignId(id);
      console.log("Campaign ID from URL:", id);
      console.log("Available campaigns:", campaigns.map(c => ({ id: c.id, name: c.name })));
    }
  }, [id, setSelectedCampaignId, campaigns]);
  
  const campaign = campaigns.find((c) => c.id === id);
  
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
    adSpend: "0",
    youtubeSpend: "0",
    metaSpend: "0",
    newsbreakSpend: "0"
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editEntryData, setEditEntryData] = useState({
    leads: "0",
    cases: "0", 
    revenue: "0",
    adSpend: "0",
    youtubeSpend: "0",
    metaSpend: "0",
    newsbreakSpend: "0",
    youtubeLeads: "0",
    metaLeads: "0", 
    newsbreakLeads: "0"
  });
  const [editEntryDialogOpen, setEditEntryDialogOpen] = useState(false);
  const [editCalendarOpen, setEditCalendarOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [deleteEntryDialogOpen, setDeleteEntryDialogOpen] = useState(false);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState("");
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  
  // For duplicate entry alerts
  const [duplicateEntryId, setDuplicateEntryId] = useState<string | null>(null);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  
  // State to control how many manual stats entries to show
  const [showAllStats, setShowAllStats] = useState(false);
  const STATS_PER_PAGE = 10;

  // Multi-day stats integration
  const {
    isMultiDayEntryOpen,
    selectedDates,
    dayStats,
    openMultiDayEntry,
    closeMultiDayEntry,
    handleDatesSelected,
    updateDayStats,
    handleBulkUpdateField,
    handleMultiDayStatsSubmit
  } = useMultiDayStats(id || "");

  useEffect(() => {
    console.log("Campaign state changed");
    if (campaign) {
      console.log("Found campaign:", campaign);
    }
  }, [campaign]);
  
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
  
  const metrics = useMemo(() => {
    if (!campaign) {
      return {
        leads: 0,
        cases: 0,
        retainers: 0,
        revenue: 0,
        adSpend: 0,
        profit: 0,
        roi: 0,
        roas: 0,
        cpa: 0,
        cpl: 0,
        costPerLead: 0,
        earningsPerLead: 0,
        revenuePerCase: 0,
        weekOverWeekChange: 0,
        previousWeekProfit: 0,
      };
    }
    console.log('CampaignDetail - Calculating metrics with date range:', dateRange);
    return calculateMetrics(campaign, dateRange);
  }, [campaign, dateRange]);

  // Sort stats history by date, newest first
  const sortedStatsHistory = useMemo(() => {
    if (!campaign) return [];
    return [...campaign.statsHistory].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [campaign]);
  
  // Stats to display based on show all toggle
  const displayedStats = useMemo(() => {
    return showAllStats ? sortedStatsHistory : sortedStatsHistory.slice(0, STATS_PER_PAGE);
  }, [sortedStatsHistory, showAllStats]);

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <h2 className="text-xl font-semibold">Loading campaign data...</h2>
      </div>
    );
  }

  if (id && !campaign) {
    console.log("Campaign not found for ID:", id);
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h1 className="text-2xl font-bold mb-4">Campaign not found</h1>
        <Button onClick={() => navigate("/")} variant="default">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Campaigns
        </Button>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }
  
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
      console.log("Selected date in add dialog:", date);
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };
  
  const onEditCalendarSelect = (date: Date | undefined) => {
    if (date) {
      console.log("Selected edit date:", date);
      setEditDate(date);
      setEditCalendarOpen(false);
    }
  };
  
  const checkForDuplicateEntry = (date: Date) => {
    if (!campaign) return null;
    
    const formattedDate = formatDateForStorage(date);
    const standardizedDate = standardizeDateString(formattedDate);
    
    // Find any entry with the same date
    const duplicateEntry = campaign.statsHistory.find(entry => {
      const entryDateStandardized = standardizeDateString(entry.date);
      return entryDateStandardized === standardizedDate;
    });
    
    return duplicateEntry || null;
  };
  
  const handleSaveDailyStats = () => {
    const newLeads = parseInt(dailyStats.leads) || 0;
    const newCases = parseInt(dailyStats.cases) || 0;
    const newRevenue = parseFloat(dailyStats.revenue) || 0;
    const newAdSpend = parseFloat(dailyStats.adSpend) || 0;
    const newYoutubeSpend = parseFloat(dailyStats.youtubeSpend) || 0;
    const newMetaSpend = parseFloat(dailyStats.metaSpend) || 0;
    const newNewsbreakSpend = parseFloat(dailyStats.newsbreakSpend) || 0;
    
    if (newLeads === 0 && newCases === 0 && newRevenue === 0 && newAdSpend === 0 && newYoutubeSpend === 0 && newMetaSpend === 0 && newNewsbreakSpend === 0) {
      toast.error("Please enter at least one value greater than 0");
      return;
    }
    
    // Check for duplicate entry
    const duplicateEntry = checkForDuplicateEntry(selectedDate);
    if (duplicateEntry) {
      // Show duplicate alert and set the duplicate entry ID
      setDuplicateEntryId(duplicateEntry.id);
      setShowDuplicateAlert(true);
      return;
    }
    
    const formattedDate = formatDateForStorage(selectedDate);
    
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
      adSpend: newAdSpend,
      youtubeSpend: newYoutubeSpend,
      metaSpend: newMetaSpend,
      newsbreakSpend: newNewsbreakSpend
    });
    
    setIsDailyStatsDialogOpen(false);
    toast.success("Daily stats added successfully");
    
    setDailyStats({
      leads: "0",
      cases: "0",
      revenue: "0",
      adSpend: "0",
      youtubeSpend: "0",
      metaSpend: "0",
      newsbreakSpend: "0"
    });
    
    setLeadCount((parseInt(leadCount) + newLeads).toString());
    setCaseCount((parseInt(caseCount) + newCases).toString());
    setRevenue((parseFloat(revenue) + newRevenue).toString());
  };
  
  const handleEditEntry = (entry: any) => {
    console.log("Editing entry:", entry);
    
    setEditEntryDialogOpen(false);
    setEditingEntryId(null);
    
    setTimeout(() => {
      setEditingEntryId(entry.id);
      // Handle migration case: if platform fields are all 0 but adSpend has value,
      // put the total adSpend in YouTube field for editing
      const hasAdSpend = entry.adSpend && entry.adSpend > 0;
      const hasPlatformBreakdown = (entry.youtube_spend || 0) + (entry.meta_spend || 0) + (entry.newsbreak_spend || 0) > 0;
      const hasLeadBreakdown = (entry.youtube_leads || 0) + (entry.meta_leads || 0) + (entry.newsbreak_leads || 0) > 0;
      
      setEditEntryData({
        leads: entry.leads.toString(),
        cases: entry.cases.toString(), 
        revenue: entry.revenue.toString(),
        adSpend: (entry.adSpend || 0).toString(),
        youtubeSpend: (hasPlatformBreakdown ? (entry.youtube_spend || 0) : (hasAdSpend ? entry.adSpend : 0)).toString(),
        metaSpend: (entry.meta_spend || 0).toString(),
        newsbreakSpend: (entry.newsbreak_spend || 0).toString(),
        youtubeLeads: (hasLeadBreakdown ? (entry.youtube_leads || 0) : (entry.leads || 0)).toString(),
        metaLeads: (entry.meta_leads || 0).toString(),
        newsbreakLeads: (entry.newsbreak_leads || 0).toString()
      });
      
      let entryDate: Date;
      
      console.log("Entry date from database:", entry.date);
      
      if (typeof entry.date === 'string') {
        const parts = entry.date.split('T')[0].split('-');
        if (parts.length === 3) {
          entryDate = new Date(Date.UTC(
            parseInt(parts[0], 10),
            parseInt(parts[1], 10) - 1,
            parseInt(parts[2], 10),
            12, 0, 0, 0
          ));
        } else {
          console.warn("Could not parse date parts:", parts);
          entryDate = new Date();
          entryDate.setHours(12, 0, 0, 0);
        }
      } else {
        entryDate = new Date(entry.date);
        entryDate.setHours(12, 0, 0, 0);
      }
      
      if (isNaN(entryDate.getTime())) {
        console.warn("Invalid date, using current date instead");
        entryDate = new Date();
        entryDate.setHours(12, 0, 0, 0);
      }
      
      setEditDate(entryDate);
      setEditEntryDialogOpen(true);
    }, 100);
  };
  
  const handleEditDuplicateEntry = () => {
    if (!duplicateEntryId || !campaign) return;
    
    // Find the duplicate entry in the campaign stats history
    const entry = campaign.statsHistory.find(e => e.id === duplicateEntryId);
    if (!entry) return;
    
    setShowDuplicateAlert(false);
    setIsDailyStatsDialogOpen(false);
    
    // Reset duplicate entry data
    setDuplicateEntryId(null);
    
    // Open the edit dialog for that entry
    handleEditEntry(entry);
  };
  
  const handleSaveEditedEntry = () => {
    if (!editingEntryId) return;
    
    const entry = campaign.statsHistory.find(e => e.id === editingEntryId);
    if (!entry) return;
    
    const formattedDate = formatDateForStorage(editDate);
    
    console.log("Saving edited entry date:", formattedDate);
    console.log("Original edit date object:", editDate);
    console.log("Edit entry data being saved:", editEntryData);
    
    const youtubeSpend = parseFloat(editEntryData.youtubeSpend) || 0;
    const metaSpend = parseFloat(editEntryData.metaSpend) || 0;
    const newsbreakSpend = parseFloat(editEntryData.newsbreakSpend) || 0;
    const totalAdSpend = youtubeSpend + metaSpend + newsbreakSpend;
    
    const youtubeLeads = parseInt(editEntryData.youtubeLeads) || 0;
    const metaLeads = parseInt(editEntryData.metaLeads) || 0;
    const newsbreakLeads = parseInt(editEntryData.newsbreakLeads) || 0;
    const totalLeads = youtubeLeads + metaLeads + newsbreakLeads || parseInt(editEntryData.leads) || 0;
    
    console.log("Platform spends:", { youtubeSpend, metaSpend, newsbreakSpend, totalAdSpend });
    console.log("Platform leads:", { youtubeLeads, metaLeads, newsbreakLeads, totalLeads });
    
    const updatedEntry = {
      ...entry,
      id: editingEntryId,
      date: formattedDate,
      leads: totalLeads,
      cases: parseInt(editEntryData.cases) || 0,
      retainers: parseInt(editEntryData.cases) || 0,
      revenue: parseFloat(editEntryData.revenue) || 0,
      adSpend: totalAdSpend,
      youtube_spend: youtubeSpend,
      meta_spend: metaSpend,
      newsbreak_spend: newsbreakSpend,
      youtube_leads: youtubeLeads,
      meta_leads: metaLeads,
      newsbreak_leads: newsbreakLeads
    };
    
    console.log("Full entry being updated:", updatedEntry);
    
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
    } catch (error) {
      console.error("Error deleting stat entry:", error);
      toast.error("Failed to delete stat entry");
    } finally {
      setIsDeletingEntry(false);
      setDeleteEntryDialogOpen(false);
    }
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
    } catch (error) {
      console.error("Error deleting stat entries:", error);
      toast.error("Failed to delete stat entries");
    } finally {
      setIsDeletingEntry(false);
      setDeleteEntryDialogOpen(false);
    }
  };

  const handleEditTitle = () => {
    setEditedTitle(campaign.name);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (editedTitle.trim()) {
      await updateCampaign(campaign.id, {
        name: editedTitle.trim()
      });
      setIsEditingTitle(false);
    }
  };

  const handleCancelTitleEdit = () => {
    setIsEditingTitle(false);
    setEditedTitle(campaign.name);
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

  const handleBulkDelete = () => {
    if (selectedEntries.length === 0) {
      toast.error("Please select at least one entry to delete");
      return;
    }

    setDeleteConfirmMessage(`Are you sure you want to delete ${selectedEntries.length} selected entries? This action cannot be undone.`);
    setIsDeletingBulk(true);
    setDeleteEntryDialogOpen(true);
  };

  const formatDateForDisplay = (dateString: string) => {
    try {
      if (!dateString) return "N/A";
      
      // Use our utility function to correctly parse the stored date
      // This ensures we handle the date consistently without timezone shifts
      return formatDisplayDate(dateString);
    } catch (error) {
      console.error("Error formatting date:", error, "Original date string:", dateString);
      return dateString;
    }
  };
  
  // Toggle show all stats
  const toggleShowAllStats = () => {
    setShowAllStats(!showAllStats);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Button
            onClick={() => navigate("/")}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <PlusCircle className="h-4 w-4" />
                    <MoreVertical className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsDailyStatsDialogOpen(true)}>
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Quick Stats (Single Day)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openMultiDayEntry}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Multi-Day Stats
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={handleDelete} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Reordered sections as requested */}
      <CampaignFinancialOverview campaign={campaign} />
      
      <CampaignDailyAverages campaign={campaign} />
      
      <LeadCapEditor campaignId={campaign.id} />
      
      <ChannelSpendBreakdown campaign={campaign} dateRange={dateRange} />
      
      <ChannelLeadBreakdown campaign={campaign} dateRange={dateRange} />
      
      <WeeklyReturnsSection 
        campaignId={campaign.id}
        workspaceId={campaign.workspace_id}
      />
      
      <BuyerStackSection campaign={campaign} />
      
      {/* Replace TimeComparisonSection with FlexibleTimeComparison */}
      <FlexibleTimeComparison campaign={campaign} />

      <Card className="shadow-md border-accent/30 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3">
          <CardTitle className="text-lg font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Manual Stats History
            </div>
            {selectedEntries.length > 0 && (
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={handleBulkDelete}
                className="text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete Selected ({selectedEntries.length})
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selectedEntries.length > 0 && selectedEntries.length === displayedStats.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedEntries(displayedStats.map(entry => entry.id));
                      } else {
                        setSelectedEntries([]);
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Cases</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Ad Spend</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaign.statsHistory.length > 0 ? (
                displayedStats.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedEntries.includes(entry.id)}
                        onCheckedChange={() => handleEntrySelect(entry.id)}
                      />
                    </TableCell>
                    <TableCell>{formatDateForDisplay(entry.date)}</TableCell>
                    <TableCell>{entry.leads}</TableCell>
                    <TableCell>{entry.cases}</TableCell>
                    <TableCell>{formatCurrency(entry.revenue || 0)}</TableCell>
                    <TableCell>{formatCurrency(entry.adSpend || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditEntry(entry)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteEntryConfirm(entry.id)}
                          className="h-8 w-8 p-0 text-error-DEFAULT"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                    No manual stats entries found. Add some using the "Add Stats" button.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Show More button */}
          {campaign.statsHistory.length > STATS_PER_PAGE && (
            <div className="flex justify-center p-4">
              <Button 
                variant="outline" 
                onClick={toggleShowAllStats}
                className="text-sm flex items-center gap-1"
              >
                {showAllStats ? "Show Less" : `Show All (${campaign.statsHistory.length})`}
                {!showAllStats && <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDailyStatsDialogOpen} onOpenChange={setIsDailyStatsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Daily Stats</DialogTitle>
            <DialogDescription>
              Add ad spend, leads, cases and revenue for a specific date.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={onCalendarSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="adSpend" className="text-right">Total Ad Spend</Label>
              <Input
                id="adSpend"
                type="number"
                value={dailyStats.adSpend}
                onChange={(e) => setDailyStats({...dailyStats, adSpend: e.target.value})}
                className="col-span-3"
                placeholder="e.g. 1000"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="youtubeSpend" className="text-right">YouTube Spend</Label>
              <Input
                id="youtubeSpend"
                type="number"
                value={dailyStats.youtubeSpend}
                onChange={(e) => setDailyStats({...dailyStats, youtubeSpend: e.target.value})}
                className="col-span-3"
                placeholder="e.g. 300"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="metaSpend" className="text-right">Meta Spend</Label>
              <Input
                id="metaSpend"
                type="number"
                value={dailyStats.metaSpend}
                onChange={(e) => setDailyStats({...dailyStats, metaSpend: e.target.value})}
                className="col-span-3"
                placeholder="e.g. 400"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="newsbreakSpend" className="text-right">Newsbreak Spend</Label>
              <Input
                id="newsbreakSpend"
                type="number"
                value={dailyStats.newsbreakSpend}
                onChange={(e) => setDailyStats({...dailyStats, newsbreakSpend: e.target.value})}
                className="col-span-3"
                placeholder="e.g. 300"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="leads" className="text-right">Leads</Label>
              <Input
                id="leads"
                type="number"
                value={dailyStats.leads}
                onChange={(e) => setDailyStats({...dailyStats, leads: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cases" className="text-right">Cases</Label>
              <Input
                id="cases"
                type="number"
                value={dailyStats.cases}
                onChange={(e) => setDailyStats({...dailyStats, cases: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="revenue" className="text-right">Revenue</Label>
              <Input
                id="revenue"
                type="number"
                value={dailyStats.revenue}
                onChange={(e) => setDailyStats({...dailyStats, revenue: e.target.value})}
                className="col-span-3"
                placeholder="e.g. 5000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" onClick={handleSaveDailyStats}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editEntryDialogOpen} onOpenChange={setEditEntryDialogOpen}>
        
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stats Entry</DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-date" className="text-right">Date</Label>
              <Popover open={editCalendarOpen} onOpenChange={setEditCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="edit-date"
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={editDate}
                    onSelect={onEditCalendarSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Total Ad Spend</Label>
              <div className="col-span-3 px-3 py-2 bg-muted rounded-md text-sm">
                ${((parseFloat(editEntryData.youtubeSpend) || 0) + 
                   (parseFloat(editEntryData.metaSpend) || 0) + 
                   (parseFloat(editEntryData.newsbreakSpend) || 0)).toFixed(2)}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-youtubeSpend" className="text-right">YouTube Spend</Label>
              <Input
                id="edit-youtubeSpend"
                type="number"
                value={editEntryData.youtubeSpend}
                onChange={(e) => setEditEntryData({...editEntryData, youtubeSpend: e.target.value})}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-metaSpend" className="text-right">Meta Spend</Label>
              <Input
                id="edit-metaSpend"
                type="number"
                value={editEntryData.metaSpend}
                onChange={(e) => setEditEntryData({...editEntryData, metaSpend: e.target.value})}
                className="col-span-3"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-newsbreakSpend" className="text-right">Newsbreak Spend</Label>
              <Input
                id="edit-newsbreakSpend"
                type="number"
                value={editEntryData.newsbreakSpend}
                onChange={(e) => setEditEntryData({...editEntryData, newsbreakSpend: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Total Leads</Label>
              <div className="col-span-3 px-3 py-2 bg-muted rounded-md text-sm">
                {((parseInt(editEntryData.youtubeLeads) || 0) + 
                  (parseInt(editEntryData.metaLeads) || 0) + 
                  (parseInt(editEntryData.newsbreakLeads) || 0)) || parseInt(editEntryData.leads) || 0}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-youtubeLeads" className="text-right">YouTube Leads</Label>
              <Input
                id="edit-youtubeLeads"
                type="number"
                value={editEntryData.youtubeLeads}
                onChange={(e) => setEditEntryData({...editEntryData, youtubeLeads: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-metaLeads" className="text-right">Meta Leads</Label>
              <Input
                id="edit-metaLeads"
                type="number"
                value={editEntryData.metaLeads}
                onChange={(e) => setEditEntryData({...editEntryData, metaLeads: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-newsbreakLeads" className="text-right">Newsbreak Leads</Label>
              <Input
                id="edit-newsbreakLeads"
                type="number"
                value={editEntryData.newsbreakLeads}
                onChange={(e) => setEditEntryData({...editEntryData, newsbreakLeads: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-cases" className="text-right">Cases</Label>
              <Input
                id="edit-cases"
                type="number"
                value={editEntryData.cases}
                onChange={(e) => setEditEntryData({...editEntryData, cases: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-revenue" className="text-right">Revenue</Label>
              <Input
                id="edit-revenue"
                type="number"
                value={editEntryData.revenue}
                onChange={(e) => setEditEntryData({...editEntryData, revenue: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => handleDeleteEntryConfirm(editingEntryId as string)}
              type="button"
            >
              Delete Entry
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={handleCancelEditEntry} type="button">
                Cancel
              </Button>
              <Button onClick={handleSaveEditedEntry} type="button">
                Save Changes
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Alert Dialog for duplicate entries */}
      <AlertDialog open={showDuplicateAlert} onOpenChange={setShowDuplicateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Entry</AlertDialogTitle>
            <AlertDialogDescription>
              An entry for this date already exists. Would you like to edit the existing entry instead?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditDuplicateEntry}>
              Edit Existing Entry
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={deleteEntryDialogOpen} onOpenChange={setDeleteEntryDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingEntry}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={isDeletingBulk ? confirmBulkDelete : confirmDeleteEntry}
              disabled={isDeletingEntry}
            >
              {isDeletingEntry ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MultiDayStatsDialog
        isOpen={isMultiDayEntryOpen}
        onClose={closeMultiDayEntry}
        campaignName={campaign.name}
        selectedDates={selectedDates}
        dayStats={dayStats}
        onDatesSelected={handleDatesSelected}
        onUpdateDayStats={updateDayStats}
        onBulkUpdateField={handleBulkUpdateField}
        onSubmit={handleMultiDayStatsSubmit}
      />
    </div>
  );
};

export default CampaignDetail;
