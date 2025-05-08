
// Create a basic client for interacting with Lead Prosper API
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeadProsperCredentials, LeadProsperSyncResult } from './types';

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

// Default timezone for Lead Prosper API calls
const DEFAULT_TIMEZONE = 'UTC'; // Changed to UTC for better compatibility

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
          return { isConnected: false, fromCache: !forceRefresh };
        }
        return { isConnected: false, error: error.message, fromCache: !forceRefresh };
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
      return { isConnected: false, error: error instanceof Error ? error.message : 'Unknown error', fromCache: !forceRefresh };
    }
  },

  // Store credentials for Lead Prosper API
  async storeCredentials(apiKey: string): Promise<boolean> {
    try {
      const { data: user } = await supabase.auth.getUser();

      if (!user?.user?.id) {
        throw new Error('User not authenticated');
      }

      // First, check if we already have a record
      const { data: existingToken, error: checkError } = await supabase
        .from('user_oauth_tokens')
        .select('id')
        .eq('provider', 'lead_prosper')
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing token:', checkError);
      }

      let operation;
      if (existingToken) {
        // Update existing record
        operation = supabase
          .from('user_oauth_tokens')
          .update({
            access_token: apiKey,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiration
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id);
      } else {
        // Insert new record
        operation = supabase
          .from('user_oauth_tokens')
          .insert({
            user_id: user.user.id,
            provider: 'lead_prosper',
            access_token: apiKey,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiration
          });
      }

      const { error } = await operation;

      if (error) {
        console.error('Error storing Lead Prosper credentials:', error);
        throw error;
      }
      
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
      // First get the current user's ID
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user', userError);
        throw new Error(`Authentication error: ${userError.message}`);
      }
      
      if (!userData?.user?.id) {
        throw new Error('User not authenticated');
      }
      
      const userId = userData.user.id;
      
      // First we need to check if we already have this LP campaign in our system
      const { data: existingLpCampaign, error: fetchError } = await supabase
        .from('external_lp_campaigns')
        .select('id')
        .eq('lp_campaign_id', lpCampaignId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking existing campaign:', fetchError);
        throw new Error(`Database error: ${fetchError.message}`);
      }

      let lpCampaignUuid = existingLpCampaign?.id;

      // If we don't have it, we need to get the campaign name first
      if (!lpCampaignUuid) {
        const campaigns = await this.fetchCampaigns();
        const campaign = campaigns.find(c => c.id === lpCampaignId);

        if (!campaign) {
          throw new Error(`Campaign with ID ${lpCampaignId} not found`);
        }

        // Insert the campaign into our database with user_id
        const { data: newCampaign, error: insertError } = await supabase
          .from('external_lp_campaigns')
          .insert({
            lp_campaign_id: lpCampaignId,
            name: campaign.name,
            status: campaign.status,
            user_id: userId // Add the user_id to associate this campaign with the current user
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting campaign:', insertError);
          throw new Error(`Failed to save campaign: ${insertError.message}`);
        }
        
        lpCampaignUuid = newCampaign.id;
      }

      // Now create the mapping
      const { error: mappingError } = await supabase
        .from('lp_to_ts_map')
        .insert({
          lp_campaign_id: lpCampaignUuid,
          ts_campaign_id: tsCampaignId,
        });

      if (mappingError) {
        console.error('Error creating mapping:', mappingError);
        throw new Error(`Failed to create campaign mapping: ${mappingError.message}`);
      }
      
      return true;
    } catch (error) {
      console.error('Error mapping Lead Prosper campaign:', error);
      
      // Provide a more specific error message based on the error type
      if (error instanceof Error) {
        // Re-throw with the original message to preserve the error context
        throw error;
      } else {
        throw new Error('An unknown error occurred while mapping the campaign');
      }
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
      console.log('Verifying Lead Prosper API key...');
      const { data, error } = await supabase.functions.invoke('lead-prosper-verify', {
        body: { apiKey },
      });

      if (error) {
        console.error('Error verifying API key:', error);
        return false;
      }

      // Check both success and isValid properties for backward compatibility
      return data?.success === true || data?.isValid === true;
    } catch (error) {
      console.error('Error in verifyApiKey:', error);
      return false;
    }
  },

  // Save connection information
  async saveConnection(apiKey: string, name: string, userId: string): Promise<any> {
    try {
      // First, check if we already have a record
      const { data: existingToken, error: checkError } = await supabase
        .from('user_oauth_tokens')
        .select('id')
        .eq('provider', 'lead_prosper')
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing token:', checkError);
        throw checkError;
      }

      let result;
      if (existingToken) {
        // Update existing record
        const { data: updatedData, error: updateError } = await supabase
          .from('user_oauth_tokens')
          .update({
            user_id: userId,
            access_token: apiKey,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingToken.id)
          .select()
          .single();

        if (updateError) throw updateError;
        result = updatedData;
      } else {
        // Insert new record
        const { data: insertedData, error: insertError } = await supabase
          .from('user_oauth_tokens')
          .insert({
            user_id: userId,
            provider: 'lead_prosper',
            access_token: apiKey,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (insertError) throw insertError;
        result = insertedData;
      }
      
      // Update cache
      cachedApiKey = apiKey;
      
      return {
        id: result.id,
        name: name || 'Lead Prosper',
        is_connected: true,
        last_synced: result.updated_at,
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

  // Get all account connections, including Lead Prosper
  async getAccountConnections(): Promise<any[]> {
    try {
      // Get Lead Prosper connection
      const lpConnection = await this.checkConnection();
      
      const connections = [];
      
      if (lpConnection.isConnected) {
        connections.push({
          id: lpConnection.credentials?.id || 'leadprosper',
          name: 'Lead Prosper',
          platform: 'leadprosper',
          isConnected: true,
          lastSynced: lpConnection.credentials?.last_synced || null,
          customerId: null,
          credentials: {
            apiKey: lpConnection.apiKey || '',
          }
        });
      }
      
      return connections;
    } catch (error) {
      console.error('Error getting account connections:', error);
      return [];
    }
  },

  // Fetch today's leads from Lead Prosper
  async fetchTodayLeads(): Promise<LeadProsperSyncResult> {
    try {
      console.log("Fetching today's leads from Lead Prosper");
      
      const { apiKey, isConnected } = await this.getApiCredentials();

      if (!isConnected || !apiKey) {
        console.error("Lead Prosper not connected or missing API key");
        throw new Error('Not connected to Lead Prosper. Please add your API key first.');
      }

      console.log(`Calling lead-prosper-fetch-today function with API key (length: ${apiKey.length})`);
      
      // Use UTC timezone format by default - more widely supported
      const timezone = DEFAULT_TIMEZONE;
      console.log(`Using timezone: ${timezone}`);
      
      const { data, error } = await supabase.functions.invoke('lead-prosper-fetch-today', {
        body: { 
          apiKey,
          timezone
        },
      });

      if (error) {
        console.error('Error calling lead-prosper-fetch-today function:', error);
        throw new Error(`Edge function error: ${error.message || 'Unknown error'}`);
      }

      console.log('Response from lead-prosper-fetch-today:', data);
      
      // Return comprehensive debug information
      if (data && typeof data === 'object') {
        const result: LeadProsperSyncResult = {
          success: !!data.success,
          total_leads: data.total_leads || 0,
          campaigns_processed: data.campaigns_processed || 0,
          results: data.results || [],
          debug_info: data.debug_info || [],
          endpoint_used: data.debug_info?.[0]?.endpoint_used || 'unknown'
        };
        
        // Add timestamp of when the data was last fetched
        if (data.last_synced) {
          result.last_synced = data.last_synced;
        }
        
        // Check for errors or partial success
        if (!data.success) {
          result.error = data.error || (
            data.results?.find((r: any) => r.status === 'error')?.error || 
            "Failed to fetch today's leads"
          );
          
          // Check if the error is related to timezone issues
          const isTimezoneError = 
            (typeof result.error === 'string' && 
            (result.error.includes('timezone') || 
              result.error.includes('valid zone') || 
              result.error.toLowerCase().includes('cannot assign null')));
          
          if (isTimezoneError) {
            result.timezone_error = true;
          }
        }
        
        // Check for partial success with stats
        const statsOnlyCampaigns = data.results?.filter((r: any) => r.status === 'success_stats_only') || [];
        if (statsOnlyCampaigns.length > 0) {
          result.used_stats_fallback = true;
        }
        
        return result;
      }
      
      return {
        success: false,
        total_leads: 0,
        campaigns_processed: 0,
        error: 'Invalid response format from API',
        endpoint_used: 'error'
      };
    } catch (error) {
      console.error('Error in fetchTodaysLeads:', error);
      return {
        success: false,
        total_leads: 0,
        campaigns_processed: 0,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        endpoint_used: 'error'
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
