import { Campaign, CampaignMetrics, DateRange } from "../types/campaign";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";
import { addDays, subDays } from "date-fns";
import { calculateOptimalSpend } from "./spendOptimization";

// Create a cache for metric calculations to avoid recalculating
const metricsCache = new Map<string, CampaignMetrics>();

export const calculateMetrics = (campaign: Campaign, dateRange?: DateRange): CampaignMetrics => {
  // Create a cache key combining campaign ID and date range
  const cacheKey = campaign.id + (dateRange ? `_${dateRange.startDate}_${dateRange.endDate}` : '_all');
  
  // Check if we have cached results
  if (campaign._metrics) {
    return campaign._metrics;
  }
  
  if (metricsCache.has(cacheKey)) {
    return metricsCache.get(cacheKey)!;
  }

  // Get filtered stats based on date range
  const periodStats = getPeriodStats(campaign, dateRange);
  
  // Get previous week's stats using trailing 7 days
  const previousWeekStats = getPreviousWeekStats(campaign, dateRange);
  
  // Add debug logging to track values
  console.log(`Campaign ${campaign.name} - Revenue: ${periodStats.revenue}, AdSpend: ${periodStats.adSpend}`);
  
  // Calculate metrics using period stats
  const costPerLead = periodStats.leads > 0 ? periodStats.adSpend / periodStats.leads : 0;
  const cpa = periodStats.cases > 0 ? periodStats.adSpend / periodStats.cases : 0;
  const cpl = costPerLead; // Alias for cpl field
  
  // Ensure both values are valid numbers for profit calculation
  const revenue = typeof periodStats.revenue === 'number' ? periodStats.revenue : 0;
  const adSpend = typeof periodStats.adSpend === 'number' ? periodStats.adSpend : 0;
  
  // Explicitly calculate profit with numeric safety checks
  const profit = revenue - adSpend;
  console.log(`Campaign ${campaign.name} - Calculated profit: ${profit}`);
  
  const previousWeekProfit = previousWeekStats.revenue - previousWeekStats.adSpend;
  const weekOverWeekChange = profit - previousWeekProfit;
  const roi = adSpend > 0 ? (profit / adSpend) * 100 : 0;
  const roas = adSpend > 0 ? (revenue / adSpend) * 100 : 0;
  const earningsPerLead = periodStats.leads > 0 ? revenue / periodStats.leads : 0;
  const revenuePerCase = periodStats.cases > 0 ? revenue / periodStats.cases : 0;
  const retainers = periodStats.cases; // Set retainers equal to cases for now

  // Always calculate optimal spend recommendations (now with enhanced states)
  const optimizationResult = calculateOptimalSpend(campaign.statsHistory || []);

  const metrics: CampaignMetrics = {
    revenue: revenue,
    leads: periodStats.leads,
    cases: periodStats.cases,
    retainers: retainers,
    adSpend: adSpend,
    costPerLead,
    cpa,
    cpl,
    profit,
    roi,
    roas,
    earningsPerLead,
    revenuePerCase,
    previousWeekProfit,
    weekOverWeekChange,
    // Enhanced optimization metrics (always populated now)
    optimalDailySpend: optimizationResult?.optimalDailySpend || 0,
    currentEfficiency: optimizationResult?.currentEfficiency || 0,
    spendConfidenceScore: optimizationResult?.confidenceScore || 0,
    spendRecommendation: optimizationResult?.recommendation || "Gathering data...",
    projectedLeadIncrease: optimizationResult?.projectedLeadIncrease || 0,
    analysisType: optimizationResult?.analysisType || 'gathering'
  };

  // Store in cache
  metricsCache.set(cacheKey, metrics);

  return metrics;
};

