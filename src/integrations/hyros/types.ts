
// HYROS API types
export interface HyrosToken {
  id: string;
  apiKey: string;
  accountId?: string;
  userId: string;
  lastSynced?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HyrosCampaign {
  id: string;
  hyrosCampaignId: string;
  name: string;
  status?: string;
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HyrosMapping {
  id: string;
  hyrosCampaignId: string;
  tsCampaignId: string;
  active: boolean;
  linkedAt?: string;
  unlinkedAt?: string;
}

export interface HyrosStatsRaw {
  id: string;
  hyrosCampaignId: string;
  tsCampaignId?: string;
  date: string;
  adSpend?: number;
  clicks?: number;
  impressions?: number;
  leads?: number;
  sales?: number;
  revenue?: number;
  jsonPayload?: any;
  createdAt?: string;
}

export interface HyrosSyncResult {
  success: boolean;
  error?: string;
  campaigns_processed?: number;
  total_leads?: number;
  date_fetched?: string;
  last_synced?: string;
}

export interface HyrosAuthResult {
  success: boolean;
  error?: string;
  apiKey?: string;
  accountId?: string;
}
