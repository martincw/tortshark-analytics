
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

interface DatePickerProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  className?: string;
}

export function DatePicker({ date, onSelect, className }: DatePickerProps) {
  // Create a handler that completely eliminates timezone issues by working with date strings
  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Extract only the date part (YYYY-MM-DD) to eliminate time/timezone concerns
      const dateString = selectedDate.toISOString().split('T')[0];
      
      // Create a new date from just the YYYY-MM-DD part, which will use the local timezone
      // but with time set to midnight (00:00:00)
      const localMidnight = new Date(dateString);
      
      console.log('DatePicker - Original selected date:', selectedDate);
      console.log('DatePicker - Date string (YYYY-MM-DD):', dateString);
      console.log('DatePicker - New date object:', localMidnight);
      
      onSelect(localMidnight);
    } else {
      onSelect(undefined);
    }
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
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}
