export interface CaseBuyer {
  id: string;
  name: string;
  url?: string;
  contact_name?: string;
  email?: string;
  platform?: string;
  notes?: string;
  payout_terms?: string;
  created_at?: string;
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  adSpend: number;
  ctr: number;
  cpc: number;
  cpl: number;
  date: string;
}

export interface AccountConnection {
  id: string;
  name: string;
  platform: string;
  customerId?: string;
  isConnected: boolean;
  lastSynced?: string;
  credentials?: Record<string, any>;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface CampaignMetrics {
  leads: number;
  cases: number;
  retainers: number;
  revenue: number;
  adSpend: number;
  profit: number;
  roi: number;
  roas: number;
  cpa: number;
  cpl: number;
  costPerLead: number;
  earningsPerLead: number;
  revenuePerCase: number;
  weekOverWeekChange: number;
  previousWeekProfit: number;
}

export interface CampaignStat {
  id: string;  // Changed from optional to required based on usage
  date: string;
  leads: number;
  cases: number;
  retainers: number;
  adSpend?: number;
  revenue?: number;
  createdAt?: string;  // Add createdAt to match usage in code
}

export interface CampaignTargets {
  monthlyRetainers: number;
  casePayoutAmount: number;
  targetProfit: number;
  targetROAS: number;
  monthlyIncome: number;
  monthlySpend: number;
}

export interface CampaignManualStats {
  leads: number;
  cases: number;
  retainers: number;
  revenue: number;
  date?: string;
}

export interface Campaign {
  id: string;
  name: string;
  accountId: string;
  accountName: string;
  platform: string;
  buyers?: CaseBuyer[];
  targets: CampaignTargets;
  stats: {
    date: string;
    adSpend: number;
    impressions?: number;
    clicks?: number;
    cpc?: number;
  };
  manualStats: CampaignManualStats;
  statsHistory: CampaignStat[];
}

export interface BuyerTortCoverage {
  id: string;
  buyer_id: string;
  campaign_id: string;
  payout_amount: number;
  campaigns?: {
    id: string;
    name: string;
  };
}

export interface BuyerStackItem {
  id: string;
  campaign_id: string;
  buyer_id: string;
  stack_order: number;
  payout_amount: number;
  buyers?: CaseBuyer;
}

export interface TrendData {
  date: string;
  rawDate?: string;
  revenue: number;
  adSpend: number;
  profit: number;
  roi: number;
  leads: number;
  cases: number;
  conversionRate: number;
  costPerLead: number;
  costPerCase: number;
}

export interface GoalProgress {
  metric: string;
  target: number;
  current: number;
  percentage: number;
  percentComplete: number;
  remaining: number;
  daysRemaining: number;
  dailyGoal: number;
  isOnTrack: boolean;
  willReachTarget: boolean;
  projectedValue: number;
  gapToTarget: number;
}

export interface ProjectionParams {
  targetProfit: number;
  growthRate: number;
  conversionRate: number;
  costPerLead: number;
  revenuePerCase: number;
  adSpendGrowth: number;
  conversionRateGrowth: number;
  revenuePerCaseGrowth: number;
}

export interface ForecastedMetrics {
  date?: string;
  revenue: number;
  adSpend: number;
  profit: number;
  roi: number;
  leads: number;
  cases: number;
  conversionRate: number;
}

export interface ForecastModelOption {
  name: string;
  label: string;
  description: string;
}

export interface ForecastPeriodOption {
  value: string;
  label: string;
}

export type ForecastingModel = "linear" | "exponential" | "average" | "seasonality" | ForecastModelOption;
export type ForecastingPeriod = "7days" | "30days" | "90days" | "180days" | "1year" | ForecastPeriodOption;
