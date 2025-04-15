
import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, PlusCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DateRange } from "@/types/campaign";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface CampaignFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  filterCampaign: string;
  setFilterCampaign: (value: string) => void;
  campaignTypes: string[];
  dateRange: DateRange;
  setDateRange: (dateRange: DateRange) => void;
}

export function CampaignFilters({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  filterCampaign,
  setFilterCampaign,
  campaignTypes,
  dateRange,
  setDateRange
}: CampaignFiltersProps) {
  const navigate = useNavigate();
  
  // Format the date range for display
  const formatDateRange = () => {
    if (!dateRange.startDate || !dateRange.endDate) return "Select date range";
    
    return `${format(new Date(dateRange.startDate), "MMM d, yyyy")} - ${format(new Date(dateRange.endDate), "MMM d, yyyy")}`;
  };
  
  // Handle date selection
  const handleDateSelect = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    
    if (!dateRange.startDate || (dateRange.startDate && dateRange.endDate)) {
      // If no start date or both dates are set, set start date
      setDateRange({
        startDate: dateStr,
        endDate: ""
      });
    } else {
      // If start date is set but no end date
      // And if selected date is after start date
      if (new Date(dateStr) >= new Date(dateRange.startDate)) {
        setDateRange({
          ...dateRange,
          endDate: dateStr
        });
      } else {
        // If selected date is before start date, swap them
        setDateRange({
          startDate: dateStr,
          endDate: dateRange.startDate
        });
      }
    }
  };

  return (
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
        <div className="flex gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                {formatDateRange()}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dateRange.startDate ? new Date(dateRange.startDate) : undefined}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
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
        <Button onClick={() => navigate("/add-campaign")} size="sm" className="sm:ml-2 w-full sm:w-auto">
          <PlusCircle className="h-4 w-4 mr-1" /> Add Campaign
        </Button>
      </div>
    </div>
  );
}
