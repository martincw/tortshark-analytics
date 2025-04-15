
import { useState, useMemo } from "react";
import { Campaign } from "@/types/campaign";
import { calculateMetrics } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns";

export function useCampaignGridData(campaigns: Campaign[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const { dateRange } = useCampaign();
  
  // Log incoming campaigns for debugging
  useMemo(() => {
    console.log(`useCampaignGridData received ${campaigns.length} campaigns`);
    console.log(`useCampaignGridData date range: ${dateRange.startDate} to ${dateRange.endDate}`);
  }, [campaigns, dateRange]);
  
  // Memoize the grouping operation to prevent recalculations
  const groupedCampaigns = useMemo(() => {
    // Create a deep copy of the campaigns to avoid any reference issues
    return campaigns.reduce((acc, campaign) => {
      // Use actual campaign name instead of splitting (which was causing issues)
      const tortType = campaign.name;
      
      if (!acc[tortType]) {
        acc[tortType] = [];
      }
      
      acc[tortType].push({...campaign});
      return acc;
    }, {} as Record<string, Campaign[]>);
  }, [campaigns]);
  
  // Memoize the consolidated campaigns calculation
  const consolidatedCampaigns = useMemo(() => {
    return Object.entries(groupedCampaigns).map(([tortType, campaigns]) => {
      // Make a deep copy of the first campaign to avoid reference issues
      const baseCampaign = JSON.parse(JSON.stringify(campaigns[0]));
      
      const totalStats = campaigns.reduce((acc, campaign) => {
        acc.adSpend += campaign.stats.adSpend;
        acc.impressions += campaign.stats.impressions;
        acc.clicks += campaign.stats.clicks;
        return acc;
      }, { adSpend: 0, impressions: 0, clicks: 0, cpc: 0, date: baseCampaign.stats.date });
      
      totalStats.cpc = totalStats.clicks > 0 ? totalStats.adSpend / totalStats.clicks : 0;
      
      const totalManualStats = campaigns.reduce((acc, campaign) => {
        acc.leads += campaign.manualStats.leads;
        acc.cases += campaign.manualStats.cases;
        acc.retainers += campaign.manualStats.retainers;
        acc.revenue += campaign.manualStats.revenue;
        return acc;
      }, { leads: 0, cases: 0, retainers: 0, revenue: 0, date: baseCampaign.manualStats.date });
      
      // Keep the actual campaign ID (not using tortType as ID)
      return {
        ...baseCampaign,
        name: tortType,
        stats: totalStats,
        manualStats: totalManualStats
      };
    });
  }, [groupedCampaigns]);
  
  // Extract unique campaign types (memoized)
  const campaignTypes = useMemo(() => {
    return Array.from(
      new Set(
        consolidatedCampaigns.map(campaign => campaign.name)
      )
    );
  }, [consolidatedCampaigns]);
  
  // Filter and sort campaigns (memoized)
  const sortedAndFilteredCampaigns = useMemo(() => {
    console.log("useCampaignGridData: Filtering and sorting campaigns with date range:", 
      dateRange.startDate, "to", dateRange.endDate);
    
    // First filter
    const filteredCampaigns = consolidatedCampaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           campaign.accountName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCampaign = filterCampaign === "all" || campaign.name === filterCampaign;
      
      return matchesSearch && matchesCampaign;
    });
    
    // Then sort
    return [...filteredCampaigns].sort((a, b) => {
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
  }, [consolidatedCampaigns, searchTerm, filterCampaign, sortBy, dateRange]);

  return {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filterCampaign,
    setFilterCampaign,
    campaignTypes,
    sortedAndFilteredCampaigns
  };
}
