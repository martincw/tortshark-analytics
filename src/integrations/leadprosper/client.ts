
import { supabase, SUPABASE_PROJECT_URL } from '../supabase/client';

// Cache for storing API key temporarily
let cachedApiKey: string | null = null;
let connectionStatusCache: { isConnected: boolean, timestamp: number, credentials: any } | null = null;
const CONNECTION_CACHE_TTL = 3 * 60 * 1000; // 3 minutes (reduced from 5 minutes)

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

  // Reset all Lead Prosper authentication state
  resetAuth(): void {
    console.log('Resetting Lead Prosper authentication state');
    cachedApiKey = null;
    connectionStatusCache = null;
    localStorage.removeItem('lp_api_key');
  },

  async checkConnection(forceRefresh = false) {
    try {
      console.log('Checking Lead Prosper connection...');
      
      // First try to use cache if it exists and is not expired and forceRefresh is false
      if (!forceRefresh && 
          connectionStatusCache && 
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
        this.resetAuth(); // Reset auth state if no session
        return { isConnected: false, error: 'Authentication required' };
      }

      // Try to fetch connection status from edge function
      try {
        console.log('Fetching connection status from edge function');
        const { data, error } = await supabase.functions.invoke('lead-prosper-auth', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        
        if (error) {
          console.error('Error checking Lead Prosper connection (edge function):', error);
          // Don't throw, continue with fallback below
        } else if (data) {
          // Update cache with edge function response
          connectionStatusCache = {
            isConnected: data.isConnected,
            credentials: data.credentials,
            timestamp: Date.now()
          };
          
          // If we have credentials with an API key, cache it
          if (data.isConnected && data.credentials?.credentials) {
            // Handle credentials stored as a string or as a JSON object
            const credentialsObj = typeof data.credentials.credentials === 'string' 
              ? JSON.parse(data.credentials.credentials) 
              : data.credentials.credentials;
              
            if (credentialsObj && typeof credentialsObj === 'object' && 'apiKey' in credentialsObj) {
              this.setCachedApiKey(credentialsObj.apiKey);
            }
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
        .order('updated_at', { ascending: false })
        .limit(1);
        
      if (dbError) {
        console.error('Error checking Lead Prosper connection (db fallback):', dbError);
        throw dbError;
      }

      if (!connections || connections.length === 0) {
        console.log('No active Lead Prosper connections found');
        // Clear cached API key since no connections found
        this.resetAuth();
        
        connectionStatusCache = {
          isConnected: false,
          credentials: null,
          timestamp: Date.now()
        };
        
        return {
          isConnected: false,
          credentials: null,
          fromFallback: true
        };
      }
      
      const mostRecentConnection = connections[0];
      
      // Update cache with database response
      connectionStatusCache = {
        isConnected: true,
        credentials: mostRecentConnection,
        timestamp: Date.now()
      };
      
      // Extract and cache API key if available
      if (mostRecentConnection.credentials) {
        // Handle credentials stored as a string or as a JSON object
        let credentialsObj;
        try {
          credentialsObj = typeof mostRecentConnection.credentials === 'string' 
            ? JSON.parse(mostRecentConnection.credentials) 
            : mostRecentConnection.credentials;
            
          if (credentialsObj && typeof credentialsObj === 'object' && 'apiKey' in credentialsObj) {
            this.setCachedApiKey(credentialsObj.apiKey);
          }
        } catch (parseError) {
          console.error('Failed to parse credentials:', parseError);
        }
      }
      
      return {
        isConnected: true,
        credentials: mostRecentConnection,
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
      
      // Clear any existing connection cache
      connectionStatusCache = null;
      
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
      
      console.log('Lead Prosper connection created successfully');
      return data;
    } catch (error) {
      console.error('Error in createConnection:', error);
      this.resetAuth(); // Reset on error
      throw new Error(`Failed to create Lead Prosper connection: ${error.message}`);
    }
  },

  async updateConnection(id: string, apiKey: string, name: string) {
    try {
      console.log('Updating Lead Prosper connection...');
      
      // Cache the API key immediately
      this.setCachedApiKey(apiKey);
      
      // Clear connection cache
      connectionStatusCache = null;
      
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
      
      // Reset auth state
      this.resetAuth();
      
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
