
import React, { useState } from "react";
import { Campaign } from "@/types/campaign";
import { CampaignCard } from "./CampaignCard";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCampaign } from "@/contexts/CampaignContext";
import { Search, Calendar } from "lucide-react";

export function CampaignGrid() {
  const { campaigns } = useCampaign();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterCampaign, setFilterCampaign] = useState("all");
  
  // Extract unique campaign types (first part of name before the dash)
  const campaignTypes = Array.from(
    new Set(
      campaigns.map(campaign => {
        const parts = campaign.name.split(" - ");
        return parts[0];
      })
    )
  );
  
  // Filter campaigns based on search term and campaign type
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.accountName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const campaignType = campaign.name.split(" - ")[0];
    const matchesCampaign = filterCampaign === "all" || campaignType === filterCampaign;
    
    return matchesSearch && matchesCampaign;
  });
  
  // Sort campaigns based on sort criteria
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "adSpend":
        return b.stats.adSpend - a.stats.adSpend;
      case "leads":
        return b.manualStats.leads - a.manualStats.leads;
      case "cases":
        return b.manualStats.cases - a.manualStats.cases;
      case "date":
        return new Date(b.stats.date).getTime() - new Date(a.stats.date).getTime();
      case "dateOldest":
        return new Date(a.stats.date).getTime() - new Date(b.stats.date).getTime();
      case "account":
        return a.accountName.localeCompare(b.accountName);
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
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
        <div className="flex gap-4 flex-col sm:flex-row">
          <Select value={filterCampaign} onValueChange={setFilterCampaign}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Campaign Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaignTypes.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Campaign Name</SelectItem>
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
      </div>
      {sortedCampaigns.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-medium text-muted-foreground">No campaigns found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCampaigns.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      )}
    </div>
  );
}
