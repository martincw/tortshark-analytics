import { supabase, SUPABASE_PROJECT_URL } from '../supabase/client';

// Cache for storing API key temporarily
let cachedApiKey: string | null = null;
let connectionStatusCache: { isConnected: boolean, timestamp: number, credentials: any } | null = null;
const CONNECTION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const leadProsperApi = {
  // Get cached API key if available
  getCachedApiKey(): string | null {
    return cachedApiKey || localStorage.getItem('lp_api_key');
  },

  // Set cached API key
  setCachedApiKey(apiKey: string | null): void {
    cachedApiKey = apiKey;
    if (apiKey) {
      localStorage.setItem('lp_api_key', apiKey);
    } else {
      localStorage.removeItem('lp_api_key');
    }
  },

  async checkConnection() {
    try {
      console.log('Checking Lead Prosper connection...');
      
      // First try to use cache if it exists and is not expired
      if (connectionStatusCache && 
          (Date.now() - connectionStatusCache.timestamp) < CONNECTION_CACHE_TTL) {
        console.log('Using cached connection status');
        return {
          isConnected: connectionStatusCache.isConnected,
          credentials: connectionStatusCache.credentials,
          fromCache: true
        };
      }
      
      // Get auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        return { isConnected: false, error: 'Authentication required' };
      }

      // Try to fetch connection status from edge function
      try {
        const { data, error } = await supabase.functions.invoke('lead-prosper-auth', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        
        if (error) {
          console.error('Error checking Lead Prosper connection (edge function):', error);
          // Don't throw, continue with fallback below
        } else {
          // Update cache with edge function response
          connectionStatusCache = {
            isConnected: data.isConnected,
            credentials: data.credentials,
            timestamp: Date.now()
          };
          
          // If we have credentials with an API key, cache it
          if (data.credentials?.credentials?.apiKey) {
            this.setCachedApiKey(data.credentials.credentials.apiKey);
          }
          
          return data;
        }
      } catch (edgeFunctionError) {
        console.error('Edge function error in checkConnection:', edgeFunctionError);
        // Continue with fallback
      }

      // Fallback: direct database query for connection status
      console.log('Falling back to direct database query for connection status');
      const { data: connections, error: dbError } = await supabase
        .from('account_connections')
        .select('*')
        .eq('platform', 'leadprosper')
        .eq('is_connected', true)
        .maybeSingle();
        
      if (dbError) {
        console.error('Error checking Lead Prosper connection (db fallback):', dbError);
        throw dbError;
      }
      
      // Update cache with database response
      connectionStatusCache = {
        isConnected: !!connections,
        credentials: connections,
        timestamp: Date.now()
      };
      
      // Extract and cache API key if available
      if (connections?.credentials?.apiKey) {
        this.setCachedApiKey(connections.credentials.apiKey);
      }
      
      return {
        isConnected: !!connections,
        credentials: connections || null,
        fromFallback: true
      };
    } catch (error) {
      console.error('Error in checkConnection:', error);
      // Return a structured error response
      return { 
        isConnected: false, 
        error: error.message || 'Failed to check connection status',
        details: error
      };
    }
  },

  async getCampaigns(apiKey: string) {
    try {
      console.log('Getting Lead Prosper campaigns...');
      
      // Cache the provided API key
      this.setCachedApiKey(apiKey);
      
      // Get auth header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found');
        throw new Error('Authentication required');
      }

      const { data, error } = await supabase.functions.invoke('lead-prosper-campaigns', {
        body: { apiKey },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) {
        console.error('Error fetching Lead Prosper campaigns:', error);
        throw error;
      }
      
      console.log(`Retrieved ${data.campaigns?.length || 0} campaigns`);
      return data.campaigns || [];
    } catch (error) {
      console.error('Error in getCampaigns:', error);
      throw new Error(`Failed to load Lead Prosper campaigns: ${error.message}`);
    }
  },

  async syncLeads(apiKey: string, lp_campaign_id: number, startDate: string, endDate: string) {
    const { data, error } = await supabase.functions.invoke('lead-prosper-sync', {
      body: {
        apiKey,
        lp_campaign_id,
        startDate,
        endDate,
        mode: 'sync'
      }
    });
    
    if (error) {
      console.error('Error syncing Lead Prosper leads:', error);
      throw error;
    }
    return data;
  },

  async backfillLeads(apiKey: string, lp_campaign_id: number, ts_campaign_id: string, startDate: string, endDate: string) {
    const { data, error } = await supabase.functions.invoke('lead-prosper-sync', {
      body: {
        apiKey,
        lp_campaign_id,
        ts_campaign_id,
        startDate,
        endDate,
        mode: 'backfill'
      }
    });
    
    if (error) {
      console.error('Error backfilling Lead Prosper leads:', error);
      throw error;
    }
    return data;
  },

  async createConnection(apiKey: string, name: string, userId: string) {
    try {
      console.log('Creating Lead Prosper connection...');
      
      // Cache the API key immediately
      this.setCachedApiKey(apiKey);
      
      const { data, error } = await supabase
        .from('account_connections')
        .insert([
          {
            name: name,
            platform: 'leadprosper',
            is_connected: true,
            user_id: userId,
            credentials: { apiKey }
          }
        ])
        .select()
        .single();
        
      if (error) {
        console.error('Error creating Lead Prosper connection:', error);
        throw error;
      }
      
      // Clear connection cache to force refresh on next check
      connectionStatusCache = null;
      
      console.log('Lead Prosper connection created successfully');
      return data;
    } catch (error) {
      console.error('Error in createConnection:', error);
      throw new Error(`Failed to create Lead Prosper connection: ${error.message}`);
    }
  },

  async updateConnection(id: string, apiKey: string, name: string) {
    try {
      console.log('Updating Lead Prosper connection...');
      
      // Cache the API key immediately
      this.setCachedApiKey(apiKey);
      
      const { data, error } = await supabase
        .from('account_connections')
        .update({
          name,
          credentials: { apiKey },
          last_synced: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (error) {
        console.error('Error updating Lead Prosper connection:', error);
        throw error;
      }
      
      // Clear connection cache to force refresh on next check
      connectionStatusCache = null;
      
      console.log('Lead Prosper connection updated successfully');
      return data;
    } catch (error) {
      console.error('Error in updateConnection:', error);
      throw new Error(`Failed to update Lead Prosper connection: ${error.message}`);
    }
  },

  async deleteConnection(id: string) {
    try {
      console.log('Deleting Lead Prosper connection...');
      
      const { error } = await supabase
        .from('account_connections')
        .delete()
        .eq('id', id);
        
      if (error) {
        console.error('Error deleting Lead Prosper connection:', error);
        throw error;
      }
      
      // Clear API key and connection cache
      this.setCachedApiKey(null);
      connectionStatusCache = null;
      
      console.log('Lead Prosper connection deleted successfully');
      return true;
    } catch (error) {
      console.error('Error in deleteConnection:', error);
      throw new Error(`Failed to delete Lead Prosper connection: ${error.message}`);
    }
  },

  async mapCampaign(ts_campaign_id: string, lp_campaign_id: string) {
    // First get the external LP campaign
    const { data: externalCampaign, error: externalCampaignError } = await supabase
      .from('external_lp_campaigns')
      .select('id')
      .eq('lp_campaign_id', parseInt(lp_campaign_id))
      .single();
      
    if (externalCampaignError) {
      console.error('Error getting external Lead Prosper campaign:', externalCampaignError);
      throw externalCampaignError;
    }

    // Create the mapping
    const { data, error } = await supabase
      .from('lp_to_ts_map')
      .insert([
        {
          ts_campaign_id,
          lp_campaign_id: externalCampaign.id,
          active: true,
          linked_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
      
    if (error) {
      console.error('Error mapping Lead Prosper campaign:', error);
      throw error;
    }
    return data;
  },

  async unmapCampaign(mappingId: string) {
    const { data, error } = await supabase
      .from('lp_to_ts_map')
      .update({
        active: false,
        unlinked_at: new Date().toISOString()
      })
      .eq('id', mappingId)
      .select()
      .single();
      
    if (error) {
      console.error('Error unmapping Lead Prosper campaign:', error);
      throw error;
    }
    return data;
  },

  async getExternalCampaigns() {
    const { data, error } = await supabase
      .from('external_lp_campaigns')
      .select('*');
      
    if (error) {
      console.error('Error getting external Lead Prosper campaigns:', error);
      throw error;
    }
    return data || [];
  },

  async getCampaignMappings(ts_campaign_id?: string) {
    let query = supabase
      .from('lp_to_ts_map')
      .select(`
        *,
        lp_campaign:external_lp_campaigns(*)
      `);
    
    if (ts_campaign_id) {
      query = query.eq('ts_campaign_id', ts_campaign_id);
    }
    
    const { data, error } = await query;
      
    if (error) {
      console.error('Error getting Lead Prosper mappings:', error);
      throw error;
    }
    return data || [];
  },

  async getDailyLeadMetrics(ts_campaign_id: string, startDate: string, endDate: string) {
    const { data, error } = await supabase
      .from('ts_daily_lead_metrics')
      .select('*')
      .eq('ts_campaign_id', ts_campaign_id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');
      
    if (error) {
      console.error('Error getting daily lead metrics:', error);
      throw error;
    }
    return data || [];
  },

  async getLeadProsperWebhookUrl() {
    return `${SUPABASE_PROJECT_URL}/functions/v1/lead-prosper-webhook`;
  }
};
