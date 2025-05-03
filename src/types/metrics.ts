
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
  date: string;
}

export interface TrendData {
  date: string;
  value: number;
  previousValue?: number;
  change?: number;
}
