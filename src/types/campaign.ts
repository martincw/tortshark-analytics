
export interface Campaign {
  id: string;
  name: string;
  platform: "google";
  accountId: string;
  accountName: string;
  stats: CampaignStats;
  manualStats: ManualStats;
  targets: CampaignTargets;
}

export interface CampaignStats {
  adSpend: number;
  impressions: number;
  clicks: number;
  cpc: number; // Cost per click
  date: string; // ISO date string
}

export interface ManualStats {
  leads: number;
  cases: number;
  retainers: number;
  revenue: number;
  date: string; // ISO date string
}

export interface CampaignTargets {
  monthlyRetainers: number;
  casePayoutAmount: number;
  monthlyIncome: number;
  monthlySpend: number;
  targetROAS: number;
  targetProfit: number;
}

export interface CampaignMetrics {
  costPerLead: number;
  cpa: number; // Cost per acquisition (case)
  profit: number;
  roi: number; // Return on investment percentage
}

export interface DateRange {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

export interface AccountConnection {
  id: string;
  name: string;
  platform: "google";
  isConnected: boolean;
  lastSynced: string | null; // ISO date string
}
