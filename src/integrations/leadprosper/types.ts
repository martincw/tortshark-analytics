
export interface LeadProsperLead {
  id: string;
  campaign_id: number;
  status: string;
  cost: number;
  revenue: number;
  created_at: number;
  [key: string]: any;
}

export interface LeadProsperCampaign {
  id: number;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface LeadProsperConnection {
  id: string;
  name: string;
  platform: 'leadprosper';
  isConnected: boolean;
  lastSynced: string | null;
  apiKey: string;
  credentials: {
    apiKey: string;
    [key: string]: any;
  };
}

export interface LeadProsperCredentials {
  apiKey?: string;
  isConnected: boolean;
  error?: string;
  fromCache?: boolean;
  credentials?: {
    id: string;
    name: string;
    is_connected: boolean;
    last_synced: string | null;
    credentials: {
      apiKey: string;
      [key: string]: any;
    } | string;
  };
}

export interface LeadProsperMapping {
  id: string;
  ts_campaign_id: string;
  lp_campaign_id: string;
  active: boolean;
  linked_at: string;
  unlinked_at: string | null;
  lp_campaign?: {
    id: string;
    lp_campaign_id: number;
    name: string;
    status: string;
  };
}

export interface DailyLeadMetrics {
  id: string;
  ts_campaign_id: string;
  date: string;
  lead_count: number;
  accepted: number;
  duplicated: number;
  failed: number;
  cost: number;
  revenue: number;
  created_at: string;
  updated_at: string;
}

// New interface for the Lead Prosper sync result
export interface LeadProsperSyncResult {
  success: boolean;
  total_leads: number;
  campaigns_processed: number;
  last_synced?: string;
  results?: any[];
  error?: string;
  endpoint_used?: string;
  timezone_error?: boolean;
  used_stats_fallback?: boolean;
}
