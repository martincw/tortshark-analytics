
import { useState } from "react";
import { format } from "date-fns";
import { useCampaign } from "@/contexts/CampaignContext";
import { toast } from "sonner";
import { QuickStatsData } from "./QuickStatsDialog";

export const useQuickStats = (campaignId: string) => {
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(false);
  const { addStatHistoryEntry } = useCampaign();
  
  const openQuickEntry = () => {
    setIsQuickEntryOpen(true);
  };
  
  const closeQuickEntry = () => {
    setIsQuickEntryOpen(false);
  };
  
  const handleQuickStatsSubmit = (quickStats: QuickStatsData, selectedDate: Date) => {
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
      campaignId: campaignId,
      date: formattedDate,
      leads: newLeads,
      cases: newCases,
      retainers: newRetainers,
      revenue: newRevenue,
      adSpend: newAdSpend
    });
    
    addStatHistoryEntry(campaignId, {
      date: formattedDate,
      leads: newLeads, 
      cases: newCases,
      retainers: newRetainers,
      revenue: newRevenue,
      adSpend: newAdSpend
    });
    
    setIsQuickEntryOpen(false);
    toast.success(`Stats for ${format(selectedDate, "MMM d, yyyy")} added successfully`);
  };
  
  return {
    isQuickEntryOpen,
    openQuickEntry,
    closeQuickEntry,
    handleQuickStatsSubmit
  };
};
