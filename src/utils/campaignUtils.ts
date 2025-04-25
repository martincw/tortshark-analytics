import { Campaign, CampaignMetrics, DateRange } from "../types/campaign";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";

export const calculateMetrics = (campaign: Campaign, dateRange?: DateRange): CampaignMetrics => {
  console.log('Calculating metrics for campaign:', campaign.id);
  console.log('Using date range:', dateRange);

  // Get filtered stats based on date range
  const periodStats = getPeriodStats(campaign, dateRange);
  
  console.log('Period stats:', periodStats);
  
  // Calculate metrics using period stats
  const costPerLead = periodStats.leads > 0 ? periodStats.adSpend / periodStats.leads : 0;
  const cpa = periodStats.cases > 0 ? periodStats.adSpend / periodStats.cases : 0;
  const profit = periodStats.revenue - periodStats.adSpend;
  const roi = periodStats.adSpend > 0 ? (profit / periodStats.adSpend) * 100 : 0;
  const earningsPerLead = periodStats.leads > 0 ? profit / periodStats.leads : 0;

  const metrics = {
    revenue: periodStats.revenue,
    leads: periodStats.leads,
    cases: periodStats.cases,
    adSpend: periodStats.adSpend,
    costPerLead,
    cpa,
    profit,
    roi,
    earningsPerLead
  };

  console.log('Final calculated metrics:', metrics);
  return metrics;
};

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

export const formatCurrency = (value: number): string => {
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
