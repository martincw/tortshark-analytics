
import { supabase } from '@/integrations/supabase/client';
import { SUPABASE_PROJECT_URL } from '@/integrations/supabase/client';
import type { 
  HyrosToken, 
  HyrosCampaign, 
  HyrosMapping, 
  HyrosStatsRaw, 
  HyrosSyncResult, 
  HyrosAuthResult,
  HyrosLeadResponse,
  HyrosLeadsListResponse,
  HyrosLeadListParams,
  HyrosLead
} from './types';

export const hyrosApi = {
  // API Key Management
  async connectHyros(apiKey: string): Promise<HyrosAuthResult> {
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/hyros-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
        },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();
      console.log("HYROS connect response:", data);
      return data;
    } catch (error) {
      console.error('Error connecting to HYROS:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to HYROS' 
      };
    }
  },

  async verifyApiKey(apiKey: string): Promise<HyrosAuthResult> {
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/hyros-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
        },
        body: JSON.stringify({ apiKey }),
      });

      return await response.json();
    } catch (error) {
      console.error('Error verifying HYROS API key:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify HYROS API key' 
      };
    }
  },

  async getApiCredentials(): Promise<HyrosToken | null> {
    try {
      const { data, error } = await supabase
        .from('hyros_tokens')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching HYROS credentials:', error);
        return null;
      }

      return {
        id: data.id,
        apiKey: data.api_key,
        accountId: data.account_id,
        userId: data.user_id,
        lastSynced: data.last_synced,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error fetching HYROS credentials:', error);
      return null;
    }
  },

  // Campaign Management
  async fetchHyrosCampaigns(): Promise<HyrosCampaign[]> {
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/hyros-campaigns`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
        },
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch HYROS campaigns');
      }

      return result.campaigns || [];
    } catch (error) {
      console.error('Error fetching HYROS campaigns:', error);
      throw error;
    }
  },

  async getCampaignMappings(): Promise<HyrosMapping[]> {
    try {
      const { data, error } = await supabase
        .from('hyros_to_ts_map')
        .select('*');

      if (error) {
        throw error;
      }

      return data.map(item => ({
        id: item.id,
        hyrosCampaignId: item.hyros_campaign_id,
        tsCampaignId: item.ts_campaign_id,
        active: item.active,
        linkedAt: item.linked_at,
        unlinkedAt: item.unlinked_at
      }));
    } catch (error) {
      console.error('Error fetching HYROS campaign mappings:', error);
      throw error;
    }
  },

  async mapCampaign(hyrosCampaignId: string, tsCampaignId: string): Promise<HyrosMapping> {
    try {
      const { data, error } = await supabase
        .from('hyros_to_ts_map')
        .insert({
          hyros_campaign_id: hyrosCampaignId,
          ts_campaign_id: tsCampaignId,
          active: true,
          linked_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        hyrosCampaignId: data.hyros_campaign_id,
        tsCampaignId: data.ts_campaign_id,
        active: data.active,
        linkedAt: data.linked_at,
        unlinkedAt: data.unlinked_at
      };
    } catch (error) {
      console.error('Error mapping HYROS campaign:', error);
      throw error;
    }
  },

  async unmapCampaign(mappingId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('hyros_to_ts_map')
        .update({
          active: false,
          unlinked_at: new Date().toISOString()
        })
        .eq('id', mappingId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error unmapping HYROS campaign:', error);
      throw error;
    }
  },

  // Stats Fetching
  async fetchYesterdayStats(): Promise<HyrosSyncResult> {
    try {
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/hyros-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
        },
      });

      return await response.json();
    } catch (error) {
      console.error('Error fetching yesterday stats:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch yesterday stats' 
      };
    }
  },

  async fetchLeadsForDateRange(params: HyrosLeadListParams): Promise<HyrosLeadsListResponse> {
    try {
      const { fromDate, toDate, pageSize, pageId, emails } = params;
      
      const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/hyros-fetch-stats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
        },
        body: JSON.stringify({ 
          startDate: fromDate, 
          endDate: toDate,
          pageSize: pageSize || 100,
          pageId,
          emails
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch leads for date range');
      }

      return {
        leads: result.leads || [],
        nextPageId: result.nextPageId,
        total: result.total || 0
      };
    } catch (error) {
      console.error('Error fetching leads for date range:', error);
      throw error;
    }
  },

  async getStatsForDateRange(startDate: string, endDate: string): Promise<HyrosStatsRaw[]> {
    try {
      const { data, error } = await supabase
        .from('hyros_stats_raw')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) {
        throw error;
      }

      return data.map(item => ({
        id: item.id,
        hyrosCampaignId: item.hyros_campaign_id,
        tsCampaignId: item.ts_campaign_id,
        date: item.date,
        adSpend: item.ad_spend,
        clicks: item.clicks,
        impressions: item.impressions,
        leads: item.leads,
        sales: item.sales,
        revenue: item.revenue,
        jsonPayload: item.json_payload,
        createdAt: item.created_at
      }));
    } catch (error) {
      console.error('Error fetching stats for date range:', error);
      throw error;
    }
  },

  async getLeadsList({
    page = 1,
    pageSize = 20,
    startDate,
    endDate,
    hyrosCampaignId,
    tsCampaignId,
    status,
    searchTerm
  }: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    hyrosCampaignId?: string;
    tsCampaignId?: string;
    status?: string;
    searchTerm?: string;
  }): Promise<{ leads: HyrosStatsRaw[]; total: number }> {
    try {
      // Build the query
      let query = supabase
        .from('hyros_stats_raw')
        .select('*', { count: 'exact' });

      // Apply filters
      if (startDate) {
        query = query.gte('date', startDate);
      }
      if (endDate) {
        query = query.lte('date', endDate);
      }
      if (hyrosCampaignId) {
        query = query.eq('hyros_campaign_id', hyrosCampaignId);
      }
      if (tsCampaignId) {
        query = query.eq('ts_campaign_id', tsCampaignId);
      }
      
      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to).order('date', { ascending: false });

      // Execute the query
      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      // Transform the data
      const leads = data.map(item => ({
        id: item.id,
        hyrosCampaignId: item.hyros_campaign_id,
        tsCampaignId: item.ts_campaign_id,
        date: item.date,
        adSpend: item.ad_spend,
        clicks: item.clicks,
        impressions: item.impressions,
        leads: item.leads,
        sales: item.sales,
        revenue: item.revenue,
        jsonPayload: item.json_payload,
        createdAt: item.created_at
      }));

      return {
        leads,
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching leads list:', error);
      throw error;
    }
  }
};
