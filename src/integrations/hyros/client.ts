
import { supabase } from '@/integrations/supabase/client';

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
      return data;
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
      return data;
    } catch (error) {
      console.error('Error getting HYROS campaign mappings:', error);
      return [];
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
  }
};
