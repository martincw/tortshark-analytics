
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
  debug_info?: any[];
}

export interface HyrosAuthResult {
  success: boolean;
  error?: string;
  apiKey?: string;
  accountId?: string;
}

// HYROS API Lead Response Types
export interface HyrosLeadResponse {
  result: HyrosLead[];
  nextPageId?: string;
  request_id: string;
}

export interface HyrosLead {
  email: string;
  id: string;
  creationDate: string;
  tags?: string[];
  ips?: string[];
  phoneNumbers?: string[];
  provider?: {
    id: string;
    integration?: {
      name: string;
      type: string;
      id: string;
    };
  };
}

export interface HyrosLeadListParams {
  ids?: string[];
  emails?: string[];
  fromDate?: string;
  toDate?: string;
  pageSize?: number;
  pageId?: string;
}

export interface HyrosLeadsListResponse {
  leads: HyrosLead[];
  nextPageId?: string;
  total: number;
}
