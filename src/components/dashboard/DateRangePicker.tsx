
import React, { useEffect } from "react";
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
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function DateRangePicker() {
  const { dateRange, setDateRange } = useCampaign();
  
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
    to: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
  });
  
  // Update local state when context changes (e.g. from other components)
  useEffect(() => {
    setDate({
      from: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
      to: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
    });
  }, [dateRange]);
  
  const handleDateChange = (value: DateRange | undefined) => {
    setDate(value);
    if (value?.from) {
      setDateRange({
        startDate: format(value.from, 'yyyy-MM-dd'),
        endDate: value.to ? format(value.to, 'yyyy-MM-dd') : format(value.from, 'yyyy-MM-dd'),
      });
    }
  };

  const handleSaveDate = () => {
    if (date?.from) {
      setDateRange({
        startDate: format(date.from, 'yyyy-MM-dd'),
        endDate: date.to ? format(date.to, 'yyyy-MM-dd') : format(date.from, 'yyyy-MM-dd'),
      });
    }
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
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateChange}
              numberOfMonths={2}
              className="pointer-events-auto"
            />
            <div className="p-3 border-t border-border/50 bg-muted/20">
              <Button 
                onClick={handleSaveDate}
                size="sm"
                className="w-full"
              >
                Apply Date Range
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
