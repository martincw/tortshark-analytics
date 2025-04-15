
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
import { Search, Filter, PlusCircle, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QuickDateSelector, { DateRange } from "./QuickDateSelector";
import { useCampaign } from "@/contexts/CampaignContext";

interface CampaignFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  filterCampaign: string;
  setFilterCampaign: (value: string) => void;
  campaignTypes: string[];
}

export function CampaignFilters({
  searchTerm,
  setSearchTerm,
  sortBy,
  setSortBy,
  filterCampaign,
  setFilterCampaign,
  campaignTypes
}: CampaignFiltersProps) {
  const navigate = useNavigate();
  const { dateRange, setDateRange } = useCampaign();
  // Always show date selector by default
  const [showDateSelector, setShowDateSelector] = useState(true);

  const handleDateSelect = (range: DateRange) => {
    setDateRange(range);
    // Don't hide the date selector after selection
  };

  const handleClearDates = () => {
    setDateRange({ startDate: "", endDate: "" });
  };

  const toggleDateSelector = () => {
    setShowDateSelector(!showDateSelector);
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
          <Button
            variant={showDateSelector ? "secondary" : "outline"}
            size="sm" 
            onClick={toggleDateSelector}
            className="w-auto"
            title="Toggle date filters"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Date Filter
          </Button>
          <Button onClick={() => navigate("/add-campaign")} size="sm" className="sm:ml-2 w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-1" /> Add Campaign
          </Button>
        </div>
      </div>
      
      {showDateSelector && (
        <div className="p-4 border rounded-md mt-2 bg-card shadow-sm">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-3">Quick Date Selection</h3>
              <QuickDateSelector 
                onSelect={handleDateSelect} 
                currentRange={dateRange.startDate ? dateRange : null}
                onClear={handleClearDates}
              />
            </div>
          </div>
        </div>
      )}
      
      {dateRange.startDate && !showDateSelector && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Filtered by date: {dateRange.startDate} to {dateRange.endDate}
          </span>
          <Button variant="ghost" size="sm" onClick={handleClearDates}>
            Clear Date Filter
          </Button>
        </div>
      )}
    </div>
  );
}
