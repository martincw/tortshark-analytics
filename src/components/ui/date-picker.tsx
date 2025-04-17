
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
  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Create a date string in YYYY-MM-DD format and then create a new Date from it
      // This ensures the date is exactly what's displayed without any timezone adjustments
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Create a new date object from this string - this will be at local midnight
      const standardizedDate = new Date(`${dateStr}T00:00:00`);
      
      console.log('DatePicker - Selected date:', selectedDate);
      console.log('DatePicker - Year:', year, 'Month:', month, 'Day:', day);
      console.log('DatePicker - Date string created:', dateStr);
      console.log('DatePicker - Final standardized date:', standardizedDate);
      console.log('DatePicker - Final date ISO string:', standardizedDate.toISOString());
      
      onSelect(standardizedDate);
    } else {
      onSelect(undefined);
    }
  };

  // Format display date consistently
  const displayDate = date ? format(date, "PPP") : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !displayDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayDate ? displayDate : <span>Pick a date</span>}
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
