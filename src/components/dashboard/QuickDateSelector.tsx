
import React from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, Calendar } from "lucide-react";
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
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return endOfWeek;
};

const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
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
      default:
        start = today;
        end = now;
    }
    
    onSelect({ 
      startDate: formatDateForApi(start), 
      endDate: formatDateForApi(end) 
    });
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleQuickSelect('WeekToDate')}
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          Week To Date
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleQuickSelect('MonthToDate')}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Month To Date
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleQuickSelect('Last7Days')}
        >
          Last 7 Days
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleQuickSelect('Last30Days')}
        >
          Last 30 Days
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleQuickSelect('ThisWeek')}
        >
          This Week
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleQuickSelect('ThisMonth')}
        >
          This Month
        </Button>
        
        {currentRange && onClear && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClear}
          >
            Clear Dates
          </Button>
        )}
      </div>
      
      {currentRange && (
        <div className="text-sm text-muted-foreground mt-1">
          Showing data from {currentRange.startDate} to {currentRange.endDate}
        </div>
      )}
    </div>
  );
};

export default QuickDateSelector;
