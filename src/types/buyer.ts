
import { CampaignBasic } from "./campaign-base";

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
}

export interface BuyerStackEntry {
  id: string;
  campaignId: string;
  buyerId: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface BuyerTortCoverage {
  id: string;
  buyer_id: string;
  campaign_id: string;
  payout_amount: number;
  did?: string;
  inbound_did?: string;
  transfer_did?: string;
  intake_center?: string;
  campaign_key?: string;
  spec_sheet_url?: string;
  notes?: string;
  label?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  campaigns?: CampaignBasic;
}

export interface BuyerStackItem {
  id: string;
  priority?: number;
  buyer?: CaseBuyer;
  campaign_id?: string;
  buyer_id?: string;
  stack_order?: number;
  payout_amount?: number;
  buyers?: CaseBuyer;
}
