
import React from "react";
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
  
  const handleDateChange = (value: DateRange | undefined) => {
    setDate(value);
    if (value?.from && value.to) {
      setDateRange({
        startDate: format(value.from, 'yyyy-MM-dd'),
        endDate: format(value.to, 'yyyy-MM-dd'),
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
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
