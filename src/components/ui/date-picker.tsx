
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
  // Create a handler that normalizes the date to noon UTC to avoid timezone issues
  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Set time to noon UTC to avoid timezone issues
      const normalizedDate = new Date(selectedDate);
      
      // Use UTC functions to ensure consistent handling
      const year = normalizedDate.getUTCFullYear();
      const month = normalizedDate.getUTCMonth();
      const day = normalizedDate.getUTCDate();
      
      // Create a new date with noon UTC time
      const utcDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
      
      console.log('DatePicker - Original date:', selectedDate.toISOString());
      console.log('DatePicker - Normalized UTC date:', utcDate.toISOString());
      
      onSelect(utcDate);
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
