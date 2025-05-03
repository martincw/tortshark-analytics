
export interface ForecastedMetrics {
  revenue: number;
  adSpend: number;
  profit: number;
  roi: number;
  leads: number;
  cases: number;
  cpa: number;
  costPerLead: number;
  date?: string;
  conversionRate?: number;
}

export interface ProjectionParams {
  dailyBudget: number;
  leadConversionRate: number;
  averageRevenuePerCase: number;
  costPerLead: number;
  forecastDuration: number;
  adSpendGrowth: number;
  conversionRateGrowth: number;
  revenuePerCaseGrowth: number;
  targetProfit?: number;
  growthRate?: number;
  conversionRate?: number;
  revenuePerCase?: number;
}

export interface GoalProgress {
  current: number;
  target: number;
  percentage: number;
  metric: string;
  percentComplete: number;
  remaining: number;
  daysRemaining: number;
  dailyGoal: number;
  projectedValue: number;
  isOnTrack: boolean;
  willReachTarget: boolean;
  gapToTarget: number;
}

export type ForecastingModel = 'linear' | 'weighted' | 'exponential';
export type ForecastingPeriod = 'week' | 'month' | 'quarter';

export interface ForecastModelOption {
  name: string;
  label: string;
  description: string;
}

export interface ForecastPeriodOption {
  value: string;
  label: string;
}
