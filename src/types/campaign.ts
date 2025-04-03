
export interface Campaign {
  id: string;
  name: string;
  platform: "google" | "youtube";
  accountId: string;
  accountName: string;
  stats: CampaignStats;
  manualStats: ManualStats;
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
  platform: "google" | "youtube";
  isConnected: boolean;
  lastSynced: string | null; // ISO date string
}
