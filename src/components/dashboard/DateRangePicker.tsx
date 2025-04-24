
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
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDateForStorage, parseStoredDate } from "@/lib/utils/ManualDateUtils";
import QuickDateSelector from "./QuickDateSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DateRangePicker() {
  const { dateRange, setDateRange } = useCampaign();
  
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
  
  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      localStorage.setItem('dateRange', JSON.stringify(dateRange));
    }
  }, [dateRange]);
  
  const handleTempDateChange = (value: DateRange | undefined) => {
    setTempDate(value);
  };

  const handleSaveDate = () => {
    if (!tempDate?.from) return;
    
    const formattedStartDate = formatDateForStorage(tempDate.from);
    const formattedEndDate = formatDateForStorage(tempDate.to || tempDate.from);
    
    setDate({
      from: tempDate.from,
      to: tempDate.to || tempDate.from
    });
    
    const newDateRange = {
      startDate: formattedStartDate,
      endDate: formattedEndDate,
    };
    
    setDateRange(newDateRange);
    setIsPopoverOpen(false);
    toast.success("Date range updated");
  };

  const handleDateSelect = (range: any) => {
    setDateRange(range);
  };
  
  const handleClearDates = () => {
    setDateRange({ startDate: "", endDate: "" });
    setDate(undefined);
    setTempDate(undefined);
    toast.success("Date range cleared");
  };

  return (
    <div className="flex gap-2 items-center">
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            size="sm"
            className={cn(
              "justify-start text-left font-normal",
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
              <span>Select dates</span>
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
                Apply Date Range
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-primary/20 border-primary/30 hover:bg-primary/30 text-primary-foreground font-medium"
          >
            Quick Select
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[300px] p-4" align="end">
          <QuickDateSelector
            onSelect={handleDateSelect}
            currentRange={dateRange}
            onClear={handleClearDates}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
