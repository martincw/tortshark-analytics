export interface Campaign {
  id: string;
  name: string;
  userId: string;
  manualStats: ManualStats;
  statsHistory: StatHistoryEntry[];
  createdAt: string;
  updatedAt: string;
  buyerStack: BuyerStackEntry[];
}

export interface ManualStats {
  leads: number;
  cases: number;
  revenue: number;
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
  url2?: string;
  contact_name?: string;
  email?: string;
  platform?: string;
  notes?: string;
  payout_terms?: string;
  created_at?: string;
  updated_at?: string;
  inbound_did?: string;
  transfer_did?: string;
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
  campaigns?: Campaign;
}
