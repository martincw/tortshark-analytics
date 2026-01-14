import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, RefreshCw, CheckCircle } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadProsperSyncButtonProps {
  onSyncComplete?: () => void;
}

export function LeadProsperSyncButton({ onSyncComplete }: LeadProsperSyncButtonProps) {
  const [date, setDate] = useState<Date>(subDays(new Date(), 1));
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      
      const { data, error } = await supabase.functions.invoke("leadprosper-daily-stats", {
        body: { date: dateStr }
      });

      if (error) throw error;

      if (data.success) {
        const count = data.submissionsCreated || 0;
        if (count > 0) {
          toast.success(`Synced ${count} campaign(s) from LeadProsper for ${format(date, "MMM d, yyyy")}`);
        } else {
          toast.info(`No data to sync for ${format(date, "MMM d, yyyy")}`);
        }
        onSyncComplete?.();
      } else {
        throw new Error(data.error || "Sync failed");
      }
    } catch (error) {
      console.error("LeadProsper sync error:", error);
      toast.error("Failed to sync LeadProsper data");
    } finally {
      setIsSyncing(false);
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
        onClick={handleSync} 
        disabled={isSyncing}
        variant="secondary"
      >
        {isSyncing ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Sync LeadProsper
          </>
        )}
      </Button>
    </div>
  );
}
