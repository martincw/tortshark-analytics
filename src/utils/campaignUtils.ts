import { Campaign, CampaignMetrics, DateRange } from "../types/campaign";
import { isWithinInterval, parseISO } from "date-fns";

// Calculate metrics for a campaign within a date range
export const calculateMetrics = (campaign: Campaign, dateRange?: DateRange): CampaignMetrics => {
  let totalRevenue = 0;
  let totalLeads = 0;
  let totalCases = 0;
  let totalAdSpend = 0;

  if (dateRange) {
    const startDate = parseISO(dateRange.startDate);
    const endDate = parseISO(dateRange.endDate);

    // Filter and sum stats from history within date range
    campaign.statsHistory.forEach(entry => {
      const entryDate = parseISO(entry.date);
      if (isWithinInterval(entryDate, { start: startDate, end: endDate })) {
        totalRevenue += entry.revenue;
        totalLeads += entry.leads;
        totalCases += entry.cases;
        totalAdSpend += entry.adSpend || 0;
      }
    });
  } else {
    // If no date range provided, use all stats
    totalRevenue = campaign.manualStats.revenue;
    totalLeads = campaign.manualStats.leads;
    totalCases = campaign.manualStats.cases;
    totalAdSpend = campaign.stats.adSpend;
  }

  // Avoid division by zero
  const costPerLead = totalLeads > 0 
    ? totalAdSpend / totalLeads 
    : 0;
  
  const cpa = totalCases > 0 
    ? totalAdSpend / totalCases 
    : 0;
  
  const profit = totalRevenue - totalAdSpend;
  
  // Calculate ROI as return percentage beyond 100%
  const roi = totalAdSpend > 0 
    ? (totalRevenue / totalAdSpend) * 100 
    : 0;
  
  // Calculate earnings per lead
  const earningsPerLead = totalLeads > 0
    ? profit / totalLeads
    : 0;

  return {
    costPerLead,
    cpa,
    profit,
    roi,
    earningsPerLead
  };
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
  return value.toString();
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
