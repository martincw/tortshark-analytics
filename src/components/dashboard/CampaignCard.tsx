import React, { useState, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campaign, DateRange } from "@/types/campaign";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent, getPerformanceBgClass } from "@/utils/campaignUtils";
import { BadgeStat } from "@/components/ui/badge-stat";
import { useCampaign } from "@/contexts/CampaignContext";
import { useNavigate } from "react-router-dom";
import { AlertCircle, DollarSign, TrendingUp, Users, Calendar, Percent, ArrowRight, Layers, PlusCircle, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CustomProgressBar } from "@/components/ui/custom-progress-bar";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const { setSelectedCampaignId, addStatHistoryEntry } = useCampaign();
  const navigate = useNavigate();
  const metrics = calculateMetrics(campaign);
  
  // Calculate profit directly from core values
  const profit = campaign.manualStats.revenue - campaign.stats.adSpend;
  
  console.log(`CampaignCard - Campaign ${campaign.name}: revenue=${campaign.manualStats.revenue}, adSpend=${campaign.stats.adSpend}, calculated profit=${profit}`);
  
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const [quickStats, setQuickStats] = useState({
    leads: "0",
    cases: "0",
    retainers: "0",
    revenue: "0",
    adSpend: "0"
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  const handleViewDetails = () => {
    console.log("Navigating to campaign details for campaign ID:", campaign.id);
    setSelectedCampaignId(campaign.id);
    navigate(`/campaign/${campaign.id}`);
  };

  const handleQuickStatsSubmit = () => {
    const newLeads = parseInt(quickStats.leads) || 0;
    const newCases = parseInt(quickStats.cases) || 0;
    const newRetainers = parseInt(quickStats.retainers) || 0;
    const newRevenue = parseFloat(quickStats.revenue) || 0;
    const newAdSpend = parseFloat(quickStats.adSpend) || 0;
    
    if (newLeads === 0 && newCases === 0 && newRetainers === 0 && newRevenue === 0 && newAdSpend === 0) {
      toast.error("Please enter at least one value greater than 0");
      return;
    }
    
    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    
    console.log("Adding quick stats:", {
      campaignId: campaign.id,
      date: formattedDate,
      leads: newLeads,
      cases: newCases,
      retainers: newRetainers,
      revenue: newRevenue,
      adSpend: newAdSpend
    });
    
    addStatHistoryEntry(campaign.id, {
      date: formattedDate,
      leads: newLeads, 
      cases: newCases,
      retainers: newRetainers,
      revenue: newRevenue,
      adSpend: newAdSpend
    });
    
    setIsQuickEntryOpen(false);
    setQuickStats({ leads: "0", cases: "0", retainers: "0", revenue: "0", adSpend: "0" });
    toast.success(`Stats for ${format(selectedDate, "MMM d, yyyy")} added successfully`);
  };

  const onCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  const formattedDate = format(new Date(campaign.stats.date), "MMM d, yyyy");

  const getProfitabilityClass = () => {
    if (metrics.roi > 300) return "text-success-DEFAULT";
    if (metrics.roi > 200) return "text-secondary"; 
    return "text-error-DEFAULT";
  };

  const tortType = campaign.name;
  
  const conversionRate = campaign.manualStats.leads > 0 
    ? ((campaign.manualStats.cases / campaign.manualStats.leads) * 100).toFixed(1) 
    : "0";

  const getBadgeVariant = (tortType: string) => {
    switch (tortType) {
      case "Rideshare": return "default";
      case "LDS": return "secondary";
      case "MD": return "outline";
      case "Wildfire": return "destructive";
      default: return "default";
    }
  };

  const profitProgress = useMemo(() => {
    if (campaign.targets.targetProfit <= 0) return 0;
    
    const percentage = (profit / campaign.targets.targetProfit) * 100;
    return Math.max(Math.min(percentage, 100), 0);
  }, [profit, campaign.targets.targetProfit]);
  
  const getProfitVariant = () => {
    if (profitProgress >= 100) return "success";
    if (profitProgress >= 50) return "warning";
    return "error";
  };

  const costPerLead = campaign.manualStats.leads > 0 ? campaign.stats.adSpend / campaign.manualStats.leads : 0;
  const earningsPerLead = campaign.manualStats.leads > 0 ? campaign.manualStats.revenue / campaign.manualStats.leads : 0;
  
  const profitPerCase = campaign.manualStats.cases > 0 
    ? profit / campaign.manualStats.cases 
    : 0;

  return (
    <>
      <Card className="overflow-hidden hover:shadow-md transition-shadow border border-border/80 group">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg font-bold line-clamp-1">{campaign.name}</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center mt-1">
                <Calendar className="h-3 w-3 mr-1 inline" />
                {formattedDate}
              </p>
            </div>
            <Badge 
              variant="default"
              className="shrink-0"
            >
              Google Ads
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="pb-0">
          <div className={`grid grid-cols-2 gap-1 mb-4 p-3 rounded-md ${getPerformanceBgClass(metrics.roi)}`}>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">ROAS</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Percent className="h-4 w-4 text-secondary" />
                <span className={`text-xl font-bold ${getProfitabilityClass()}`}>
                  {campaign.stats.adSpend > 0 ? ((campaign.manualStats.revenue / campaign.stats.adSpend) * 100).toFixed(0) : "0"}%
                </span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-muted-foreground">Profit</span>
              <div className="flex items-center gap-1.5 mt-1">
                <DollarSign className="h-4 w-4 text-secondary" />
                <span className={`text-xl font-bold ${profit >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`}>
                  {Math.abs(profit) >= 1000 
                    ? `${profit >= 0 ? '' : '-'}$${(Math.abs(profit) / 1000).toFixed(1)}K` 
                    : formatCurrency(profit)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <BadgeStat 
                label="Ad Spend" 
                value={formatCurrency(campaign.stats.adSpend)} 
              />
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <BadgeStat 
                label="Revenue" 
                value={formatCurrency(campaign.manualStats.revenue)} 
              />
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <BadgeStat 
                label="Leads" 
                value={formatNumber(campaign.manualStats.leads)} 
              />
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <BadgeStat 
                label="Cases" 
                value={formatNumber(campaign.manualStats.cases)} 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-2 border-t pt-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <BadgeStat 
                label="Cost Per Lead" 
                value={formatCurrency(costPerLead)} 
              />
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <BadgeStat 
                label="Earnings Per Lead" 
                value={formatCurrency(earningsPerLead)} 
                className={earningsPerLead > costPerLead ? "text-success-DEFAULT" : ""}
              />
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <BadgeStat 
                label="Conv. Rate" 
                value={`${conversionRate}%`} 
              />
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <BadgeStat 
                label="Profit Per Case" 
                value={formatCurrency(profitPerCase)} 
                className={profitPerCase > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}
              />
            </div>
          </div>
          
          <div className="border-t pt-2 mt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Profit Progress</span>
                <span className="font-medium">{formatCurrency(profit)} of {formatCurrency(campaign.targets.targetProfit)}</span>
              </div>
              <CustomProgressBar value={profitProgress} size="sm" variant={getProfitVariant()} className="w-full" />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="pt-4 flex justify-between gap-2">
          <Button onClick={handleViewDetails} variant="outline" className="flex-1 group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
            View Details
            <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
          </Button>
          <Button onClick={() => setIsQuickEntryOpen(true)} variant="outline" className="w-auto">
            <PlusCircle className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={isQuickEntryOpen} onOpenChange={setIsQuickEntryOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Stats for {campaign.name}</DialogTitle>
            <DialogDescription>
              Add leads, cases, retainers, ad spend, and revenue for a specific date. These values will be added to the total.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date-picker" className="text-right">
                Date
              </Label>
              <div className="col-span-3">
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={onCalendarSelect}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quick-leads" className="text-right">
                Leads
              </Label>
              <Input
                id="quick-leads"
                type="number"
                value={quickStats.leads}
                onChange={(e) => setQuickStats({...quickStats, leads: e.target.value})}
                className="col-span-3"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quick-cases" className="text-right">
                Cases
              </Label>
              <Input
                id="quick-cases" 
                type="number"
                value={quickStats.cases}
                onChange={(e) => setQuickStats({...quickStats, cases: e.target.value})}
                className="col-span-3"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quick-retainers" className="text-right">
                Retainers
              </Label>
              <Input
                id="quick-retainers"
                type="number" 
                value={quickStats.retainers}
                onChange={(e) => setQuickStats({...quickStats, retainers: e.target.value})}
                className="col-span-3"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quick-adspend" className="text-right">
                Ad Spend ($)
              </Label>
              <Input
                id="quick-adspend"
                type="number" 
                value={quickStats.adSpend}
                onChange={(e) => setQuickStats({...quickStats, adSpend: e.target.value})}
                className="col-span-3"
                min="0"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quick-revenue" className="text-right">
                Revenue ($)
              </Label>
              <Input
                id="quick-revenue"
                type="number" 
                value={quickStats.revenue}
                onChange={(e) => setQuickStats({...quickStats, revenue: e.target.value})}
                className="col-span-3"
                min="0"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuickEntryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleQuickStatsSubmit}>
              Add Stats
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
