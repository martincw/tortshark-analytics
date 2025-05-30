
import { GoogleAdsMetrics, GoogleAdsMetricsResponse } from './metrics';
import { DateRange } from './common';

export interface Campaign {
  id: string;
  name: string;
  userId: string;
  manualStats: ManualStats;
  statsHistory: StatHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  buyerStack: import('./buyer').BuyerStackEntry[];
  targets: CampaignTargets;
  platform: string;
  accountId?: string;
  accountName?: string;
  stats?: CampaignStats;
  is_active?: boolean;
  _metrics?: import('./metrics').CampaignMetrics; // Cache for pre-calculated metrics
  googleAdsMetrics?: GoogleAdsMetricsResponse[]; // Added Google Ads metrics
}

export interface ManualStats {
  leads: number;
  cases: number;
  revenue: number;
  retainers?: number;
  date?: string;
}

export interface StatHistoryEntry {
  id: string;
  campaignId: string;
  date: string;
  leads: number;
  cases: number;
  revenue: number;
  adSpend?: number;
  createdAt?: string;
  // updatedAt property removed as it doesn't exist in the database
}

export interface CampaignBasic {
  id: string;
  name: string;
}

export interface CampaignTargets {
  monthlySpend: number;
  casePayoutAmount: number;
  monthlyRetainers: number;
  monthlyProfit: number;
  roas: number;
  monthlyRevenue: number;
  monthlyIncome: number;
  targetProfit: number;
  targetROAS: number;
}

export interface CampaignStats {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
  adSpend: number;
  averageCpc: number;
  date?: string;
}

export interface AccountConnection {
  id: string;
  name: string;
  platform: string;
  customerId?: string;
  lastSynced?: string;
  isConnected: boolean;
  credentials?: Record<string, any>; // Added credentials property to fix TypeScript error
}

// Re-export the types from metrics.ts and common.ts for backward compatibility
export type { GoogleAdsMetrics, GoogleAdsMetricsResponse, DateRange };
