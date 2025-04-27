
export interface CaseBuyer {
  id: string;
  name: string;
  url?: string;  // Make url optional to maintain backwards compatibility
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
  cpa: number;
  cpl: number;
  costPerLead: number;  // Added missing property
  earningsPerLead: number;  // Added missing property
  weekOverWeekChange: number;  // Added missing property
  previousWeekProfit: number;  // Added missing property
}

export interface CampaignStat {
  date: string;
  leads: number;
  cases: number;
  retainers: number;
  adSpend?: number;
  revenue?: number;
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
  date?: string;  // Added missing property
}

export interface Campaign {
  id: string;
  name: string;
  accountId: string;
  accountName: string;  // Added missing property
  platform: string;
  buyers?: CaseBuyer[];  // Array of buyers for this campaign
  targets: CampaignTargets;
  stats: {
    date: string;
    adSpend: number;
    impressions?: number;  // Added missing property
    clicks?: number;  // Added missing property
    cpc?: number;  // Added missing property
  };
  manualStats: CampaignManualStats;
  statsHistory: CampaignStat[];
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
  metric: string;  // Added missing property
  target: number;
  current: number;
  percentage: number;
  percentComplete: number;  // Added missing property
  remaining: number;
  daysRemaining: number;
  dailyGoal: number;
  isOnTrack: boolean;
  willReachTarget: boolean;  // Added missing property
  projectedValue: number;  // Added missing property
  gapToTarget: number;  // Added missing property
}

export interface ProjectionParams {
  targetProfit: number;
  growthRate: number;
  conversionRate: number;
  costPerLead: number;
  revenuePerCase: number;
  adSpendGrowth: number;  // Added missing property
  conversionRateGrowth: number;  // Added missing property
  revenuePerCaseGrowth: number;  // Added missing property
}

export interface ForecastedMetrics {
  date?: string;  // Added missing property as optional
  revenue: number;
  adSpend: number;
  profit: number;
  roi: number;
  leads: number;
  cases: number;
  conversionRate: number;
}

export type ForecastingModel = 'linear' | 'exponential' | 'average' | 'seasonality';
export type ForecastingPeriod = '7days' | '30days' | '90days' | '180days' | '1year';
