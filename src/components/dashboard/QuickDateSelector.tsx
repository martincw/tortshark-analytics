
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Calendar, Clock, History } from "lucide-react";
import { format, startOfWeek, endOfWeek, subDays, subWeeks, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

export interface DateRange {
  startDate: string;
  endDate: string;
}

// Helper functions for date calculations
const getStartOfWeek = (date: Date): Date => {
  // Always use Monday as the start of the week
  return startOfWeek(date, { weekStartsOn: 1 });
};

const getEndOfWeek = (date: Date): Date => {
  // Always use Sunday as the end of the week
  return endOfWeek(date, { weekStartsOn: 1 });
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

  // Get yesterday's date
  const yesterday = subDays(today, 1);
  yesterday.setHours(23, 59, 59, 999);

  const handleQuickSelect = (option: string) => {
    let start: Date;
    let end: Date;
    const now = new Date();

    switch (option) {
      case 'ThisWeek':
        // Set start to Monday of current week
        start = getStartOfWeek(today);
        end = getEndOfWeek(today);
        break;
      case 'LastWeek':
        // Set start to Monday of last week and end to Sunday of last week
        const lastWeek = subWeeks(today, 1);
        start = getStartOfWeek(lastWeek);
        end = getEndOfWeek(lastWeek);
        break;
      case 'Last7Days':
        // Changed: Use yesterday as end date instead of now
        end = yesterday;
        // Start date is 7 days before end date
        start = subDays(end, 6);
        break;
      case 'Last14Days':
        // New option: Last 14 days
        end = yesterday;
        // Start date is 14 days before end date
        start = subDays(end, 13);
        break;
      case 'MonthToDate':
        start = getStartOfMonth(today);
        end = now;
        break;
      case 'LastMonth':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'Last30Days':
        // Changed: Use yesterday as end date instead of now
        end = yesterday;
        // Start date is 30 days before end date
        start = subDays(end, 29);
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
      case 'ThisMonth':
        start = getStartOfMonth(today);
        end = getEndOfMonth(today);
        break;
      default:
        start = today;
        end = now;
    }
    
    const newRange = { 
      startDate: formatDateForApi(start), 
      endDate: formatDateForApi(end) 
    };
    
    onSelect(newRange);
    
    // Show more descriptive toast messages
    let toastMessage = "";
    if (option === 'ThisWeek') {
      toastMessage = `Date range updated to This Week (${format(start, 'MMM dd')} - ${format(end, 'MMM dd')})`;
    } else if (option === 'LastWeek') {
      toastMessage = `Date range updated to Last Week (${format(start, 'MMM dd')} - ${format(end, 'MMM dd')})`;
    } else if (option === 'LastMonth') {
      toastMessage = `Date range updated to Last Month (${format(start, 'MMM dd')} - ${format(end, 'MMM dd')})`;
    } else {
      toastMessage = `Date range updated to ${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
    }
    
    toast.success(toastMessage);
    console.log(`Selected ${option}: ${JSON.stringify(newRange)}`);
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
      case 'MonthToDate':
        return startDate.getTime() === getStartOfMonth(today).getTime();
      case 'Last7Days':
        // Update the check for Last7Days
        const last7End = new Date(yesterday);
        const last7Start = subDays(last7End, 6);
        return (
          format(startDate, "yyyy-MM-dd") === format(last7Start, "yyyy-MM-dd") &&
          format(endDate, "yyyy-MM-dd") === format(last7End, "yyyy-MM-dd")
        );
      case 'Last14Days':
        // Add check for Last14Days
        const last14End = new Date(yesterday);
        const last14Start = subDays(last14End, 13);
        return (
          format(startDate, "yyyy-MM-dd") === format(last14Start, "yyyy-MM-dd") &&
          format(endDate, "yyyy-MM-dd") === format(last14End, "yyyy-MM-dd")
        );
      case 'Last30Days':
        // Update the check for Last30Days
        const last30End = new Date(yesterday);
        const last30Start = subDays(last30End, 29);
        return (
          format(startDate, "yyyy-MM-dd") === format(last30Start, "yyyy-MM-dd") &&
          format(endDate, "yyyy-MM-dd") === format(last30End, "yyyy-MM-dd")
        );
      case 'ThisWeek':
        const thisWeekStart = getStartOfWeek(today);
        const thisWeekEnd = getEndOfWeek(today);
        return (
          format(startDate, "yyyy-MM-dd") === format(thisWeekStart, "yyyy-MM-dd") &&
          format(endDate, "yyyy-MM-dd") === format(thisWeekEnd, "yyyy-MM-dd")
        );
      case 'LastWeek':
        const lastWeek = subWeeks(today, 1);
        const lastWeekStart = getStartOfWeek(lastWeek);
        const lastWeekEnd = getEndOfWeek(lastWeek);
        return (
          format(startDate, "yyyy-MM-dd") === format(lastWeekStart, "yyyy-MM-dd") &&
          format(endDate, "yyyy-MM-dd") === format(lastWeekEnd, "yyyy-MM-dd")
        );
      case 'LastMonth':
        const lastMonth = subMonths(today, 1);
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);
        return (
          format(startDate, "yyyy-MM-dd") === format(lastMonthStart, "yyyy-MM-dd") &&
          format(endDate, "yyyy-MM-dd") === format(lastMonthEnd, "yyyy-MM-dd")
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
      <div className="grid grid-cols-1 gap-2">
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
          This Week (Mon-Sun)
        </Button>
        <Button 
          variant={isSelected('LastWeek') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('LastWeek')}
          className="w-full justify-start"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Last Week (Mon-Sun)
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
        <Button 
          variant={isSelected('LastMonth') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('LastMonth')}
          className="w-full justify-start"
        >
          <Calendar className="mr-2 h-4 w-4" />
          Last Month
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
          variant={isSelected('Last14Days') ? "default" : "outline"} 
          size="sm" 
          onClick={() => handleQuickSelect('Last14Days')}
          className="w-full justify-start"
        >
          <Clock className="mr-2 h-4 w-4" />
          Last 14 Days
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
      
      {currentRange?.startDate && onClear && (
        <div className="flex justify-between items-center pt-3 border-t">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear}
            className="w-full"
          >
            Clear Selection
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuickDateSelector;
