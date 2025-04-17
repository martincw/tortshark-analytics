
export interface Campaign {
  id: string;
  name: string;
  platform: "google" | "facebook" | "linkedin"; // Update to match available platforms
  accountId: string;
  accountName: string;
  stats: CampaignStats;
  manualStats: ManualStats;
  statsHistory: StatHistoryEntry[];
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

export interface StatHistoryEntry {
  id: string;
  date: string; // ISO date string
  leads: number;
  cases: number;
  retainers: number;
  revenue: number;
  adSpend?: number; // Added optional adSpend
  createdAt: string; // ISO date string of when this entry was added
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
  earningsPerLead: number; // Added earningsPerLead metric
}

export interface DateRange {
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

export interface AccountConnection {
  id: string;
  name: string;
  platform: "google" | "facebook" | "linkedin";
  isConnected: boolean;
  lastSynced?: string;
  customerId?: string;
  credentials?: {
    customerId?: string;
    developerToken?: string;
    accessToken?: string;
  } | Record<string, any>; // Update to allow any object structure
}

export interface GoogleAdsMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpl: number; // Cost per lead
  adSpend: number;
  date: string;
}

export interface CaseBuyer {
  id: string;
  name: string;
  created_at?: string;
}

export interface CaseAttribution {
  id: string;
  campaign_id: string;
  buyer_id: string;
  case_count: number;
  price_per_case: number;
  date: string;
  created_at?: string;
}
