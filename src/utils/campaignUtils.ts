
import { Campaign, CampaignMetrics } from "../types/campaign";

// Calculate metrics for a campaign
export const calculateMetrics = (campaign: Campaign): CampaignMetrics => {
  const { stats, manualStats } = campaign;
  
  // Avoid division by zero
  const costPerLead = manualStats.leads > 0 
    ? stats.adSpend / manualStats.leads 
    : 0;
  
  const cpa = manualStats.cases > 0 
    ? stats.adSpend / manualStats.cases 
    : 0;
  
  const profit = manualStats.revenue - stats.adSpend;
  
  const roi = stats.adSpend > 0 
    ? (profit / stats.adSpend) * 100 
    : 0;

  return {
    costPerLead,
    cpa,
    profit,
    roi
  };
};

// Format currency with $ and commas
export const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
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

// Get performance label based on metrics
export const getPerformanceLabel = (roi: number): string => {
  if (roi > 200) return "Excellent";
  if (roi > 100) return "Good";
  if (roi > 0) return "Positive";
  return "Needs Improvement";
};
