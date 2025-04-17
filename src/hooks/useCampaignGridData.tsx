import { useState, useMemo, useEffect } from "react";
import { Campaign } from "@/types/campaign";
import { calculateMetrics } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";

export function useCampaignGridData(campaigns: Campaign[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const { dateRange } = useCampaign();
  
  // Log incoming campaigns and date range for debugging
  useEffect(() => {
    console.log(`useCampaignGridData received ${campaigns.length} campaigns with date range:`, dateRange);
  }, [campaigns, dateRange]);
  
  // Filter campaigns by date range first
  const dateFilteredCampaigns = useMemo(() => {
    // If no date range is set, return all campaigns
    if (!dateRange.startDate || !dateRange.endDate) {
      console.log("No date range filter applied");
      return campaigns;
    }

    console.log("Filtering campaigns by date range:", dateRange);
    
    // Apply date filter to campaigns based on their statsHistory
    return campaigns.map(campaign => {
      // Create a deep copy of the campaign to avoid mutating the original
      const filteredCampaign = JSON.parse(JSON.stringify(campaign));
      
      // Filter statsHistory entries by date range
      const filteredHistory = campaign.statsHistory.filter(entry => {
        const entryDate = new Date(entry.date);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        
        // Set time to noon to avoid timezone issues
        entryDate.setHours(12, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        return entryDate >= startDate && entryDate <= endDate;
      });
      
      // Calculate aggregate stats from filtered history
      const aggregateStats = filteredHistory.reduce((acc, entry) => {
        acc.adSpend += entry.adSpend || 0;
        acc.leads += entry.leads || 0;
        acc.cases += entry.cases || 0;
        acc.revenue += entry.revenue || 0;
        return acc;
      }, { adSpend: 0, leads: 0, cases: 0, revenue: 0 });
      
      // Update campaign stats with date-filtered values
      filteredCampaign.stats.adSpend = aggregateStats.adSpend;
      filteredCampaign.manualStats.leads = aggregateStats.leads;
      filteredCampaign.manualStats.cases = aggregateStats.cases;
      filteredCampaign.manualStats.revenue = aggregateStats.revenue;
      
      // Keep the original statsHistory for reference
      filteredCampaign.statsHistory = filteredHistory;
      
      return filteredCampaign;
    });
  }, [campaigns, dateRange]);
  
  // Memoize the grouping operation to prevent recalculations
  const groupedCampaigns = useMemo(() => {
    // Create a deep copy of the campaigns to avoid any reference issues
    return dateFilteredCampaigns.reduce((acc, campaign) => {
      // Use actual campaign name instead of splitting (which was causing issues)
      const tortType = campaign.name;
      
      if (!acc[tortType]) {
        acc[tortType] = [];
      }
      
      acc[tortType].push({...campaign});
      return acc;
    }, {} as Record<string, Campaign[]>);
  }, [dateFilteredCampaigns]);
  
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
    console.log("useCampaignGridData: Filtering and sorting campaigns");
    
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
  }, [consolidatedCampaigns, searchTerm, filterCampaign, sortBy]);

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
