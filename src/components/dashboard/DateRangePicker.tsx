
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useCampaign } from "@/contexts/CampaignContext";
import { Calendar as CalendarIcon, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DateRangePicker() {
  const { dateRange, setDateRange } = useCampaign();
  
  // Format date strings to Date objects properly, preserving the exact day
  const createDateFromStr = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    
    // Create date at UTC noon to avoid timezone shifts
    const date = new Date(dateStr + "T12:00:00Z");
    
    console.log(`DateRangePicker: Parsed date string ${dateStr} -> Date object:`, date.toISOString());
    return date;
  };
  
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: createDateFromStr(dateRange.startDate),
    to: createDateFromStr(dateRange.endDate),
  });
  
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  // Update local state when dateRange prop changes
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      setDate({
        from: createDateFromStr(dateRange.startDate),
        to: createDateFromStr(dateRange.endDate),
      });
      setTempDate({
        from: createDateFromStr(dateRange.startDate),
        to: createDateFromStr(dateRange.endDate),
      });
    }
  }, [dateRange]);
  
  // Save dateRange to localStorage when it changes
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      localStorage.setItem('dateRange', JSON.stringify(dateRange));
      console.log('Date range saved to localStorage:', dateRange);
    }
  }, [dateRange]);
  
  const handleTempDateChange = (value: DateRange | undefined) => {
    setTempDate(value);
  };

  const handleSaveDate = () => {
    if (!tempDate?.from) return;
    
    // Format dates as ISO date strings (YYYY-MM-DD) to avoid timezone issues
    const formatDateToYYYYMMDD = (date: Date): string => {
      // Get year, month, day directly from the date
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Add 1 as months are 0-indexed
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      const formatted = `${year}-${month}-${day}`;
      console.log(`DateRangePicker: Formatting date ${date.toISOString()} to ${formatted}`);
      return formatted;
    };
    
    // Get selected date(s) and format them
    const fromDate = tempDate.from;
    const toDate = tempDate.to || tempDate.from;
    
    const formattedStartDate = formatDateToYYYYMMDD(fromDate);
    const formattedEndDate = formatDateToYYYYMMDD(toDate);
    
    // Update local component state
    setDate({
      from: fromDate,
      to: toDate
    });
    
    // Create a new object reference to trigger re-renders in dependent components
    const newDateRange = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
    };
    
    console.log(`DateRangePicker: Setting new date range:`, JSON.stringify(newDateRange, null, 2));
    setDateRange(newDateRange);
    setIsPopoverOpen(false);
    toast.success("Date range updated");
  };

  return (
    <div className="grid gap-2">
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-0">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={tempDate?.from}
              selected={tempDate}
              onSelect={handleTempDateChange}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
            <div className="p-3 border-t border-border">
              <Button 
                onClick={handleSaveDate} 
                className="w-full" 
                disabled={!tempDate?.from}
              >
                <Save className="mr-2 h-4 w-4" /> 
                Apply Date Range
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
