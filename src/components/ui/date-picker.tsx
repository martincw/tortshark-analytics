
import React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { localDateToUTCNoon } from "@/lib/utils/ManualDateUtils";

interface DatePickerProps {
  date: Date | undefined;
  setDate?: (date: Date | undefined) => void;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

export function DatePicker({ date, setDate, onSelect, className }: DatePickerProps) {
  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      if (setDate) setDate(undefined);
      if (onSelect) onSelect(undefined);
      return;
    }
    
    // Convert the local date from the calendar to UTC noon
    // This ensures that the date selected in the UI is the same date stored in the database
    const utcNoonDate = localDateToUTCNoon(selectedDate);
    console.log(`DatePicker: Selected ${selectedDate.toISOString()}, converted to UTC noon: ${utcNoonDate.toISOString()}`);
    
    if (setDate) setDate(utcNoonDate);
    if (onSelect) onSelect(utcNoonDate);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
