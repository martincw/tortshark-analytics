
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
  // Fixed date handling to ensure consistent dates regardless of timezone
  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onSelect(undefined);
      return;
    }
    
    // Extract date components to create a timezone-neutral date
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const day = selectedDate.getDate();
    
    // Create date at noon to prevent day shifting across timezones
    const standardizedDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
    
    console.log('DatePicker - Selected date details:');
    console.log('  - Original date:', selectedDate.toISOString());
    console.log('  - Components:', { year, month, day });
    console.log('  - UTC noon date:', standardizedDate.toISOString());
    
    onSelect(standardizedDate);
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
