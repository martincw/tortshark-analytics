
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
  
  const periodStats = campaign.statsHistory
    .filter(entry => isDateInRange(entry.date, dateRange.startDate, dateRange.endDate))
    .reduce((acc, entry) => {
      return {
        leads: acc.leads + entry.leads,
        cases: acc.cases + entry.cases,
        revenue: acc.revenue + entry.revenue,
        adSpend: acc.adSpend + (entry.adSpend || 0)
      };
    }, { leads: 0, cases: 0, revenue: 0, adSpend: 0 });
  
  console.log('Filtered period stats:', periodStats);
  return periodStats;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// Add the missing getPerformanceBgClass function
export const getPerformanceBgClass = (roi: number): string => {
  if (roi >= 300) return "bg-success-DEFAULT/10";
  if (roi >= 200) return "bg-success-DEFAULT/5";
  if (roi >= 100) return "bg-secondary/10";
  if (roi > 0) return "bg-secondary/5";
  return "bg-error-DEFAULT/10";
};