export const getPeriodStats = (campaign: Campaign, dateRange?: DateRange) => {
  if (!campaign.statsHistory || campaign.statsHistory.length === 0) {
    return {
      leads: 0,
      cases: 0,
      revenue: 0,
      adSpend: 0
    };
  }
  
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    // Sum up all stats from history
    const totalStats = campaign.statsHistory.reduce((acc, entry) => {
      return {
        leads: acc.leads + entry.leads,
        cases: acc.cases + entry.cases,
        revenue: acc.revenue + entry.revenue,
        adSpend: acc.adSpend + (entry.adSpend || 0)
      };
    }, { leads: 0, cases: 0, revenue: 0, adSpend: 0 });
    
    return totalStats;
  }
  
  // Optimize date range filtering by doing it once
  let startDate: Date | null = null;
  let endDate: Date | null = null;
  
  const periodStats = campaign.statsHistory.reduce((acc, entry) => {
    // Lazy initialize dates only when needed
    if (!startDate || !endDate) {
      startDate = new Date(dateRange.startDate!);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(dateRange.endDate!);
      endDate.setHours(23, 59, 59, 999);
    }
    
    const entryDate = new Date(entry.date);
    entryDate.setHours(12, 0, 0, 0);
    
    if (entryDate >= startDate && entryDate <= endDate) {
      return {
        leads: acc.leads + entry.leads,
        cases: acc.cases + entry.cases,
        revenue: acc.revenue + entry.revenue,
        adSpend: acc.adSpend + (entry.adSpend || 0)
      };
    }
    return acc;
  }, { leads: 0, cases: 0, revenue: 0, adSpend: 0 });
  
  return periodStats;
};

export const getPreviousWeekStats = (campaign: Campaign, dateRange?: DateRange) => {
  if (!dateRange || !dateRange.startDate || !dateRange.endDate) {
    return { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
  }

  // Convert current date range end to Date object
  const currentEnd = new Date(dateRange.endDate);
  
  // Calculate the start of the trailing 7 days period
  const trailingStart = subDays(currentEnd, 6); // This gives us exactly 7 days including the end date
  
  // Calculate the previous 7 days period
  const previousEnd = subDays(trailingStart, 1); // Day before the trailing period starts
  const previousStart = subDays(previousEnd, 6); // 7 days before that

  const previousDateRange = {
    startDate: previousStart.toISOString().split('T')[0],
    endDate: previousEnd.toISOString().split('T')[0]
  };

  return getPeriodStats(campaign, previousDateRange);
};

export const formatCurrency = (value: number): string => {
  // Ensure value is a valid number
  if (typeof value !== 'number' || isNaN(value)) {
    console.warn(`Invalid currency value: ${value}, replacing with 0`);
    value = 0;
  }
  
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export const formatCurrencyCompact = (value: number): string => {
  if (Math.abs(value) >= 1000) {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })}`;
  }
  return formatCurrency(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

export const formatNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(1);
};

export const getPerformanceClass = (roi: number): string => {
  if (roi > 200) return "text-success-DEFAULT font-bold";
  if (roi > 100) return "text-secondary font-bold";
  if (roi > 0) return "text-secondary";
  return "text-error-DEFAULT";
};

export const getTrendDirection = (value: number): "up" | "down" | "neutral" => {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "neutral";
};

export const getPerformanceLabel = (roi: number): string => {
  if (roi > 200) return "Excellent";
  if (roi > 100) return "Good";
  if (roi > 0) return "Positive";
  return "Needs Improvement";
};

export const getPerformanceBgClass = (roi: number): string => {
  if (roi > 200) return "bg-success-muted";
  if (roi > 100) return "bg-secondary/15";
  if (roi > 0) return "bg-secondary/10";
  return "bg-error-muted";
};

export const getRoasClass = (roas: number | undefined): string => {
  if (!roas) return "";
  if (roas > 300) return "text-success-DEFAULT font-bold";
  if (roas > 200) return "text-secondary font-bold";
  if (roas > 0) return "text-secondary";
  return "text-error-DEFAULT";
};

export const getSpendEfficiencyClass = (efficiency: number | undefined): string => {
  if (!efficiency) return "text-muted-foreground";
  if (efficiency >= 85) return "text-success-DEFAULT";
  if (efficiency >= 70) return "text-warning-DEFAULT";
  return "text-error-DEFAULT";
};
