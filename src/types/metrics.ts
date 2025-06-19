
export interface CampaignMetrics {
  revenue: number;
  leads: number;
  cases: number;
  retainers: number;
  adSpend: number;
  costPerLead: number;
  cpa: number;
  cpl: number;
  profit: number;
  roi: number;
  roas: number;
  earningsPerLead: number;
  revenuePerCase: number;
  previousWeekProfit: number;
  weekOverWeekChange: number;
  // Enhanced optimization metrics
  optimalDailySpend?: number;
  currentEfficiency?: number;
  spendConfidenceScore?: number;
  spendRecommendation?: string;
  projectedLeadIncrease?: number;
  analysisType?: 'advanced' | 'basic' | 'gathering' | 'insufficient_variation' | 'low_confidence';
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  averageCpc: number;
  ctr: number;
  conversionRate: number;
  adSpend: number; 
  date?: string;
}

export interface GoogleAdsMetricsResponse {
  impressions: number;
  clicks: number;
  adSpend: number; 
  ctr: number;
  cpc: number;
  cpl?: number;
  date: string;
  conversions?: number;
}

export interface TrendData {
  date: string;
  value: number;
  previousValue?: number;
  change?: number;
}
