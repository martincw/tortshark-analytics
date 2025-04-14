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
  
  // Calculate ROAS as a multiplier (e.g., 2.5x)
  const roas = stats.adSpend > 0 
    ? manualStats.revenue / stats.adSpend
    : 0;
    
  // For backward compatibility, keeping the roi calculation
  const roi = stats.adSpend > 0 
    ? (manualStats.revenue / stats.adSpend) * 100 
    : 0;

  return {
    costPerLead,
    cpa,
    profit,
    roi,
    roas
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

// Format ROAS as multiplier (e.g. 2.5x)
export const formatROAS = (value: number): string => {
  return `${value.toFixed(1)}x`;
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
export const getPerformanceClass = (roas: number): string => {
  if (roas > 2) return "text-success-DEFAULT font-bold";
  if (roas > 1) return "text-secondary font-bold";
  if (roas > 0) return "text-secondary";
  return "text-error-DEFAULT";
};

// Get trend direction based on metrics
export const getTrendDirection = (value: number): "up" | "down" | "neutral" => {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "neutral";
};

// Get performance label based on metrics
export const getPerformanceLabel = (roas: number): string => {
  if (roas > 2) return "Excellent";
  if (roas > 1) return "Good";
  if (roas > 0) return "Positive";
  return "Needs Improvement";
};

// Get background class based on performance
export const getPerformanceBgClass = (roas: number): string => {
  if (roas > 2) return "bg-success-muted";
  if (roas > 1) return "bg-secondary/15";
  if (roas > 0) return "bg-secondary/10";
  return "bg-error-muted";
};
