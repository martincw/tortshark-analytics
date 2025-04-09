
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeStat } from "@/components/ui/badge-stat";
import { StatCard } from "@/components/ui/stat-card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaigns, updateCampaign, deleteCampaign, setSelectedCampaignId, addStatHistoryEntry } = useCampaign();
  
  // Set the selected campaign ID when this component mounts
  useEffect(() => {
    if (id) {
      setSelectedCampaignId(id);
    }
    
    // Debug the campaign ID and campaigns
    console.log("Campaign ID from URL:", id);
    console.log("Available campaigns:", campaigns.map(c => ({ id: c.id, name: c.name })));
  }, [id, setSelectedCampaignId, campaigns]);
  
  // Find the campaign by ID - ensure we're comparing string IDs
  const campaign = campaigns.find((c) => c.id === id);
  
  // Debug the found campaign
  useEffect(() => {
    console.log("Found campaign:", campaign);
  }, [campaign]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingManualStats, setIsAddingManualStats] = useState(false);
  const [leadCount, setLeadCount] = useState("0");
  const [caseCount, setCaseCount] = useState("0");
  const [revenue, setRevenue] = useState("0");
  
  // State for daily stats dialog
  const [isDailyStatsDialogOpen, setIsDailyStatsDialogOpen] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    leads: "0",
    cases: "0",
    revenue: "0"
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Update form fields when campaign changes
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

  // Get ROI class based on performance
  const getRoiClass = () => {
    if (metrics.roi > 200) return "text-success-DEFAULT";
    if (metrics.roi > 0) return "text-secondary"; 
    return "text-error-DEFAULT";
  };
  
  const handleSave = () => {
    const updatedCampaign = {
      ...campaign,
      manualStats: {
        ...campaign.manualStats,
        leads: parseInt(leadCount) || 0,
        cases: parseInt(caseCount) || 0,
        retainers: parseInt(caseCount) || 0, // Set retainers equal to cases since they're the same
        revenue: parseFloat(revenue) || 0,
      },
    };
    
    updateCampaign(updatedCampaign);
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
    // Parse the values
    const newLeads = parseInt(dailyStats.leads) || 0;
    const newCases = parseInt(dailyStats.cases) || 0;
    const newRevenue = parseFloat(dailyStats.revenue) || 0;
    
    if (newLeads === 0 && newCases === 0 && newRevenue === 0) {
      toast.error("Please enter at least one value greater than 0");
      return;
    }
    
    console.log("Adding new stats history entry:", {
      campaignId: campaign.id,
      date: selectedDate.toISOString(),
      leads: newLeads,
      cases: newCases,
      retainers: newCases, // Set retainers equal to cases
      revenue: newRevenue
    });
    
    // Add stats history entry
    addStatHistoryEntry(campaign.id, {
      date: selectedDate.toISOString(),
      leads: newLeads,
      cases: newCases,
      retainers: newCases, // Set retainers equal to cases
      revenue: newRevenue
    });
    
    // Close the dialog and show a success toast
    setIsDailyStatsDialogOpen(false);
    toast.success("Daily stats added successfully");
    
    // Reset daily stats form
    setDailyStats({
      leads: "0",
      cases: "0",
      revenue: "0"
    });
    
    // Update the form fields with the new values
    setLeadCount((parseInt(leadCount) + newLeads).toString());
    setCaseCount((parseInt(caseCount) + newCases).toString());
    setRevenue((parseFloat(revenue) + newRevenue).toString());
  };

  return (
    <div className="space-y-6">
      {/* Header Section with Campaign name and actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate("/campaigns")}
            variant="outline"
            size="icon"
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
        </div>
        <div className="flex gap-2">
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
                Edit All Stats
              </Button>
              <Button onClick={handleDelete} variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Key Performance Metrics - Highlighted */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Return on Investment"
          value={`${metrics.roi.toFixed(1)}%`}
          icon={<Percent className="h-5 w-5" />}
          trend={metrics.roi > 0 ? "up" : "down"}
          trendValue={metrics.roi > 200 ? "Excellent" : metrics.roi > 100 ? "Good" : metrics.roi > 0 ? "Positive" : "Needs Attention"}
          className="border-2 border-secondary"
          isHighlighted={true}
          valueClassName={getRoiClass()}
        />
        
        <StatCard
          title="Campaign Profit"
          value={formatCurrency(metrics.profit)}
          icon={<CreditCard className="h-5 w-5" />}
          trend={metrics.profit > 0 ? "up" : "down"}
          trendValue={metrics.profit > 5000 ? "High Performer" : metrics.profit > 0 ? "Profitable" : "Loss"}
          className="border-2 border-secondary"
          isHighlighted={true}
          valueClassName={getRoiClass()}
        />
        
        <StatCard
          title="Cost Per Case"
          value={formatCurrency(metrics.cpa)}
          icon={<FileCheck className="h-5 w-5" />}
          trend={metrics.cpa < campaign.targets.casePayoutAmount / 2 ? "up" : "down"}
          trendValue={metrics.cpa < campaign.targets.casePayoutAmount ? "Under Target" : "Over Target"}
          className="border-2 border-secondary"
          isHighlighted={true}
          valueClassName={metrics.cpa < campaign.targets.casePayoutAmount ? "text-success-DEFAULT" : "text-error-DEFAULT"}
        />
      </div>
      
      {/* Campaign Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats and Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Ad Spend</span>
                <span className="text-lg font-semibold">{formatCurrency(campaign.stats.adSpend)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Revenue</span>
                <span className="text-lg font-semibold">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      className="h-8 w-24"
                    />
                  ) : (
                    formatCurrency(campaign.manualStats.revenue)
                  )}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Leads</span>
                <span className="text-lg font-semibold">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={leadCount}
                      onChange={(e) => setLeadCount(e.target.value)}
                      className="h-8 w-24"
                    />
                  ) : (
                    formatNumber(campaign.manualStats.leads)
                  )}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Cases</span>
                <span className="text-lg font-semibold">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={caseCount}
                      onChange={(e) => setCaseCount(e.target.value)}
                      className="h-8 w-24"
                    />
                  ) : (
                    formatNumber(campaign.manualStats.cases)
                  )}
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Key Metrics</h4>
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
        
        {/* Campaign Targets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Campaign Targets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Monthly Target</span>
                <span className="text-lg font-semibold">{campaign.targets.monthlyRetainers} Cases</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Case Payout</span>
                <span className="text-lg font-semibold">{formatCurrency(campaign.targets.casePayoutAmount)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Target ROAS</span>
                <span className="text-lg font-semibold">{campaign.targets.targetROAS}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Target Profit</span>
                <span className="text-lg font-semibold">{formatCurrency(campaign.targets.targetProfit)}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Performance vs. Targets</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">ROAS</span>
                  <div className="flex items-center gap-2">
                    <span className={metrics.roi >= campaign.targets.targetROAS ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                      {metrics.roi.toFixed(1)}%
                    </span>
                    <span className="text-muted-foreground text-xs">vs {campaign.targets.targetROAS}%</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Profit</span>
                  <div className="flex items-center gap-2">
                    <span className={metrics.profit >= campaign.targets.targetProfit ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                      {formatCurrency(metrics.profit)}
                    </span>
                    <span className="text-muted-foreground text-xs">vs {formatCurrency(campaign.targets.targetProfit)}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cases</span>
                  <div className="flex items-center gap-2">
                    <span className={campaign.manualStats.cases >= campaign.targets.monthlyRetainers ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                      {campaign.manualStats.cases}
                    </span>
                    <span className="text-muted-foreground text-xs">vs {campaign.targets.monthlyRetainers}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Stats History Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Stats History</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsDailyStatsDialogOpen(true)}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </CardHeader>
        <CardContent>
          {campaign.statsHistory && campaign.statsHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Cases</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Added On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.statsHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{entry.leads}</TableCell>
                      <TableCell>{entry.cases}</TableCell>
                      <TableCell>{formatCurrency(entry.revenue)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(entry.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No history records yet. Add daily stats to track your campaign's performance over time.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Daily Stats Dialog with Date Picker */}
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
            {/* Date Picker */}
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
    </div>
  );
};

export default CampaignDetail;
