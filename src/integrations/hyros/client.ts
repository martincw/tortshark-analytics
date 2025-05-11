
import { supabase } from '@/integrations/supabase/client';
import { 
  HyrosLeadListParams, 
  HyrosLeadsListResponse, 
  HyrosSyncResult 
} from './types';

export const hyrosApi = {
  // API Key Management
  async connectHyros(apiKey: string) {
    try {
      const { data, error } = await supabase.functions.invoke('hyros-auth', {
        body: { apiKey }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error connecting to HYROS:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to connect to HYROS' 
      };
    }
  },

  async verifyApiKey(apiKey: string) {
    try {
      const { data, error } = await supabase.functions.invoke('hyros-verify', {
        body: { apiKey }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error verifying HYROS API key:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify HYROS API key' 
      };
    }
  },
  
  async getApiCredentials() {
    try {
      const { data, error } = await supabase
        .from('hyros_tokens')
        .select('api_key, account_id, last_synced')
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting HYROS API credentials:', error);
      return null;
    }
  },
  
  // Campaign Management
  async fetchHyrosCampaigns(forceSync = false) {
    try {
      const { data, error } = await supabase.functions.invoke('hyros-fetch-campaigns', {
        body: { forceSync }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching HYROS campaigns:', error);
      throw error;
    }
  },
  
  async getCampaignStats() {
    try {
      const { data, error } = await supabase.functions.invoke('hyros-campaign-stats');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching HYROS campaign stats:', error);
      throw error;
    }
  },
  
  // Campaign Mappings
  async mapCampaign(hyrosCampaignId: string, tsCampaignId: string) {
    try {
      const { data, error } = await supabase
        .from('hyros_to_ts_map')
        .insert({
          hyros_campaign_id: hyrosCampaignId,
          ts_campaign_id: tsCampaignId,
          active: true,
          linked_at: new Date().toISOString()
        })
        .select('*')
        .single();
      
      if (error) throw error;
      
      // Convert to the expected HyrosMapping format
      return {
        id: data.id,
        hyrosCampaignId: data.hyros_campaign_id,
        tsCampaignId: data.ts_campaign_id,
        active: data.active,
        linked_at: data.linked_at,
        unlinked_at: data.unlinked_at
      };
    } catch (error) {
      console.error('Error mapping HYROS campaign:', error);
      throw error;
    }
  },
  
  async unmapCampaign(hyrosCampaignId: string) {
    try {
      const { data, error } = await supabase
        .from('hyros_to_ts_map')
        .update({ 
          active: false,
          unlinked_at: new Date().toISOString()
        })
        .eq('hyros_campaign_id', hyrosCampaignId)
        .eq('active', true)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error unmapping HYROS campaign:', error);
      throw error;
    }
  },
  
  async getCampaignMappings() {
    try {
      const { data, error } = await supabase
        .from('hyros_to_ts_map')
        .select('*');
      
      if (error) throw error;
      
      // Convert the database fields to match the HyrosMapping interface
      return data.map(mapping => ({
        id: mapping.id,
        hyrosCampaignId: mapping.hyros_campaign_id,
        tsCampaignId: mapping.ts_campaign_id,
        active: mapping.active,
        linked_at: mapping.linked_at,
        unlinked_at: mapping.unlinked_at
      }));
    } catch (error) {
      console.error('Error getting HYROS campaign mappings:', error);
      return [];
    }
  },
  
  // Leads Management
  async fetchLeadsForDateRange(params: HyrosLeadListParams): Promise<HyrosLeadsListResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('hyros-leads', {
        body: params
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching leads:', error);
      return {
        success: false,
        leads: [],
        error: error instanceof Error ? error.message : 'Failed to fetch leads'
      };
    }
  },
  
  async getLeadsList(params: {
    page: number;
    pageSize: number;
    startDate: string;
    endDate: string;
    tsCampaignId?: string;
    searchTerm?: string;
  }) {
    try {
      // This is a simplified version that would get leads from the database
      // In a real implementation, this might query a local database of stored leads
      const { data, error } = await supabase
        .from('hyros_stats_raw')
        .select('*')
        .gte('date', params.startDate)
        .lte('date', params.endDate)
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      return {
        success: true,
        leads: data || [],
        total: data?.length || 0
      };
    } catch (error) {
      console.error('Error getting leads list:', error);
      return {
        success: false,
        leads: [],
        total: 0,
        error: error instanceof Error ? error.message : 'Failed to get leads'
      };
    }
  },
  
  // Sync Operations
  async syncLeads() {
    try {
      const { data, error } = await supabase.functions.invoke('hyros-sync');
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error syncing HYROS leads:', error);
      throw error;
    }
  },
  
  async fetchYesterdayStats(): Promise<HyrosSyncResult> {
    try {
      const { data, error } = await supabase.functions.invoke('hyros-sync', {
        body: { fetchYesterdayOnly: true }
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching yesterday stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch yesterday stats'
      };
    }
  }
};
