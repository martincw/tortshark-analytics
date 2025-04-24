
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
import { formatDateForStorage, parseStoredDate, formatDisplayDate } from "@/lib/utils/ManualDateUtils";

export function DateRangePicker() {
  const { dateRange, setDateRange } = useCampaign();
  
  // Format date strings to Date objects properly using our UTC parser
  const createDateFromStr = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    return parseStoredDate(dateStr);
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
      console.log("DateRangePicker: External date range changed:", dateRange);
      
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
    console.log("DateRangePicker: Temp date changed:", value);
    setTempDate(value);
  };

  const handleSaveDate = () => {
    if (!tempDate?.from) return;
    
    // Format to YYYY-MM-DD using our utility
    const formattedStartDate = formatDateForStorage(tempDate.from);
    const formattedEndDate = formatDateForStorage(tempDate.to || tempDate.from);
    
    console.log(`DateRangePicker: Original from date:`, tempDate.from);
    console.log(`DateRangePicker: Original to date:`, tempDate.to);
    console.log(`DateRangePicker: Formatted start date:`, formattedStartDate);
    console.log(`DateRangePicker: Formatted end date:`, formattedEndDate);
    
    // Update local component state
    setDate({
      from: tempDate.from,
      to: tempDate.to || tempDate.from
    });
    
    // Create a new object reference to trigger re-renders in dependent components
    const newDateRange = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
    };
    
    console.log(`DateRangePicker: Setting new date range:`, newDateRange);
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
            size="sm"
            className={cn(
              "justify-start text-left font-normal bg-background",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "MMM dd")} - {format(date.to, "MMM dd, yyyy")}
                </>
              ) : (
                format(date.from, "PPP")
              )
            ) : (
              <span>Calendar</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50 bg-background border shadow-md" align="start">
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
