
export interface HyrosCampaign {
  id: string;
  hyrosCampaignId: string;
  name: string;
  platform: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface HyrosMapping {
  id: string;
  hyrosCampaignId: string;
  tsCampaignId: string;
  active: boolean;
  linked_at: string;
  unlinked_at?: string;
}

export interface HyrosStatsRaw {
  id: string;
  hyros_campaign_id: string;
  ts_campaign_id?: string;
  date: string;
  leads: number;
  sales?: number;
  ad_spend: number;
  revenue?: number;
  json_payload?: any;
}

export interface HyrosSyncResult {
  success: boolean;
  campaigns_processed?: number;
  total_leads?: number;
  date_fetched?: string;
  last_synced?: string;
  error?: string;
  debug_info?: any;
}

export interface HyrosAuthResult {
  success: boolean;
  error?: string;
  accountId?: string;
  statusCode?: number;
}

export interface HyrosLeadListParams {
  fromDate: string;
  toDate: string;
  pageSize?: number;
  pageId?: string;
  emails?: string[];
}

export interface HyrosLead {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  creationDate?: string;
  phoneNumbers?: string[];
  firstSource?: any;
  lastSource?: any;
  tags?: string[];
  [key: string]: any;
}

export interface HyrosLeadsListResponse {
  success: boolean;
  leads: HyrosLead[];
  nextPageId?: string;
  total?: number;
  page?: number;
  size?: number;
}

export interface HyrosLeadResponse {
  success: boolean;
  lead?: HyrosLead;
  error?: string;
}

export interface HyrosCampaignsResponse {
  success: boolean;
  campaigns: HyrosCampaign[];
  importCount?: number;
  error?: string;
  debugInfo?: any;
  dateRange?: {
    from: string;
    to: string;
  };
  apiEndpoint?: string;
}

export interface HyrosToken {
  id: string;
  user_id: string;
  api_key: string;
  account_id?: string;
  last_synced?: string;
  created_at?: string;
  updated_at?: string;
}
