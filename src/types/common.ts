
export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface LeadProsperMappingRecord {
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

export interface LeadProsperLeadRecord {
  id: string;
  lp_campaign_id: number;
  ts_campaign_id: string;
  status: string;
  cost: number;
  revenue: number;
  lead_date_ms: number;
  json_payload?: any; // Changed from Record<string, any> to any to accommodate both object and string formats
  created_at: string;
  updated_at: string;
}
