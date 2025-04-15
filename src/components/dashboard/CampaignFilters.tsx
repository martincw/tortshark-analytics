
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
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

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

  const handleDateSelect = (range: DateRange) => {
    setDateRange(range);
  };

  const handleClearDates = () => {
    setDateRange({ startDate: "", endDate: "" });
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm" 
                  className="w-auto bg-primary/20 border-primary/30 hover:bg-primary/30 text-primary-foreground font-medium"
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Quick Dates
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="end">
                <Card className="border-0 shadow-none">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base font-semibold">Quick Date Selector</h3>
                    </div>
                    <QuickDateSelector 
                      onSelect={handleDateSelect} 
                      currentRange={dateRange.startDate ? dateRange : null}
                      onClear={handleClearDates}
                    />
                  </CardContent>
                </Card>
              </PopoverContent>
            </Popover>
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
