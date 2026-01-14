import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

type Channel = "youtube" | "meta" | "newsbreak";

interface LeadProsperPrefillButtonProps {
  onPrefill: (date: string, data: LeadProsperData[], channel: Channel) => void;
}

export function LeadProsperPrefillButton({ onPrefill }: LeadProsperPrefillButtonProps) {
  const [date, setDate] = useState<Date>(subDays(new Date(), 1));
  const [channel, setChannel] = useState<Channel>("youtube");
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
        onPrefill(dateStr, data.submissions, channel);
        toast.success(`Fetched data for ${data.submissions.length} campaign(s) - assigned to ${channel.charAt(0).toUpperCase() + channel.slice(1)}`);
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
    <div className="flex items-center gap-2 flex-wrap justify-center">
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[160px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "MMM d, yyyy") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
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

      <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Channel" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="meta">Meta</SelectItem>
          <SelectItem value="newsbreak">Newsbreak</SelectItem>
        </SelectContent>
      </Select>
      
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
