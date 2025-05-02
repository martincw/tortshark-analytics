
export interface Campaign {
  id: string;
  name: string;
  userId: string;
  manualStats: ManualStats;
  statsHistory: StatHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  buyerStack: BuyerStackEntry[];
  // Add missing properties
  targets: CampaignTargets;
  platform: string;
  accountId?: string;
  stats?: CampaignStats;
}

export interface ManualStats {
  leads: number;
  cases: number;
  revenue: number;
  retainers?: number; // Add missing property
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
  updatedAt?: string;
}

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

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface BuyerStackEntry {
  id: string;
  campaignId: string;
  buyerId: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CaseBuyer {
  id: string;
  name: string;
  user_id: string;
  url?: string;
  url2?: string; // Add missing property
  contact_name?: string;
  email?: string;
  platform?: string;
  notes?: string;
  payout_terms?: string;
  created_at?: string;
  updated_at?: string;
  inbound_did?: string; // Add missing property
  transfer_did?: string; // Add missing property
}

export interface BuyerTortCoverage {
  id: string;
  buyer_id: string;
  campaign_id: string;
  payout_amount: number;
  did?: string;
  campaign_key?: string;
  spec_sheet_url?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  campaigns?: CampaignBasic; // Change to CampaignBasic to fix type errors
}

// Add a simpler campaign type for the campaign reference in BuyerTortCoverage
export interface CampaignBasic {
  id: string;
  name: string;
}

// Add missing interfaces
export interface CampaignTargets {
  monthlySpend: number;
  casePayoutAmount: number;
  monthlyRetainers: number;
  monthlyProfit: number;
  roas: number;
  monthlyRevenue: number;
}

export interface AccountConnection {
  id: string;
  name: string;
  platform: string;
  customerId?: string;
  lastSynced?: string;
  isConnected: boolean;
}

export interface BuyerStackItem {
  id: string;
  priority: number;
  buyer: CaseBuyer;
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  averageCpc: number;
  ctr: number;
  conversionRate: number;
}

export interface TrendData {
  date: string;
  value: number;
  previousValue?: number;
  change?: number;
}

export interface ForecastedMetrics {
  revenue: number;
  adSpend: number;
  profit: number;
  roi: number;
  leads: number;
  cases: number;
  cpa: number;
  costPerLead: number;
}

export interface ProjectionParams {
  dailyBudget: number;
  leadConversionRate: number;
  averageRevenuePerCase: number;
  costPerLead: number;
  forecastDuration: number;
}

export interface GoalProgress {
  current: number;
  target: number;
  percentage: number;
}

export interface CampaignStats {
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
  ctr: number;
  cpc: number;
  conversionRate: number;
}
