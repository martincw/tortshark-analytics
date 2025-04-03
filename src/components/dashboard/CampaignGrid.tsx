
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
import { Search, Calendar, Filter, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { calculateMetrics } from "@/utils/campaignUtils";

export function CampaignGrid() {
  const { campaigns } = useCampaign();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const navigate = useNavigate();
  
  // Group campaigns by tort type (first part of name before the dash)
  const groupedCampaigns = campaigns.reduce((acc, campaign) => {
    const tortType = campaign.name.split(" - ")[0];
    
    if (!acc[tortType]) {
      acc[tortType] = [];
    }
    
    acc[tortType].push(campaign);
    return acc;
  }, {} as Record<string, Campaign[]>);
  
  // Create consolidated campaigns (one per tort type)
  const consolidatedCampaigns = Object.entries(groupedCampaigns).map(([tortType, campaigns]) => {
    // Use the first campaign as a base
    const baseCampaign = { ...campaigns[0] };
    
    // Sum up all the metrics
    const totalStats = campaigns.reduce((acc, campaign) => {
      acc.adSpend += campaign.stats.adSpend;
      acc.impressions += campaign.stats.impressions;
      acc.clicks += campaign.stats.clicks;
      return acc;
    }, { adSpend: 0, impressions: 0, clicks: 0, cpc: 0, date: baseCampaign.stats.date });
    
    // Calculate average CPC
    totalStats.cpc = totalStats.clicks > 0 ? totalStats.adSpend / totalStats.clicks : 0;
    
    // Sum up manual stats
    const totalManualStats = campaigns.reduce((acc, campaign) => {
      acc.leads += campaign.manualStats.leads;
      acc.cases += campaign.manualStats.cases;
      acc.retainers += campaign.manualStats.retainers;
      acc.revenue += campaign.manualStats.revenue;
      return acc;
    }, { leads: 0, cases: 0, retainers: 0, revenue: 0, date: baseCampaign.manualStats.date });
    
    return {
      ...baseCampaign,
      id: tortType, // Use tort type as ID for consolidated campaign
      name: tortType, // Use tort type as the name
      stats: totalStats,
      manualStats: totalManualStats
    };
  });
  
  // Extract unique campaign types
  const campaignTypes = Array.from(
    new Set(
      consolidatedCampaigns.map(campaign => campaign.name)
    )
  );
  
  // Filter campaigns based on search term and campaign type
  const filteredCampaigns = consolidatedCampaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.accountName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCampaign = filterCampaign === "all" || campaign.name === filterCampaign;
    
    return matchesSearch && matchesCampaign;
  });
  
  // Sort campaigns based on sort criteria
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "adSpend":
        return b.stats.adSpend - a.stats.adSpend;
      case "roi": {
        const metricsA = calculateMetrics(b).roi;
        const metricsB = calculateMetrics(a).roi;
        return metricsA - metricsB;
      }
      case "profit": {
        const metricsA = calculateMetrics(b).profit;
        const metricsB = calculateMetrics(a).profit;
        return metricsA - metricsB;
      }
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
          <Button onClick={() => navigate("/add-campaign")} size="sm" className="sm:ml-2 w-full sm:w-auto">
            <PlusCircle className="h-4 w-4 mr-1" /> Add Campaign
          </Button>
        </div>
      </div>
      
      {sortedCampaigns.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-lg font-medium text-muted-foreground">No campaigns found</p>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
          <Button 
            variant="outline" 
            onClick={() => {
              setSearchTerm("");
              setFilterCampaign("all");
            }}
            className="mt-4"
          >
            Clear filters
          </Button>
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
