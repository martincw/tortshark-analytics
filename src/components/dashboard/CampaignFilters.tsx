import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, PlusCircle, Calendar, X, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QuickDateSelector, { DateRange } from "./QuickDateSelector";
import { useCampaign } from "@/contexts/CampaignContext";
import { DateRangePicker } from "./DateRangePicker";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CampaignFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  filterCampaign: string;
  setFilterCampaign: (value: string) => void;
  campaignTypes: string[];
  showQuickDateSelector?: boolean;
}

export function CampaignFilters({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  filterCampaign,
  setFilterCampaign,
  campaignTypes,
  showQuickDateSelector = true
}: CampaignFiltersProps) {
  const navigate = useNavigate();
  const { dateRange, setDateRange } = useCampaign();
  
  useEffect(() => {
    console.log("CampaignFilters - Current date range:", dateRange);
  }, [dateRange]);

  const handleDateSelect = (range: DateRange) => {
    console.log("CampaignFilters - Selected date range:", range);
    setDateRange(range);
  };

  const handleClearDates = () => {
    setDateRange({ startDate: "", endDate: "" });
  };

  const dateOptions = [
    { label: "Today", value: "Today" },
    { label: "Yesterday", value: "Yesterday" },
    { label: "This Week", value: "ThisWeek" },
    { label: "This Month", value: "ThisMonth" },
    { label: "Week To Date", value: "WeekToDate" },
    { label: "Month To Date", value: "MonthToDate" },
    { label: "Last 7 Days", value: "Last7Days" },
    { label: "Last 30 Days", value: "Last30Days" }
  ];

  const handleQuickDateSelect = (option: string) => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start: Date;
    let end: Date;

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

    const formatDateForApi = (date: Date): string => {
      return date.toISOString().split('T')[0];
    };

    switch (option) {
      case 'Today':
        start = today;
        end = now;
        break;
      case 'Yesterday':
        start = new Date(today);
        start.setDate(today.getDate() - 1);
        end = new Date(today);
        end.setDate(today.getDate() - 1);
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
      default:
        start = today;
        end = now;
    }
    
    const newRange = { 
      startDate: formatDateForApi(start), 
      endDate: formatDateForApi(end) 
    };
    
    console.log("CampaignFilters - Quick select date range:", newRange);
    setDateRange(newRange);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns or accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-col sm:flex-row items-center">
          <div className="flex gap-2">
            <Select value={filterCampaign} onValueChange={setFilterCampaign}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Tort Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tort Types</SelectItem>
                {campaignTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Tort Type</SelectItem>
                <SelectItem value="roi">Highest ROI</SelectItem>
                <SelectItem value="profit">Highest Profit</SelectItem>
                <SelectItem value="date">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Date (Newest)
                  </div>
                </SelectItem>
                <SelectItem value="dateOldest">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4" />
                    Date (Oldest)
                  </div>
                </SelectItem>
                <SelectItem value="adSpend">Ad Spend</SelectItem>
                <SelectItem value="leads">Leads</SelectItem>
                <SelectItem value="cases">Cases</SelectItem>
                <SelectItem value="account">Account</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DateRangePicker />
          {showQuickDateSelector && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm" 
                  className="w-auto bg-primary/20 border-primary/30 hover:bg-primary/30 text-primary-foreground font-medium"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Quick Dates
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[180px] bg-popover" align="end">
                {dateOptions.map((option) => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => handleQuickDateSelect(option.value)}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
                {dateRange.startDate && (
                  <>
                    <DropdownMenuItem
                      className="border-t mt-1 pt-1 text-muted-foreground cursor-pointer"
                      onClick={handleClearDates}
                    >
                      Clear Selection
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={() => navigate("/add-campaign")} size="sm" className="sm:ml-2 w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-1" /> Add Campaign
          </Button>
        </div>
      </div>
      
      {dateRange.startDate && (
        <div className="flex justify-between items-center px-2 py-1 bg-accent/5 rounded-md border border-accent/20">
          <span className="text-sm">
            Date filter: <span className="font-medium">{dateRange.startDate}</span> to <span className="font-medium">{dateRange.endDate}</span>
          </span>
          <Button variant="ghost" size="sm" className="h-7" onClick={handleClearDates}>
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        </div>
      )}
    </div>
  );
}
