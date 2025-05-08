
// Create a basic client for interacting with Lead Prosper API
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeadProsperCredentials } from './types';

export interface LeadListParams {
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
  ts_campaign_id?: string;
  status?: string;
  searchTerm?: string;
}

export interface LeadResponse {
  leads: any[];
  total: number;
}

// Cache for API keys to avoid repeated database lookups
let cachedApiKey: string | null = null;

export const leadProsperApi = {
  // Get credentials for Lead Prosper API
  async getApiCredentials(): Promise<LeadProsperCredentials> {
    try {
      const { data: tokens, error } = await supabase
        .from('user_oauth_tokens')
        .select('access_token')
        .eq('provider', 'lead_prosper')
        .single();

      if (error) {
        console.error('Error fetching Lead Prosper credentials:', error);
        return { isConnected: false };
      }

      // Cache the API key for future use
      if (tokens?.access_token) {
        cachedApiKey = tokens.access_token;
      }

      return {
        apiKey: tokens?.access_token,
        isConnected: !!tokens?.access_token,
      };
    } catch (error) {
      console.error('Error in getApiCredentials:', error);
      return { isConnected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Check if connected to Lead Prosper
  async checkConnection(forceRefresh = false): Promise<LeadProsperCredentials> {
    if (forceRefresh) {
      cachedApiKey = null; // Clear cache if force refresh
    }
    
    try {
      // Get the existing connection data
      const { data: connection, error } = await supabase
        .from('user_oauth_tokens')
        .select('*')
        .eq('provider', 'lead_prosper')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No record found
          return { isConnected: false };
        }
        return { isConnected: false, error: error.message };
      }

      // Parse credentials if they're stored as a string
      let credentials = connection.access_token;
      if (connection.access_token) {
        cachedApiKey = connection.access_token;
      }

      return {
        apiKey: connection.access_token,
        isConnected: !!connection.access_token,
        credentials: {
          id: connection.id,
          name: 'Lead Prosper',
          is_connected: !!connection.access_token,
          last_synced: connection.updated_at,
          credentials: { apiKey: connection.access_token }
        },
        fromCache: !forceRefresh
      };
    } catch (error) {
      console.error('Error checking Lead Prosper connection:', error);
      return { isConnected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Store credentials for Lead Prosper API
  async storeCredentials(apiKey: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user?.id) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_oauth_tokens')
        .upsert({
          user_id: user.user.id,
          provider: 'lead_prosper',
          access_token: apiKey,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiration
        });

      if (error) throw error;
      
      // Update cache
      cachedApiKey = apiKey;
      
      return true;
    } catch (error) {
      console.error('Error storing Lead Prosper credentials:', error);
      return false;
    }
  },

  // Remove Lead Prosper credentials
  async removeCredentials(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_oauth_tokens')
        .delete()
        .eq('provider', 'lead_prosper');

      if (error) throw error;
      
      // Clear cache
      cachedApiKey = null;
      
      return true;
    } catch (error) {
      console.error('Error removing Lead Prosper credentials:', error);
      return false;
    }
  },

  // Helper methods for cached API key
  getCachedApiKey(): string | null {
    return cachedApiKey;
  },

  setCachedApiKey(apiKey: string | null): void {
    cachedApiKey = apiKey;
  },

  resetState(): void {
    cachedApiKey = null;
  },

  // Get webhook URL for Lead Prosper
  getLeadProsperWebhookUrl(): string {
    return `https://msgqsgftjwpbnqenhfmc.functions.supabase.co/lead-prosper-webhook`;
  },

  // Fetch list of campaigns from Lead Prosper
  async fetchCampaigns(): Promise<any[]> {
    try {
      const { apiKey, isConnected } = await this.getApiCredentials();

      if (!isConnected || !apiKey) {
        throw new Error('Not connected to Lead Prosper');
      }

      const { data, error } = await supabase.functions.invoke('lead-prosper-campaigns', {
        body: { apiKey },
      });

      if (error) throw error;
      return data?.campaigns || [];
    } catch (error) {
      console.error('Error fetching Lead Prosper campaigns:', error);
      throw error;
    }
  },

  // Alias for fetchCampaigns for backward compatibility
  getCampaigns(apiKey: string): Promise<any[]> {
    return this.fetchCampaigns();
  },

  // Get campaign mappings for a specific Tortshark campaign
  async getCampaignMappings(tsCampaignId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('lp_to_ts_map')
        .select(`
          id, 
          active,
          linked_at,
          unlinked_at,
          ts_campaign_id,
          lp_campaign_id,
          lp_campaign:lp_campaign_id (
            id, 
            lp_campaign_id,
            name,
            status
          )
        `)
        .eq('ts_campaign_id', tsCampaignId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting mapped Lead Prosper campaigns:', error);
      throw error;
    }
  },

  // Alias for getCampaignMappings for backward compatibility
  getMappedCampaigns(tsCampaignId: string): Promise<any[]> {
    return this.getCampaignMappings(tsCampaignId);
  },

  // Map Lead Prosper campaign to Tortshark campaign
  async mapCampaign(tsCampaignId: string, lpCampaignId: number): Promise<boolean> {
    try {
      // First we need to check if we already have this LP campaign in our system
      const { data: existingLpCampaign, error: fetchError } = await supabase
        .from('external_lp_campaigns')
        .select('id')
        .eq('lp_campaign_id', lpCampaignId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let lpCampaignUuid = existingLpCampaign?.id;

      // If we don't have it, we need to get the campaign name first
      if (!lpCampaignUuid) {
        const campaigns = await this.fetchCampaigns();
        const campaign = campaigns.find(c => c.id === lpCampaignId);

        if (!campaign) {
          throw new Error(`Campaign with ID ${lpCampaignId} not found`);
        }

        // Insert the campaign into our database
        const { data: newCampaign, error: insertError } = await supabase
          .from('external_lp_campaigns')
          .insert({
            lp_campaign_id: lpCampaignId,
            name: campaign.name,
            status: campaign.status,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        lpCampaignUuid = newCampaign.id;
      }

      // Now create the mapping
      const { error: mappingError } = await supabase
        .from('lp_to_ts_map')
        .insert({
          lp_campaign_id: lpCampaignUuid,
          ts_campaign_id: tsCampaignId,
        });

      if (mappingError) throw mappingError;
      return true;
    } catch (error) {
      console.error('Error mapping Lead Prosper campaign:', error);
      throw error;
    }
  },

  // Unmap Lead Prosper campaign from Tortshark campaign
  async unmapCampaign(mappingId: string): Promise<boolean> {
    try {
      // Find the mapping
      const { error } = await supabase
        .from('lp_to_ts_map')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unmapping Lead Prosper campaign:', error);
      throw error;
    }
  },

  // Backfill leads from a specific period
  async backfillLeads(
    apiKey: string, 
    lpCampaignId: number,
    tsCampaignId: string,
    startDate: string,
    endDate: string
  ): Promise<boolean> {
    try {
      // This is just a stub - in a real implementation, you'd call an edge function
      // to trigger backfilling leads
      console.log(`Backfilling leads for campaign ${lpCampaignId} from ${startDate} to ${endDate}`);
      
      // Simulate success
      return true;
    } catch (error) {
      console.error('Error backfilling leads:', error);
      return false;
    }
  },

  // Verify that an API key is valid
  async verifyApiKey(apiKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('lead-prosper-verify', {
        body: { apiKey },
      });

      if (error) {
        console.error('Error verifying API key:', error);
        return false;
      }

      return data?.isValid === true;
    } catch (error) {
      console.error('Error in verifyApiKey:', error);
      return false;
    }
  },

  // Save connection information
  async saveConnection(apiKey: string, name: string, userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('user_oauth_tokens')
        .upsert({
          user_id: userId,
          provider: 'lead_prosper',
          access_token: apiKey,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update cache
      cachedApiKey = apiKey;
      
      return {
        id: data.id,
        name: name || 'Lead Prosper',
        is_connected: true,
        last_synced: data.updated_at,
        credentials: { apiKey }
      };
    } catch (error) {
      console.error('Error saving connection:', error);
      throw error;
    }
  },

  // Delete connection
  async deleteConnection(id: string): Promise<boolean> {
    return this.removeCredentials();
  },

  // Fetch today's leads from Lead Prosper
  async fetchTodayLeads(): Promise<{
    success: boolean;
    total_leads: number;
    campaigns_processed: number;
    results?: any[];
    error?: string;
  }> {
    try {
      const { apiKey, isConnected } = await this.getApiCredentials();

      if (!isConnected || !apiKey) {
        throw new Error('Not connected to Lead Prosper. Please add your API key first.');
      }

      const { data, error } = await supabase.functions.invoke('lead-prosper-fetch-today', {
        body: { apiKey },
      });

      if (error) {
        console.error('Error calling lead-prosper-fetch-today function:', error);
        throw error;
      }

      if (!data.success) {
        return {
          success: false,
          total_leads: 0,
          campaigns_processed: 0,
          error: data.error || "Failed to fetch today's leads",
        };
      }

      return {
        success: true,
        total_leads: data.total_leads || 0,
        campaigns_processed: data.campaigns_processed || 0,
        results: data.results || [],
      };
    } catch (error) {
      console.error('Error in fetchTodaysLeads:', error);
      return {
        success: false,
        total_leads: 0,
        campaigns_processed: 0,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  },

  // Get list of leads from database with filtering
  async getLeadsList(params: LeadListParams = {}): Promise<LeadResponse> {
    try {
      const {
        page = 1,
        pageSize = 20,
        startDate,
        endDate,
        ts_campaign_id,
        status,
        searchTerm,
      } = params;

      // Calculate range for pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('lp_leads_raw')
        .select(`
          *,
          campaign:ts_campaign_id(id, name)
        `, { count: 'exact' })
        .order('lead_date_ms', { ascending: false })
        .range(from, to);

      // Apply filters
      if (startDate) {
        const startDateMs = new Date(startDate).getTime();
        query = query.gte('lead_date_ms', startDateMs);
      }

      if (endDate) {
        // Add one day to end date to include the entire end date
        const nextDay = new Date(endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const endDateMs = nextDay.getTime();
        query = query.lt('lead_date_ms', endDateMs);
      }

      if (ts_campaign_id) {
        query = query.eq('ts_campaign_id', ts_campaign_id);
      }

      if (status) {
        query = query.eq('status', status);
      }

      if (searchTerm) {
        // For simple search, we'll look in the JSON payload
        query = query.textSearch('json_payload', searchTerm, {
          config: 'english',
        });
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        leads: data || [],
        total: count || 0,
      };
    } catch (error) {
      console.error('Error fetching leads list:', error);
      toast.error('Failed to fetch leads');
      throw error;
    }
  },
};
