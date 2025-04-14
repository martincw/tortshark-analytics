
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
  
  // Fix: Calculate ROI as return percentage beyond 100%
  // Example: If you spent $100 and got back $300, that's a 200% ROI
  const roi = stats.adSpend > 0 
    ? (manualStats.revenue / stats.adSpend) * 100 
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
