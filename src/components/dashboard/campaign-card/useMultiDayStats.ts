
import { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface DayStats {
  date: Date;
  adSpend: string;
  leads: string;
  cases: string;
  revenue: string;
}

export const useMultiDayStats = (campaignId: string) => {
  const [isMultiDayEntryOpen, setIsMultiDayEntryOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [dayStats, setDayStats] = useState<DayStats[]>([]);
  const { addStatHistoryEntry } = useCampaign();

  const openMultiDayEntry = () => {
    setIsMultiDayEntryOpen(true);
  };

  const closeMultiDayEntry = () => {
    setIsMultiDayEntryOpen(false);
    setSelectedDates([]);
    setDayStats([]);
  };

  const handleDatesSelected = (dates: Date[]) => {
    setSelectedDates(dates);
    // Initialize stats for each selected date
    const initialStats = dates.map(date => ({
      date,
      adSpend: "0",
      leads: "0",
      cases: "0", 
      revenue: "0"
    }));
    setDayStats(initialStats);
  };

  const updateDayStats = (dateIndex: number, field: keyof Omit<DayStats, 'date'>, value: string) => {
    setDayStats(prev => 
      prev.map((stat, index) => 
        index === dateIndex ? { ...stat, [field]: value } : stat
      )
    );
  };

  const handleMultiDayStatsSubmit = async () => {
    try {
      let hasValidData = false;
      
      for (const stat of dayStats) {
        const adSpend = parseFloat(stat.adSpend) || 0;
        const leads = parseInt(stat.leads) || 0;
        const cases = parseInt(stat.cases) || 0;
        const revenue = parseFloat(stat.revenue) || 0;
        
        if (adSpend > 0 || leads > 0 || cases > 0 || revenue > 0) {
          hasValidData = true;
          const formattedDate = format(stat.date, "yyyy-MM-dd");
          
          await addStatHistoryEntry(campaignId, {
            date: formattedDate,
            leads,
            cases,
            retainers: cases, // Keep retainers equal to cases for backward compatibility
            revenue,
            adSpend
          });
        }
      }
      
      if (!hasValidData) {
        toast.error("Please enter at least one value greater than 0 for any day");
        return;
      }
      
      toast.success(`Stats for ${dayStats.length} days added successfully`);
      closeMultiDayEntry();
    } catch (error) {
      console.error("Error submitting multi-day stats:", error);
      toast.error("Failed to submit stats");
    }
  };

  return {
    isMultiDayEntryOpen,
    selectedDates,
    dayStats,
    openMultiDayEntry,
    closeMultiDayEntry,
    handleDatesSelected,
    updateDayStats,
    handleMultiDayStatsSubmit
  };
};
