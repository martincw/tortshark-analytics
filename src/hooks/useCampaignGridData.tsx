import { useState, useMemo } from "react";
import { Campaign } from "@/types/campaign";
import { calculateMetrics } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";

export function useCampaignGridData(campaigns: Campaign[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("profit");
  const [filterCampaign, setFilterCampaign] = useState("all");
  const { dateRange } = useCampaign();
  
  // Only filter by date range once
  const dateFilteredCampaigns = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return campaigns;
    }

    return campaigns.map(campaign => {
      const filteredCampaign = {...campaign};
      
      const filteredHistory = campaign.statsHistory.filter(entry => {
        const entryDate = new Date(entry.date);
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        
        entryDate.setHours(12, 0, 0, 0);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        
        return entryDate >= startDate && entryDate <= endDate;
      });
      
      // Pre-calculate aggregated stats to avoid doing this multiple times
      const aggregateStats = filteredHistory.reduce((acc, entry) => {
        // Ensure all values are valid numbers
        const adSpend = typeof entry.adSpend === 'number' ? entry.adSpend : 0;
        const leads = typeof entry.leads === 'number' ? entry.leads : 0;
        const cases = typeof entry.cases === 'number' ? entry.cases : 0;
        const revenue = typeof entry.revenue === 'number' ? entry.revenue : 0;
        
        acc.adSpend += adSpend;
        acc.leads += leads;
        acc.cases += cases;
        acc.revenue += revenue;
        return acc;
      }, { adSpend: 0, leads: 0, cases: 0, revenue: 0 });
      
      // Calculate profit directly to check for issues
      const directProfit = aggregateStats.revenue - aggregateStats.adSpend;
      console.log(`Campaign ${campaign.name} direct stats - Revenue: ${aggregateStats.revenue}, AdSpend: ${aggregateStats.adSpend}, Direct Profit: ${directProfit}`);
      
      filteredCampaign.stats = {
        ...filteredCampaign.stats,
        adSpend: aggregateStats.adSpend
      };
      
      filteredCampaign.manualStats = {
        ...filteredCampaign.manualStats,
        leads: aggregateStats.leads,
        cases: aggregateStats.cases,
        revenue: aggregateStats.revenue
      };
      
      filteredCampaign.statsHistory = filteredHistory;
      
      // Pre-calculate metrics to avoid doing this multiple times
      filteredCampaign._metrics = calculateMetrics(filteredCampaign, dateRange);
      
      // Sanity check for profit calculation
      if (filteredCampaign._metrics.profit === 0 && directProfit > 0) {
        console.warn(`Campaign ${campaign.name} has inconsistent profit calculation. Fixing.`);
        filteredCampaign._metrics.profit = directProfit;
      }
      
      return filteredCampaign;
    });
  }, [campaigns, dateRange]);
  
  const groupedCampaigns = useMemo(() => {
    return dateFilteredCampaigns.reduce<Record<string, Campaign[]>>((acc, campaign) => {
      const tortType = campaign.name;
      
      if (!acc[tortType]) {
        acc[tortType] = [];
      }
      
      acc[tortType].push({...campaign});
      return acc;
    }, {});
  }, [dateFilteredCampaigns]);
  
  const consolidatedCampaigns = useMemo(() => {
    return Object.entries(groupedCampaigns).map(([tortType, campaigns]) => {
      const baseCampaign = {...campaigns[0]};
      
      const totalStats = campaigns.reduce((acc, campaign) => {
        acc.adSpend += campaign.stats.adSpend;
        acc.impressions += campaign.stats.impressions;
        acc.clicks += campaign.stats.clicks;
        return acc;
      }, { 
        adSpend: 0, 
        impressions: 0, 
        clicks: 0, 
        cpc: 0, 
        date: baseCampaign.stats.date, 
        // Add the missing required fields
        conversions: 0,
        cost: 0,
        ctr: 0,
        conversionRate: 0,
        averageCpc: 0
      });
      
      totalStats.cpc = totalStats.clicks > 0 ? totalStats.adSpend / totalStats.clicks : 0;
      totalStats.cost = totalStats.adSpend; // Set cost equal to adSpend
      totalStats.averageCpc = totalStats.cpc; // Set averageCpc equal to cpc
      totalStats.ctr = totalStats.impressions > 0 ? (totalStats.clicks / totalStats.impressions) * 100 : 0; // Calculate CTR
      totalStats.conversionRate = totalStats.clicks > 0 ? (totalStats.conversions / totalStats.clicks) * 100 : 0; // Calculate conversion rate
      
      const totalManualStats = campaigns.reduce((acc, campaign) => {
        acc.leads += campaign.manualStats.leads;
        acc.cases += campaign.manualStats.cases;
        acc.retainers += campaign.manualStats.retainers;
        acc.revenue += campaign.manualStats.revenue;
        return acc;
      }, { leads: 0, cases: 0, retainers: 0, revenue: 0, date: baseCampaign.manualStats.date });
      
      // Ensure is_active is preserved in consolidated campaign
      // A group is considered active if ANY of its campaigns are active
      const isActive = campaigns.some(campaign => campaign.is_active !== false);
      
      return {
        ...baseCampaign,
        name: tortType,
        stats: totalStats,
        manualStats: totalManualStats,
        is_active: isActive
      };
    });
  }, [groupedCampaigns]);
  
  const campaignTypes = useMemo(() => {
    return Array.from(
      new Set(
        consolidatedCampaigns.map(campaign => campaign.name)
      )
    );
  }, [consolidatedCampaigns]);
  
  const sortedAndFilteredCampaigns = useMemo(() => {
    const filteredCampaigns = consolidatedCampaigns.filter(campaign => {
      const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (campaign.accountName && campaign.accountName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCampaign = filterCampaign === "all" || campaign.name === filterCampaign;
      
      return matchesSearch && matchesCampaign;
    });
    
    return [...filteredCampaigns].sort((a, b) => {
      // First sort by active status (active campaigns first)
      if ((a.is_active !== false) && (b.is_active === false)) return -1;
      if ((a.is_active === false) && (b.is_active !== false)) return 1;
      
      // Then apply the selected sort criteria
      switch (sortBy) {
        case "earningsPerLead": {
          const earningsPerLeadA = a._metrics?.earningsPerLead || 
            (a.manualStats.leads > 0 ? a.manualStats.revenue / a.manualStats.leads : 0);
          const earningsPerLeadB = b._metrics?.earningsPerLead || 
            (b.manualStats.leads > 0 ? b.manualStats.revenue / b.manualStats.leads : 0);
          return earningsPerLeadB - earningsPerLeadA;
        }
        case "name":
          return a.name.localeCompare(b.name);
        case "adSpend":
          return b.stats.adSpend - a.stats.adSpend;
        case "roi": {
          const metricsA = a._metrics?.roi || 0;
          const metricsB = b._metrics?.roi || 0;
          return metricsB - metricsA;
        }
        case "profit": {
          // Ensure we're using valid numbers for comparison
          const profitA = (a._metrics?.profit || 0);
          const profitB = (b._metrics?.profit || 0);
          
          // Check if campaigns have any activity (revenue OR ad spend > 0)
          const hasActivityA = a.manualStats.revenue > 0 || a.stats.adSpend > 0;
          const hasActivityB = b.manualStats.revenue > 0 || b.stats.adSpend > 0;
          
          // Three-tier sorting system:
          // 1. Active campaigns (with activity) come before inactive campaigns
          if (hasActivityA && !hasActivityB) return -1;
          if (!hasActivityA && hasActivityB) return 1;
          
          // 2. If both have activity, sort by profit (highest first)
          if (hasActivityA && hasActivityB) {
            return profitB - profitA;
          }
          
          // 3. If both are inactive (no activity), maintain original order
          return 0;
        }
        case "revenue":
          return b.manualStats.revenue - a.manualStats.revenue;
        case "leads":
          return b.manualStats.leads - a.manualStats.leads;
        case "cases":
          return b.manualStats.cases - a.manualStats.cases;
        case "date":
          return new Date(b.stats.date).getTime() - new Date(a.stats.date).getTime();
        case "dateOldest":
          return new Date(a.stats.date).getTime() - new Date(b.stats.date).getTime();
        case "account":
          return (a.accountName || '').localeCompare(b.accountName || '');
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
    campaignTypes: Array.from(new Set(consolidatedCampaigns.map(campaign => campaign.name))),
    sortedAndFilteredCampaigns
  };
}
