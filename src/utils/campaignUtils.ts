
import { Campaign, CampaignMetrics, DateRange } from "../types/campaign";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";

// Calculate metrics for a campaign within a date range
export const calculateMetrics = (campaign: Campaign, dateRange?: DateRange): CampaignMetrics => {
  let totalRevenue = 0;
  let totalLeads = 0;
  let totalCases = 0;
  let totalAdSpend = 0;

  // Check if there's any data in statsHistory
  if (!campaign.statsHistory || campaign.statsHistory.length === 0) {
    console.log('No stats history available for campaign:', campaign.id);
    return {
      revenue: 0,
      leads: 0,
      cases: 0,
      adSpend: 0,
      costPerLead: 0,
      cpa: 0,
      profit: 0,
      roi: 0,
      earningsPerLead: 0
    };
  }

  // Count entries that match the date range for logging purposes
  let entriesInRange = 0;

  if (dateRange && dateRange.startDate && dateRange.endDate) {
    console.log(`Calculating metrics for date range: ${dateRange.startDate} to ${dateRange.endDate}`);
    console.log('Campaign ID:', campaign.id);
    console.log('Stats history entries:', campaign.statsHistory.length);
    
    // Filter and sum stats from history within date range
    campaign.statsHistory.forEach(entry => {
      if (isDateInRange(entry.date, dateRange.startDate!, dateRange.endDate!)) {
        entriesInRange++;
        console.log(`Including stats for date ${entry.date} in calculation:`, {
          leads: entry.leads,
          cases: entry.cases,
          revenue: entry.revenue,
          adSpend: entry.adSpend || 0
        });
        
        totalRevenue += entry.revenue;
        totalLeads += entry.leads;
        totalCases += entry.cases;
        totalAdSpend += entry.adSpend || 0;
      } else {
        // Skip logging for entries outside range to reduce console clutter
      }
    });
    
    console.log(`Found ${entriesInRange} entries in date range out of ${campaign.statsHistory.length} total entries`);
    console.log('Calculated totals from filtered history:', {
      totalRevenue,
      totalLeads,
      totalCases,
      totalAdSpend
    });
  } else {
    // If no date range provided, use all statsHistory totals
    console.log('No date range provided, using all campaign stats from history');
    campaign.statsHistory.forEach(entry => {
      totalRevenue += entry.revenue;
      totalLeads += entry.leads;
      totalCases += entry.cases;
      totalAdSpend += entry.adSpend || 0;
    });
    
    console.log('Calculated totals from all history:', {
      totalRevenue,
      totalLeads,
      totalCases,
      totalAdSpend
    });
  }

  // Calculate derived metrics (safely avoiding division by zero)
  const costPerLead = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
  const cpa = totalCases > 0 ? totalAdSpend / totalCases : 0;
  const profit = totalRevenue - totalAdSpend;
  const roi = totalAdSpend > 0 ? ((totalRevenue - totalAdSpend) / totalAdSpend) * 100 : 0;
  const earningsPerLead = totalLeads > 0 ? profit / totalLeads : 0;

  const metrics = {
    revenue: totalRevenue,
    leads: totalLeads,
    cases: totalCases,
    adSpend: totalAdSpend,
    costPerLead,
    cpa,
    profit,
    roi,
    earningsPerLead
  };

  console.log('Final calculated metrics:', metrics);
  
  return metrics;
};

// Get period stats within a specific date range
export const getPeriodStats = (campaign: Campaign, dateRange?: DateRange) => {
  if (!campaign.statsHistory || campaign.statsHistory.length === 0) {
    console.log('No stats history available for getPeriodStats');
    return {
      leads: 0,
      cases: 0,
      revenue: 0,
      adSpend: 0
    };
  }
  
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    console.log('No date range provided for getPeriodStats, using all campaign stats');
    // Sum up all stats from history
    const totalStats = campaign.statsHistory.reduce((acc, entry) => {
      return {
        leads: acc.leads + entry.leads,
        cases: acc.cases + entry.cases,
        revenue: acc.revenue + entry.revenue,
        adSpend: acc.adSpend + (entry.adSpend || 0)
      };
    }, { leads: 0, cases: 0, revenue: 0, adSpend: 0 });
    
    console.log('Total stats from all history:', totalStats);
    return totalStats;
  }
  
  console.log(`Calculating period stats for range: ${dateRange.startDate} to ${dateRange.endDate}`);
  
  const periodStats = campaign.statsHistory.reduce((acc, entry) => {
    if (isDateInRange(entry.date, dateRange.startDate!, dateRange.endDate!)) {
      console.log(`Including stats for date ${entry.date} in period calculation:`, entry);
      return {
        leads: acc.leads + entry.leads,
        cases: acc.cases + entry.cases,
        revenue: acc.revenue + entry.revenue,
        adSpend: acc.adSpend + (entry.adSpend || 0)
      };
    }
    return acc;
  }, { leads: 0, cases: 0, revenue: 0, adSpend: 0 });
  
  console.log('Period stats calculation result:', periodStats);
  return periodStats;
};

// Format currency with $ and commas
export const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

// Format short currency (no cents for large numbers)
export const formatCurrencyCompact = (value: number): string => {
  if (Math.abs(value) >= 1000) {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }
  return formatCurrency(value);
};

// Format percentage values
export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Format large numbers with abbreviations
export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(1);
};

// Get color class based on performance metrics
export const getPerformanceClass = (roi: number): string => {
  if (roi > 200) return "text-success-DEFAULT font-bold";
  if (roi > 100) return "text-secondary font-bold";
  if (roi > 0) return "text-secondary";
  return "text-error-DEFAULT";
};

// Get trend direction based on metrics
export const getTrendDirection = (value: number): "up" | "down" | "neutral" => {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "neutral";
};

// Get performance label based on metrics
export const getPerformanceLabel = (roi: number): string => {
  if (roi > 200) return "Excellent";
  if (roi > 100) return "Good";
  if (roi > 0) return "Positive";
  return "Needs Improvement";
};

// Get background class based on performance
export const getPerformanceBgClass = (roi: number): string => {
  if (roi > 200) return "bg-success-muted";
  if (roi > 100) return "bg-secondary/15";
  if (roi > 0) return "bg-secondary/10";
  return "bg-error-muted";
};
