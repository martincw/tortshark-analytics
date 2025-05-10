
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
  platform?: string; // Added platform field
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
  statusCode?: number;
}

// New response type for campaigns fetch
export interface HyrosCampaignsResponse {
  success: boolean;
  campaigns?: HyrosCampaign[];
  error?: string;
  importCount?: number;
  apiEndpoint?: string;
  dateRange?: {
    from: string;
    to: string;
  };
  triedEndpoints?: string[];
  errors?: any[];
  syncError?: string;
  debugInfo?: any;
  documentation?: string;
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
  campaign_id?: string;
  campaignId?: string;
  tags?: string[];
  ips?: string[];
  phoneNumbers?: string[];
  purchase_amount?: number;
  purchaseAmount?: number;
  is_purchase?: boolean;
  isPurchase?: boolean;
  is_sale?: boolean;
  isSale?: boolean;
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
  campaignId?: string; // Campaign ID parameter
}

export interface HyrosLeadsListResponse {
  leads: HyrosLead[];
  nextPageId?: string;
  total: number;
}
