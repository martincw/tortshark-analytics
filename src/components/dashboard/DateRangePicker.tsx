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
  
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
    to: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
  });
  
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date);
  
  useEffect(() => {
    setDate({
      from: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
      to: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
    });
    setTempDate({
      from: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
      to: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
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
    
    const newRange = {
      startDate: format(tempDate.from, 'yyyy-MM-dd'),
      endDate: tempDate.to ? format(tempDate.to, 'yyyy-MM-dd') : format(tempDate.from, 'yyyy-MM-dd'),
    };
    
    setDate(tempDate);
    setDateRange(newRange);
    toast.success("Date range updated");
  };

  return (
    <div className="grid gap-2">
      <Popover>
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
