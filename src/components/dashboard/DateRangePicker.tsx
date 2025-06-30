
import React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";

export function DateRangePicker() {
  const { dateRange } = useCampaign();
  
  return (
    <Button variant="outline" className="flex items-center">
      <Calendar className="h-4 w-4 mr-2" />
      {dateRange.startDate && dateRange.endDate ? 
        `${dateRange.startDate} - ${dateRange.endDate}` : 
        'Select Date Range'
      }
    </Button>
  );
}
