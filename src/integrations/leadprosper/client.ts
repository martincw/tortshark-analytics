// Create a basic client for interacting with Lead Prosper API
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LeadProsperCredentials, LeadProsperSyncResult, LeadProsperMapping, DailyLeadMetrics } from './types';
import { LeadProsperLeadRecord, LeadProsperMappingRecord } from '@/types/common';

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
  leads: LeadProsperLeadRecord[];
  total: number;
}

// Cache for API keys to avoid repeated database lookups
let cachedApiKey: string | null = null;

// Default timezone for Lead Prosper API calls - changed to America/Denver per support recommendation
const DEFAULT_TIMEZONE = 'America/Denver';

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

      // After fetching campaigns, store them in the database
      if (data?.campaigns && Array.isArray(data.campaigns)) {
        await this.storeCampaignsInDatabase(data.campaigns);
      }

      return data?.campaigns || [];
    } catch (error) {
      console.error('Error fetching Lead Prosper campaigns:', error);
      throw error;
    }
  },

  // Store Lead Prosper campaigns in the database
  async storeCampaignsInDatabase(campaigns: any[]): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      for (const campaign of campaigns) {
        // Check if campaign already exists
        const { data: existingCampaign, error: queryError } = await supabase
          .from('external_lp_campaigns')
          .select('id')
          .eq('lp_campaign_id', campaign.id)
          .maybeSingle();

        if (queryError && queryError.code !== 'PGRST116') {
          console.error('Error checking campaign:', queryError);
          continue;
        }

        if (existingCampaign) {
          // Update existing campaign
          const { error: updateError } = await supabase
            .from('external_lp_campaigns')
            .update({
              name: campaign.name,
              status: campaign.status || 'active',
              updated_at: new Date().toISOString(),
              user_id: user.id
            })
            .eq('id', existingCampaign.id);

          if (updateError) {
            console.error('Error updating campaign:', updateError);
          }
        } else {
          // Insert new campaign
          const { error: insertError } = await supabase
            .from('external_lp_campaigns')
            .insert({
              lp_campaign_id: campaign.id,
              name: campaign.name,
              status: campaign.status || 'active',
              user_id: user.id
            });

          if (insertError) {
            console.error('Error inserting campaign:', insertError);
          }
        }
      }
    } catch (error) {
      console.error('Error storing campaigns in database:', error);
    }
  },

  // Alias for fetchCampaigns for backward compatibility
  getCampaigns(apiKey: string): Promise<any[]> {
    return this.fetchCampaigns();
  },

  // Get campaign mappings for a specific Tortshark campaign
  async getCampaignMappings(tsCampaignId: string): Promise<LeadProsperMappingRecord[]> {
    try {
      const { data, error } = await supabase
        .from('lp_to_ts_map')
        .select(`
          id,
          ts_campaign_id,
          lp_campaign_id,
          active,
          linked_at,
          unlinked_at,
          external_lp_campaigns(id, lp_campaign_id, name, status)
        `)
        .eq('ts_campaign_id', tsCampaignId)
        .eq('active', true);

      if (error) {
        console.error('Error getting Lead Prosper campaign mappings:', error);
        throw error;
      }

      // Transform the data to match the expected format
      return (data || []).map(mapping => ({
        id: mapping.id,
        ts_campaign_id: mapping.ts_campaign_id,
        lp_campaign_id: mapping.lp_campaign_id,
        active: mapping.active,
        linked_at: mapping.linked_at,
        unlinked_at: mapping.unlinked_at,
        lp_campaign: mapping.external_lp_campaigns ? {
          id: mapping.external_lp_campaigns.id,
          lp_campaign_id: mapping.external_lp_campaigns.lp_campaign_id,
          name: mapping.external_lp_campaigns.name,
          status: mapping.external_lp_campaigns.status
        } : undefined
      }));
    } catch (error) {
      console.error('Error getting mapped Lead Prosper campaigns:', error);
      throw error;
    }
  },

  // Alias for getCampaignMappings for backward compatibility
  getMappedCampaigns(tsCampaignId: string): Promise<LeadProsperMappingRecord[]> {
    return this.getCampaignMappings(tsCampaignId);
  },

  // Map Lead Prosper campaign to Tortshark campaign
  async mapCampaign(tsCampaignId: string, lpCampaignId: number): Promise<boolean> {
    try {
      // First, get the external_lp_campaigns entry for this lpCampaignId
      const { data: lpCampaign, error: lpCampaignError } = await supabase
        .from('external_lp_campaigns')
        .select('id')
        .eq('lp_campaign_id', lpCampaignId)
        .single();

      if (lpCampaignError) {
        console.error('Error finding LP campaign:', lpCampaignError);
        throw new Error(`Lead Prosper campaign with ID ${lpCampaignId} not found`);
      }

      // Check if a mapping already exists and is active
      const { data: existingMapping, error: checkError } = await supabase
        .from('lp_to_ts_map')
        .select('id')
        .eq('ts_campaign_id', tsCampaignId)
        .eq('lp_campaign_id', lpCampaign.id)
        .eq('active', true)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing mapping:', checkError);
        throw checkError;
      }

      if (existingMapping) {
        // Mapping already exists and is active
        return true;
      }

      // If there was a previous mapping that was deactivated, update it
      const { data: oldMapping, error: oldMappingError } = await supabase
        .from('lp_to_ts_map')
        .select('id')
        .eq('ts_campaign_id', tsCampaignId)
        .eq('lp_campaign_id', lpCampaign.id)
        .eq('active', false)
        .maybeSingle();

      if (oldMappingError && oldMappingError.code !== 'PGRST116') {
        console.error('Error checking old mapping:', oldMappingError);
        throw oldMappingError;
      }

      if (oldMapping) {
        // Reactivate the old mapping
        const { error: updateError } = await supabase
          .from('lp_to_ts_map')
          .update({
            active: true,
            linked_at: new Date().toISOString(),
            unlinked_at: null
          })
          .eq('id', oldMapping.id);

        if (updateError) {
          console.error('Error reactivating mapping:', updateError);
          throw updateError;
        }
      } else {
        // Create a new mapping
        const { error: insertError } = await supabase
          .from('lp_to_ts_map')
          .insert({
            ts_campaign_id: tsCampaignId,
            lp_campaign_id: lpCampaign.id,
            active: true,
            linked_at: new Date().toISOString()
          });

        if (insertError) {
          console.error('Error creating mapping:', insertError);
          throw insertError;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error mapping Lead Prosper campaign:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('An unknown error occurred while mapping the campaign');
      }
    }
  },

  // Unmap Lead Prosper campaign from Tortshark campaign
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
        throw error;
      }
      
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
      // Call the edge function to handle the backfill
      const { data, error } = await supabase.functions.invoke('lead-prosper-backfill', {
        body: {
          apiKey,
          lpCampaignId,
          tsCampaignId,
          startDate,
          endDate
        }
      });

      if (error) {
        console.error('Error in backfill leads function:', error);
        throw error;
      }

      return data?.success || false;
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
      
      // Use minimal approach with reduced parameters
      const { data, error } = await supabase.functions.invoke('lead-prosper-fetch-today', {
        body: { 
          apiKey
          // No timezone parameter to keep request simple
        },
      });

      if (error) {
        console.error('Error calling lead-prosper-fetch-today function:', error);
        
        // Specific handling for rate limit errors
        if (error.message?.includes('429') || error.message?.includes('Too Many Attempts')) {
          throw new Error('Lead Prosper API rate limit exceeded. Please try again later.');
        }
        
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
        
        // Add the date for which data was fetched
        if (data.date_fetched) {
          result.date_fetched = data.date_fetched;
        }
        
        // Check for errors or partial success
        if (!data.success) {
          result.error = data.error || (
            data.results?.find((r: any) => r.status === 'error' || r.status === 'rate_limited')?.error || 
            "Failed to fetch today's leads"
          );
          
          // Check if any campaign had a rate limit issue
          const hasRateLimit = data.results?.some((r: any) => 
            r.status === 'rate_limited' || 
            (r.error && (r.error.includes('429') || r.error.includes('Too Many Attempts')))
          );
          
          if (hasRateLimit) {
            result.error = 'Rate limit exceeded. The system will automatically use optimized requests next time.';
          }
          
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
      
      // Special handling for rate limit errors
      if (error instanceof Error && (
          error.message.includes('429') || 
          error.message.includes('Too Many Attempts') ||
          error.message.includes('rate limit')
      )) {
        return {
          success: false,
          total_leads: 0,
          campaigns_processed: 0,
          error: 'Lead Prosper API rate limit exceeded. Please try again in a few minutes.',
          endpoint_used: 'error'
        };
      }
      
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
      // Build the query
      let query = supabase
        .from('lp_leads_raw')
        .select('*', { count: 'exact' });

      // Apply filters
      if (params.ts_campaign_id) {
        query = query.eq('ts_campaign_id', params.ts_campaign_id);
      }

      if (params.status) {
        query = query.eq('status', params.status);
      }

      // Handle date range filters
      if (params.startDate && params.endDate) {
        // Convert date strings to timestamps for comparison with lead_date_ms
        const startDate = new Date(params.startDate).getTime();
        const endDate = new Date(params.endDate).getTime() + (24 * 60 * 60 * 1000); // Add one day to include the end date
        
        query = query.gte('lead_date_ms', startDate).lte('lead_date_ms', endDate);
      }

      // Apply search if provided
      if (params.searchTerm) {
        // Search within the JSON payload for matching values
        query = query.or(`json_payload.ilike.%${params.searchTerm}%`);
      }

      // Apply pagination
      const page = params.page || 1;
      const pageSize = params.pageSize || 10;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query.order('lead_date_ms', { ascending: false }).range(from, to);

      // Execute the query
      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        leads: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching leads list:', error);
      toast.error('Failed to fetch leads');
      throw error;
    }
  },

  // Process lead data and update metrics
  async processLeadsAndUpdateMetrics(
    data: { leads: any[], campaign_id: number, ts_campaign_id: string }
  ): Promise<{
    success: boolean;
    processed: number;
    errors: number;
  }> {
    try {
      if (!data.leads || !Array.isArray(data.leads) || data.leads.length === 0) {
        return { success: true, processed: 0, errors: 0 };
      }

      const { campaign_id: lpCampaignId, ts_campaign_id: tsCampaignId } = data;

      if (!lpCampaignId || !tsCampaignId) {
        throw new Error('Missing campaign IDs for lead processing');
      }

      let processed = 0;
      let errors = 0;

      // Process each lead
      for (const lead of data.leads) {
        try {
          // Check if lead already exists
          const { data: existingLead, error: checkError } = await supabase
            .from('lp_leads_raw')
            .select('id')
            .eq('id', lead.id)
            .maybeSingle();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking existing lead:', checkError);
            errors++;
            continue;
          }

          if (existingLead) {
            console.log(`Lead ${lead.id} already exists, skipping`);
            continue;
          }

          // Insert new lead
          const { error: insertError } = await supabase.from('lp_leads_raw').insert({
            id: lead.id,
            lp_campaign_id: lpCampaignId,
            ts_campaign_id: tsCampaignId,
            status: lead.status || 'unknown',
            cost: lead.cost || 0,
            revenue: lead.revenue || 0,
            lead_date_ms: lead.created_at ? new Date(lead.created_at).getTime() : Date.now(),
            json_payload: lead
          });

          if (insertError) {
            console.error('Error inserting lead:', insertError);
            errors++;
            continue;
          }

          processed++;
          
          // Group leads by date for metrics aggregation
          const leadDate = new Date(lead.created_at || Date.now());
          const dateStr = leadDate.toISOString().split('T')[0]; // YYYY-MM-DD
          
          // Call the upsert_daily_lead_metrics function
          const { error: metricsError } = await supabase.rpc('upsert_daily_lead_metrics', {
            p_ts_campaign_id: tsCampaignId,
            p_date: dateStr,
            p_lead_count: 1,
            p_accepted: lead.status === 'sold' ? 1 : 0,
            p_duplicated: lead.status === 'duplicate' ? 1 : 0,
            p_failed: ['rejected', 'failed'].includes(lead.status || '') ? 1 : 0,
            p_cost: lead.cost || 0,
            p_revenue: lead.revenue || 0
          });
          
          if (metricsError) {
            console.error('Error updating metrics:', metricsError);
            // Don't count this as a lead processing error
          }
        } catch (err) {
          console.error('Error processing lead:', err);
          errors++;
        }
      }

      return {
        success: errors === 0,
        processed,
        errors
      };
    } catch (error) {
      console.error('Error in processLeadsAndUpdateMetrics:', error);
      return {
        success: false,
        processed: 0,
        errors: data.leads?.length || 0
      };
    }
  }
};
