
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
  // Fix the off-by-one day issue by ensuring we're working with the exact selected date
  const handleSelect = (selectedDate: Date | undefined) => {
    console.log('DatePicker - Raw selected date:', selectedDate);
    
    if (!selectedDate) {
      onSelect(undefined);
      return;
    }
    
    // Create a new date object to prevent any reference issues
    // and ensure we're using the exact date that was selected
    const correctedDate = new Date(selectedDate);
    
    // Set the time to noon to avoid any potential day boundary issues
    correctedDate.setHours(12, 0, 0, 0);
    
    console.log('DatePicker - Original selected date:', selectedDate.toISOString());
    console.log('DatePicker - Corrected date:', correctedDate.toISOString());
    console.log('DatePicker - Date components:', {
      year: correctedDate.getFullYear(),
      month: correctedDate.getMonth() + 1, // +1 because months are 0-indexed
      day: correctedDate.getDate()
    });
    
    onSelect(correctedDate);
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
