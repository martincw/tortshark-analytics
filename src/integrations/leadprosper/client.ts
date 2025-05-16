
import { supabase } from "@/integrations/supabase/client";
import { 
  LeadProsperCredentials, 
  LeadProsperCampaign, 
  LeadProsperMapping,
  LeadProsperSyncResult,
  LeadProsperLeadProcessingResult
} from "./types";

// Cache key for storing the API key in localStorage
const LP_API_KEY_CACHE = 'lp_api_key';

// LeadProsper API client
export const leadProsperApi = {
  /**
   * Check if a Lead Prosper connection exists
   */
  async checkConnection(forceRefresh = false): Promise<LeadProsperCredentials> {
    try {
      // If forceRefresh is true, skip the cache
      if (!forceRefresh) {
        // Try to get API key from cache first for faster UI response
        const cachedApiKey = this.getCachedApiKey();
        if (cachedApiKey) {
          return {
            isConnected: true,
            apiKey: cachedApiKey,
            fromCache: true
          };
        }
      }

      // Get connection from database
      const { data, error } = await supabase
        .from('account_connections')
        .select('*')
        .eq('platform', 'leadprosper')
        .eq('is_connected', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking Lead Prosper connection:', error);
        return {
          isConnected: false,
          error: error.message
        };
      }

      if (!data || data.length === 0) {
        return { isConnected: false };
      }

      // Parse credentials
      let credentials = data[0].credentials;
      if (typeof credentials === 'string') {
        try {
          credentials = JSON.parse(credentials);
        } catch (e) {
          console.error('Failed to parse credentials:', e);
          return {
            isConnected: false,
            error: 'Invalid credentials format'
          };
        }
      }

      // Get API key from credentials
      const apiKey = credentials?.apiKey;
      
      // Cache API key for future use
      if (apiKey) {
        this.setCachedApiKey(apiKey);
      }

      return {
        isConnected: !!apiKey,
        apiKey,
        credentials: data[0]
      };
    } catch (error) {
      console.error('Error in checkConnection:', error);
      return {
        isConnected: false,
        error: error.message
      };
    }
  },

  /**
   * Get or cache API key in localStorage
   */
  getCachedApiKey(): string | null {
    try {
      return window.localStorage.getItem(LP_API_KEY_CACHE);
    } catch (e) {
      return null;
    }
  },

  /**
   * Set API key in localStorage
   */
  setCachedApiKey(apiKey: string | null): void {
    try {
      if (apiKey) {
        window.localStorage.setItem(LP_API_KEY_CACHE, apiKey);
      } else {
        window.localStorage.removeItem(LP_API_KEY_CACHE);
      }
    } catch (e) {
      console.error('Failed to set cached API key:', e);
    }
  },

  /**
   * Reset API state (clear cache)
   */
  resetState(): void {
    try {
      window.localStorage.removeItem(LP_API_KEY_CACHE);
    } catch (e) {
      console.error('Failed to reset state:', e);
    }
  },

  /**
   * Verify if API key is valid
   */
  async verifyApiKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.leadprosper.io/v1/campaigns', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('Error verifying API key:', error);
      return false;
    }
  },

  /**
   * Store credentials in the database
   */
  async storeCredentials(apiKey: string): Promise<boolean> {
    try {
      // For security, we'll rely on server-side RLS policies
      const { error } = await supabase.from('account_connections')
        .insert({
          platform: 'leadprosper',
          name: 'Lead Prosper',
          is_connected: true,
          credentials: JSON.stringify({ apiKey })
        });

      if (error) {
        console.error('Error storing credentials:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in storeCredentials:', error);
      return false;
    }
  },

  /**
   * Save or update connection
   */
  async saveConnection(apiKey: string, name = 'Lead Prosper', userId: string): Promise<any> {
    try {
      // Check if connection exists
      const { data: existingConn, error: checkError } = await supabase
        .from('account_connections')
        .select('*')
        .eq('platform', 'leadprosper')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) {
        console.error('Error checking existing connection:', checkError);
        throw new Error('Failed to check existing connections');
      }

      // Prepare credentials
      const credentials = JSON.stringify({ apiKey });

      // Update or insert
      if (existingConn && existingConn.length > 0) {
        const { data, error } = await supabase
          .from('account_connections')
          .update({
            name,
            is_connected: true,
            credentials,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConn[0].id)
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to update connection: ${error.message}`);
        }

        return data;
      } else {
        const { data, error } = await supabase
          .from('account_connections')
          .insert({
            platform: 'leadprosper',
            name,
            is_connected: true,
            credentials,
            user_id: userId
          })
          .select('*')
          .single();

        if (error) {
          throw new Error(`Failed to create connection: ${error.message}`);
        }

        return data;
      }
    } catch (error) {
      console.error('Error in saveConnection:', error);
      throw error;
    }
  },

  /**
   * Delete connection
   */
  async deleteConnection(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('account_connections')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting connection:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteConnection:', error);
      return false;
    }
  },

  /**
   * Fetch campaigns from Lead Prosper API
   */
  async fetchCampaigns(): Promise<LeadProsperCampaign[]> {
    try {
      const { isConnected, apiKey } = await this.checkConnection();
      
      if (!isConnected || !apiKey) {
        throw new Error('No active Lead Prosper connection');
      }
      
      return this.getCampaigns(apiKey);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }
  },

  /**
   * Get campaigns from Lead Prosper API
   */
  async getCampaigns(apiKey: string): Promise<LeadProsperCampaign[]> {
    try {
      const response = await fetch('https://api.leadprosper.io/v1/campaigns', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Check if campaigns array exists and is valid
      if (!data.campaigns || !Array.isArray(data.campaigns)) {
        throw new Error('Invalid response format');
      }
      
      // Process campaigns and save them to the database
      const campaigns = data.campaigns.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at
      }));
      
      // Store campaigns in database for reference
      if (campaigns.length > 0) {
        await this.storeCampaigns(campaigns);
      }
      
      return campaigns;
    } catch (error) {
      console.error('Error getting campaigns:', error);
      throw error;
    }
  },
  
  /**
   * Store campaigns in database
   */
  async storeCampaigns(campaigns: LeadProsperCampaign[]): Promise<void> {
    try {
      // Prepare data for insertion
      const campaignsToInsert = campaigns.map(campaign => ({
        lp_campaign_id: campaign.id,
        name: campaign.name,
        status: campaign.status || 'active'
      }));
      
      // Upsert campaigns
      const { error } = await supabase
        .from('external_lp_campaigns')
        .upsert(campaignsToInsert, {
          onConflict: 'lp_campaign_id',
          ignoreDuplicates: false
        });
      
      if (error) {
        console.error('Error storing campaigns:', error);
      }
    } catch (error) {
      console.error('Error storing campaigns:', error);
    }
  },

  /**
   * Get campaign mappings for a Tortshark campaign
   */
  async getCampaignMappings(tsCampaignId: string): Promise<LeadProsperMapping[]> {
    try {
      const { data, error } = await supabase
        .from('lp_to_ts_map')
        .select(`
          id,
          lp_campaign_id,
          ts_campaign_id,
          active,
          linked_at,
          unlinked_at,
          lp_campaign:lp_campaign_id (
            id,
            lp_campaign_id,
            name,
            status
          )
        `)
        .eq('ts_campaign_id', tsCampaignId);
      
      if (error) {
        console.error('Error fetching campaign mappings:', error);
        throw error;
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getCampaignMappings:', error);
      throw error;
    }
  },

  /**
   * Map a Lead Prosper campaign to a Tortshark campaign
   */
  async mapCampaign(tsCampaignId: string, lpCampaignId: number): Promise<LeadProsperMapping> {
    try {
      // First, get or create the external campaign reference
      const { data: existingCampaign, error: campaignError } = await supabase
        .from('external_lp_campaigns')
        .select('id')
        .eq('lp_campaign_id', lpCampaignId)
        .single();
      
      let externalCampaignId;
      
      if (campaignError || !existingCampaign) {
        // Need to fetch and create the campaign
        const { isConnected, apiKey } = await this.checkConnection();
        
        if (!isConnected || !apiKey) {
          throw new Error('No active Lead Prosper connection');
        }
        
        // Get campaign details from API
        const response = await fetch(`https://api.leadprosper.io/v1/campaigns/${lpCampaignId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }
        
        const campaign = await response.json();
        
        // Insert campaign
        const { data: newCampaign, error: insertError } = await supabase
          .from('external_lp_campaigns')
          .insert({
            lp_campaign_id: lpCampaignId,
            name: campaign.name || `Campaign ${lpCampaignId}`,
            status: campaign.status || 'active'
          })
          .select('id')
          .single();
          
        if (insertError || !newCampaign) {
          throw new Error('Failed to create external campaign reference');
        }
        
        externalCampaignId = newCampaign.id;
      } else {
        externalCampaignId = existingCampaign.id;
      }
      
      // Now create the mapping
      const { data: mapping, error: mappingError } = await supabase
        .from('lp_to_ts_map')
        .insert({
          ts_campaign_id: tsCampaignId,
          lp_campaign_id: externalCampaignId,
          active: true,
          linked_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (mappingError || !mapping) {
        throw new Error('Failed to create campaign mapping');
      }
      
      return mapping;
    } catch (error) {
      console.error('Error mapping campaign:', error);
      throw error;
    }
  },

  /**
   * Unmap a Lead Prosper campaign from a Tortshark campaign
   */
  async unmapCampaign(mappingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('lp_to_ts_map')
        .update({
          active: false,
          unlinked_at: new Date().toISOString()
        })
        .eq('id', mappingId);
      
      if (error) {
        console.error('Error unmapping campaign:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error unmapping campaign:', error);
      return false;
    }
  },

  /**
   * Get Lead Prosper webhook URL
   */
  getLeadProsperWebhookUrl(): string {
    return `${window.location.origin}/api/webhook/leadprosper`;
  },

  /**
   * Backfill leads for a campaign from Lead Prosper
   */
  async backfillLeads(
    apiKey: string,
    lpCampaignId: number,
    tsCampaignId: string,
    startDate: string,
    endDate: string
  ): Promise<LeadProsperLeadProcessingResult> {
    try {
      const response = await fetch(`${window.location.origin}/functions/lead-prosper-backfill`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apiKey,
          lpCampaignId,
          tsCampaignId,
          startDate,
          endDate
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backfill API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error backfilling leads:', error);
      throw error;
    }
  },

  /**
   * Fetch today's leads from Lead Prosper
   */
  async fetchTodayLeads(): Promise<LeadProsperSyncResult> {
    try {
      const response = await fetch(`${window.location.origin}/functions/lead-prosper-fetch-today`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching today\'s leads:', error);
      throw {
        success: false,
        error: error.message,
        total_leads: 0,
        campaigns_processed: 0
      };
    }
  },
  
  /**
   * Get leads list from database
   */
  async getLeadsList({
    page = 1,
    pageSize = 10,
    ts_campaign_id,
    status,
    searchTerm,
    startDate,
    endDate
  }: {
    page: number;
    pageSize: number;
    ts_campaign_id: string;
    status?: string;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ leads: any[]; total: number }> {
    try {
      // Build the query
      let query = supabase
        .from('lp_leads_raw')
        .select('*', { count: 'exact' });
      
      // Add filters
      if (ts_campaign_id) {
        query = query.eq('ts_campaign_id', ts_campaign_id);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      // Add date range filter
      if (startDate) {
        const startDateObj = new Date(startDate);
        query = query.gte('lead_date_ms', startDateObj.getTime());
      }
      
      if (endDate) {
        const endDateObj = new Date(endDate);
        endDateObj.setHours(23, 59, 59, 999); // Set to end of day
        query = query.lte('lead_date_ms', endDateObj.getTime());
      }
      
      // Add search
      if (searchTerm) {
        // Search inside json_payload as a string
        query = query.textSearch('json_payload', searchTerm);
      }
      
      // Add pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query.order('lead_date_ms', { ascending: false })
        .range(from, to);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }
      
      return { 
        leads: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error getting leads list:', error);
      throw error;
    }
  }
};
