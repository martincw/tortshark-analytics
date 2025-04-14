
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
  
  // Fix: Use noon time to avoid timezone issues
  const fixDate = (dateStr: string): Date => {
    const date = new Date(dateStr);
    date.setHours(12, 0, 0, 0);
    return date;
  };
  
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: dateRange.startDate ? fixDate(dateRange.startDate) : undefined,
    to: dateRange.endDate ? fixDate(dateRange.endDate) : undefined,
  });
  
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  useEffect(() => {
    setDate({
      from: dateRange.startDate ? fixDate(dateRange.startDate) : undefined,
      to: dateRange.endDate ? fixDate(dateRange.endDate) : undefined,
    });
    setTempDate({
      from: dateRange.startDate ? fixDate(dateRange.startDate) : undefined,
      to: dateRange.endDate ? fixDate(dateRange.endDate) : undefined,
    });
  }, [dateRange]);
  
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
    
    // Fix for date offset issue - ensure we're saving the exact date selected
    // by forcing the time to noon to avoid timezone issues
    const fromDate = new Date(tempDate.from);
    fromDate.setHours(12, 0, 0, 0);
    
    const toDate = tempDate.to ? new Date(tempDate.to) : new Date(fromDate);
    toDate.setHours(12, 0, 0, 0);
    
    const newRange = {
      startDate: format(fromDate, 'yyyy-MM-dd'),
      endDate: format(toDate, 'yyyy-MM-dd'),
    };
    
    setDate({
      from: fromDate,
      to: toDate
    });
    
    setDateRange(newRange);
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
