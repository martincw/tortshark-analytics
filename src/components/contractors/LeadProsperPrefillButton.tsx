import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, RefreshCw } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadProsperData {
  campaign_id: string;
  campaign_name: string;
  leads: number;
  revenue: number;
  ad_spend: number;
}

interface LeadProsperPrefillButtonProps {
  onPrefill: (date: string, data: LeadProsperData[]) => void;
}

export function LeadProsperPrefillButton({ onPrefill }: LeadProsperPrefillButtonProps) {
  const [date, setDate] = useState<Date>(subDays(new Date(), 1));
  const [isFetching, setIsFetching] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleFetch = async () => {
    setIsFetching(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      
      const { data, error } = await supabase.functions.invoke("leadprosper-daily-stats", {
        body: { date: dateStr, prefillOnly: true }
      });

      if (error) throw error;

      if (data.success && data.submissions?.length > 0) {
        onPrefill(dateStr, data.submissions);
        toast.success(`Fetched data for ${data.submissions.length} campaign(s) from LeadProsper`);
      } else if (data.unmappedCampaigns?.length > 0) {
        toast.warning(`No mapped campaigns found. ${data.unmappedCampaigns.length} unmapped campaign(s).`);
      } else {
        toast.info(`No data found for ${format(date, "MMM d, yyyy")}`);
      }
    } catch (error) {
      console.error("LeadProsper prefill error:", error);
      toast.error("Failed to fetch LeadProsper data");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[180px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "MMM d, yyyy") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(newDate);
                setIsCalendarOpen(false);
              }
            }}
            disabled={(date) => date > new Date()}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      
      <Button 
        onClick={handleFetch} 
        disabled={isFetching}
        variant="secondary"
        type="button"
      >
        {isFetching ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Fetching...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Prefill from LeadProsper
          </>
        )}
      </Button>
    </div>
  );
}
