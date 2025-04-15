
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Calendar, Clock, History, ArrowRight } from "lucide-react";
import { format } from "date-fns";

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Helper functions for date calculations
const getStartOfWeek = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setDate(date.getDate() - date.getDay());
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const getEndOfWeek = (date: Date): Date => {
  const startOfWeek = getStartOfWeek(date);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return endOfWeek;
};

const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getEndOfMonth = (date: Date): Date => {
  const endMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  endMonth.setHours(23, 59, 59, 999);
  return endMonth;
};

// Format date to YYYY-MM-DD string
const formatDateForApi = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};

interface QuickDateSelectorProps {
  onSelect: (range: DateRange) => void;
  currentRange: DateRange | null;
  onClear?: () => void;
}

const QuickDateSelector: React.FC<QuickDateSelectorProps> = ({ 
  onSelect, 
  currentRange,
  onClear
}) => {
  // Get today's date and reset time to midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const handleQuickSelect = (option: string) => {
    let start: Date;
    let end: Date;
    const now = new Date();

    switch (option) {
      case 'WeekToDate':
        start = getStartOfWeek(today);
        end = now;
        break;
      case 'MonthToDate':
        start = getStartOfMonth(today);
        end = now;
        break;
      case 'Last7Days':
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      case 'Last30Days':
        start = new Date(today);
        start.setDate(today.getDate() - 29);
        end = new Date();
        end.setHours(23, 59, 59, 999);
        break;
      case 'ThisWeek':
        start = getStartOfWeek(today);
        end = getEndOfWeek(today);
        break;
      case 'ThisMonth':
        start = getStartOfMonth(today);
        end = getEndOfMonth(today);
        break;
      case 'Yesterday':
        start = new Date(today);
        start.setDate(today.getDate() - 1);
        end = new Date(today);
        end.setDate(today.getDate() - 1);
        end.setHours(23, 59, 59, 999);
        break;
      case 'Today':
        start = today;
        end = now;
        break;
      default:
        start = today;
        end = now;
    }
    
    onSelect({ 
      startDate: formatDateForApi(start), 
      endDate: formatDateForApi(end) 
    });
  };

  // Function to highlight the selected range button
  const isSelected = (option: string): boolean => {
    if (!currentRange?.startDate) return false;
    
    const startDate = new Date(currentRange.startDate);
    const endDate = new Date(currentRange.endDate);
    const now = new Date();
    const todayStart = new Date(today);
    const yesterdayStart = new Date(today);
    yesterdayStart.setDate(today.getDate() - 1);
    
    switch (option) {
      case 'WeekToDate':
        return startDate.getTime() === getStartOfWeek(today).getTime();
      case 'MonthToDate':
        return startDate.getTime() === getStartOfMonth(today).getTime();
      case 'Last7Days':
        const last7Start = new Date(today);
        last7Start.setDate(today.getDate() - 6);
        return startDate.getTime() === last7Start.getTime();
      case 'Last30Days':
        const last30Start = new Date(today);
        last30Start.setDate(today.getDate() - 29);
        return startDate.getTime() === last30Start.getTime();
      case 'ThisWeek':
        return (
          startDate.getTime() === getStartOfWeek(today).getTime() &&
          endDate.getTime() === getEndOfWeek(today).getTime()
        );
      case 'ThisMonth':
        return (
          startDate.getTime() === getStartOfMonth(today).getTime() &&
          endDate.getTime() === getEndOfMonth(today).getTime()
        );
      case 'Yesterday':
        return (
          startDate.getDate() === yesterdayStart.getDate() &&
          startDate.getMonth() === yesterdayStart.getMonth() &&
          startDate.getFullYear() === yesterdayStart.getFullYear()
        );
      case 'Today':
        return (
          startDate.getDate() === todayStart.getDate() &&
          startDate.getMonth() === todayStart.getMonth() &&
          startDate.getFullYear() === todayStart.getFullYear() &&
          endDate.getDate() === todayStart.getDate()
        );
      default:
        return false;
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button 
          variant={isSelected('Today') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('Today')}
          className="w-full justify-start"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Today
        </Button>
        <Button 
          variant={isSelected('Yesterday') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('Yesterday')}
          className="w-full justify-start"
        >
          <History className="mr-2 h-4 w-4" />
          Yesterday
        </Button>
        <Button 
          variant={isSelected('ThisWeek') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('ThisWeek')}
          className="w-full justify-start"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          This Week
        </Button>
        <Button 
          variant={isSelected('ThisMonth') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('ThisMonth')}
          className="w-full justify-start"
        >
          <Calendar className="mr-2 h-4 w-4" />
          This Month
        </Button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button 
          variant={isSelected('WeekToDate') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('WeekToDate')}
          className="w-full justify-start"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Week To Date
        </Button>
        <Button 
          variant={isSelected('MonthToDate') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('MonthToDate')}
          className="w-full justify-start"
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          Month To Date
        </Button>
        <Button 
          variant={isSelected('Last7Days') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('Last7Days')}
          className="w-full justify-start"
        >
          <Clock className="mr-2 h-4 w-4" />
          Last 7 Days
        </Button>
        <Button 
          variant={isSelected('Last30Days') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('Last30Days')}
          className="w-full justify-start"
        >
          <Clock className="mr-2 h-4 w-4" />
          Last 30 Days
        </Button>
      </div>
      
      {currentRange && onClear && (
        <div className="flex justify-between items-center mt-2 pt-3 border-t">
          <div className="text-sm text-muted-foreground">
            {currentRange.startDate === currentRange.endDate 
              ? `Selected: ${currentRange.startDate}` 
              : `From ${currentRange.startDate} to ${currentRange.endDate}`}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear}
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuickDateSelector;
