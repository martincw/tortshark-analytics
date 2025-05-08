import { supabase } from '../supabase/client';

// Create a simplified API client for Lead Prosper
export const leadProsperApi = {
  // Cache management
  _cache: {
    apiKey: null as string | null,
    campaigns: null as any[] | null,
    campaignsTimestamp: 0,
    connectionStatus: null as { isConnected: boolean, credentials: any } | null,
    connectionTimestamp: 0,
    verificationPending: false,
    lastAuthError: null as string | null
  },
  
  // Cache expiration times (in milliseconds)
  _cacheTTL: {
    campaigns: 5 * 60 * 1000, // 5 minutes
    connection: 2 * 60 * 1000  // 2 minutes
  },
  
  // Reset all state 
  resetState(): void {
    console.log('Resetting Lead Prosper client state');
    this._cache.apiKey = null;
    this._cache.campaigns = null;
    this._cache.campaignsTimestamp = 0;
    this._cache.connectionStatus = null;
    this._cache.connectionTimestamp = 0;
    this._cache.verificationPending = false;
    this._cache.lastAuthError = null;
    
    // Clear localStorage cache
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('lp_api_key');
    }
  },

  // Get/set the cached API key
  getCachedApiKey(): string | null {
    // First check memory cache
    if (this._cache.apiKey) {
      return this._cache.apiKey;
    }
    
    // Then check localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedKey = localStorage.getItem('lp_api_key');
      if (storedKey) {
        this._cache.apiKey = storedKey;
        return storedKey;
      }
    }
    
    return null;
  },
  
  setCachedApiKey(apiKey: string | null): void {
    this._cache.apiKey = apiKey;
    
    if (typeof window !== 'undefined' && window.localStorage) {
      if (apiKey) {
        localStorage.setItem('lp_api_key', apiKey);
      } else {
        localStorage.removeItem('lp_api_key');
      }
    }
  },

  // Verify an API key is valid - using simplified direct approach
  async verifyApiKey(apiKey: string): Promise<boolean> {
    try {
      console.log('Verifying Lead Prosper API key...');
      this._cache.verificationPending = true;
      
      // Basic validation
      if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
        console.error('Invalid API key format');
        return false;
      }
      
      // Call the verification endpoint - no auth required
      const { data, error } = await supabase.functions.invoke('lead-prosper-verify', {
        body: { apiKey }
      });
      
      if (error) {
        console.error('Error verifying API key:', error);
        return false;
      }
      
      if (!data.success) {
        console.error('API key verification failed:', data.error);
        return false;
      }
      
      console.log('API key verified successfully');
      return true;
    } catch (e) {
      console.error('Unexpected error during API key verification:', e);
      return false;
    } finally {
      this._cache.verificationPending = false;
    }
  },

  // Create or update a connection
  async saveConnection(apiKey: string, name: string, userId: string): Promise<any> {
    try {
      console.log('Saving Lead Prosper connection...');
      
      // Verify the API key first
      const isValid = await this.verifyApiKey(apiKey);
      if (!isValid) {
        throw new Error('Invalid API key. Verification failed.');
      }
      
      // Cache the API key immediately on successful verification
      this.setCachedApiKey(apiKey);
      
      // Check for existing connection
      const { data: existingConn, error: queryError } = await supabase
        .from('account_connections')
        .select('id')
        .eq('platform', 'leadprosper')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (queryError) {
        console.error('Error checking for existing connection:', queryError);
        throw new Error(`Database error: ${queryError.message}`);
      }
      
      let result;
      
      if (existingConn) {
        // Update existing connection
        const { data, error } = await supabase
          .from('account_connections')
          .update({
            name,
            is_connected: true,
            credentials: { apiKey },
            last_synced: new Date().toISOString()
          })
          .eq('id', existingConn.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Create new connection
        const { data, error } = await supabase
          .from('account_connections')
          .insert([{
            name,
            platform: 'leadprosper',
            is_connected: true,
            user_id: userId,
            credentials: { apiKey }
          }])
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }
      
      // Update connection cache
      this._cache.connectionStatus = {
        isConnected: true,
        credentials: result
      };
      this._cache.connectionTimestamp = Date.now();
      
      console.log('Lead Prosper connection saved successfully');
      return result;
    } catch (error) {
      console.error('Error saving Lead Prosper connection:', error);
      throw error;
    }
  },

  // Delete a connection
  async deleteConnection(id: string): Promise<boolean> {
    try {
      console.log('Deleting Lead Prosper connection...');
      
      const { error } = await supabase
        .from('account_connections')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // Reset the API state
      this.resetState();
      
      console.log('Lead Prosper connection deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting Lead Prosper connection:', error);
      throw error;
    }
  },

  // Check connection status with better error handling and fallbacks
  async checkConnection(forceRefresh = false): Promise<{
    isConnected: boolean;
    credentials?: any;
    error?: string;
    fromCache?: boolean;
  }> {
    try {
      // First try to use cache if it exists and is not expired and forceRefresh is false
      if (!forceRefresh && 
          this._cache.connectionStatus &&
          (Date.now() - this._cache.connectionTimestamp) < this._cacheTTL.connection) {
        console.log('Using cached connection status');
        return {
          ...this._cache.connectionStatus,
          fromCache: true
        };
      }

      console.log('Checking Lead Prosper connection...');
      
      // Get session manually to avoid authentication errors
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error('No active session found');
        this.resetState();
        this._cache.lastAuthError = 'Authentication required';
        return { 
          isConnected: false, 
          error: 'Authentication required. Please sign in.',
          credentials: null
        };
      }

      try {
        // First try the auth edge function
        const { data: authData, error: authError } = await supabase.functions.invoke('lead-prosper-auth', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        
        if (authError) {
          console.error('Error from lead-prosper-auth function:', authError);
          // Fall back to direct database query if edge function fails
        } else if (authData) {
          console.log('Successfully retrieved connection status from auth function');
          
          if (!authData.isConnected) {
            this._cache.connectionStatus = {
              isConnected: false,
              credentials: null
            };
            this._cache.connectionTimestamp = Date.now();
            
            return {
              isConnected: false,
              credentials: null
            };
          }
          
          // Update cache
          this._cache.connectionStatus = {
            isConnected: true,
            credentials: authData.credentials
          };
          this._cache.connectionTimestamp = Date.now();
          
          // Extract and cache API key if available
          if (authData.credentials?.credentials) {
            let credentialsObj;
            try {
              credentialsObj = typeof authData.credentials.credentials === 'string' 
                ? JSON.parse(authData.credentials.credentials) 
                : authData.credentials.credentials;
                
              if (credentialsObj && typeof credentialsObj === 'object' && 'apiKey' in credentialsObj) {
                this.setCachedApiKey(credentialsObj.apiKey);
              }
            } catch (parseError) {
              console.error('Failed to parse credentials:', parseError);
            }
          }
          
          return {
            isConnected: true,
            credentials: authData.credentials
          };
        }
      } catch (authFnError) {
        console.error('Auth function error:', authFnError);
        // Continue with direct database query as fallback
      }

      // Direct database query for connection status as fallback
      console.log('Querying database for connection status');
      const { data: connection, error: dbError } = await supabase
        .from('account_connections')
        .select('*')
        .eq('platform', 'leadprosper')
        .eq('is_connected', true)
        .maybeSingle();
        
      if (dbError) {
        console.error('Error checking Lead Prosper connection:', dbError);
        return { 
          isConnected: false, 
          error: `Database error: ${dbError.message}`,
          credentials: null
        };
      }

      if (!connection) {
        console.log('No active Lead Prosper connection found');
        this.resetState();
        
        this._cache.connectionStatus = {
          isConnected: false,
          credentials: null
        };
        this._cache.connectionTimestamp = Date.now();
        
        return {
          isConnected: false,
          credentials: null
        };
      }
      
      // Update cache with database response
      this._cache.connectionStatus = {
        isConnected: true,
        credentials: connection
      };
      this._cache.connectionTimestamp = Date.now();
      
      // Extract and cache API key if available
      if (connection.credentials) {
        // Handle credentials stored as a string or as a JSON object
        let credentialsObj;
        try {
          credentialsObj = typeof connection.credentials === 'string' 
            ? JSON.parse(connection.credentials) 
            : connection.credentials;
            
          if (credentialsObj && typeof credentialsObj === 'object' && 'apiKey' in credentialsObj) {
            this.setCachedApiKey(credentialsObj.apiKey);
          }
        } catch (parseError) {
          console.error('Failed to parse credentials:', parseError);
        }
      }
      
      console.log('Connection status retrieved successfully');
      return {
        isConnected: true,
        credentials: connection
      };
    } catch (error) {
      console.error('Error checking connection status:', error);
      return { 
        isConnected: false, 
        error: error.message || 'Failed to check connection status',
        credentials: null
      };
    }
  },

  // Get campaigns with simplified approach and better caching
  async getCampaigns(apiKey?: string): Promise<any[]> {
    try {
      console.log('Getting Lead Prosper campaigns...');
      
      // Use the provided API key or get it from cache
      const keyToUse = apiKey || this.getCachedApiKey();
      
      if (!keyToUse) {
        console.error('No API key available');
        throw new Error('No API key available. Please reconnect your Lead Prosper account.');
      }

      // Cache the provided API key if it's not already cached
      if (apiKey && apiKey !== this.getCachedApiKey()) {
        this.setCachedApiKey(apiKey);
      }
      
      // Check if we have a cached result that's not expired
      if (this._cache.campaigns && 
          (Date.now() - this._cache.campaignsTimestamp) < this._cacheTTL.campaigns) {
        console.log('Using cached campaigns data');
        return this._cache.campaigns;
      }

      // First try getting the session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      // Make API call to the Lead Prosper API using our edge function
      console.log('Making API request for campaigns data');
      
      const { data, error } = await supabase.functions.invoke('lead-prosper-campaigns', {
        body: { apiKey: keyToUse },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });
      
      if (error) {
        console.error('Error fetching Lead Prosper campaigns:', error);
        
        // If we have cached data and encounter an error, use the cached data as fallback
        if (this._cache.campaigns) {
          console.log('Using cached campaigns data as fallback after error');
          return this._cache.campaigns;
        }
        
        throw new Error(`Failed to fetch campaigns: ${error.message}`);
      }
      
      // Check if data exists and contains campaigns property
      if (!data) {
        console.error('Invalid response format: missing data');
        
        // Try using cached data as fallback
        if (this._cache.campaigns) {
          console.log('Using cached campaigns data as fallback after invalid response');
          return this._cache.campaigns;
        }
        
        throw new Error('Invalid response format: missing data');
      }
      
      // Handle both the direct array format (expected from API) and the wrapped format from our edge function
      let campaignsData;
      if (Array.isArray(data)) {
        console.log('Direct array response detected');
        campaignsData = data;
      } else if (data.campaigns && Array.isArray(data.campaigns)) {
        console.log('Wrapped campaigns property detected');
        campaignsData = data.campaigns;
      } else {
        console.error('Invalid response format: missing or invalid campaigns data');
        
        // Try using cached data as fallback
        if (this._cache.campaigns) {
          console.log('Using cached campaigns data as fallback after invalid format');
          return this._cache.campaigns;
        }
        
        throw new Error('Invalid response format: missing or invalid campaigns data');
      }
      
      // Update cache
      this._cache.campaigns = campaignsData;
      this._cache.campaignsTimestamp = Date.now();
      
      console.log(`Retrieved ${campaignsData.length} campaigns`);
      return campaignsData;
    } catch (error) {
      console.error('Error in getCampaigns:', error);
      
      // Last resort - if we have any cached data and it's better than nothing
      if (this._cache.campaigns) {
        console.log('Using stale cached campaigns data as last resort fallback');
        return this._cache.campaigns;
      }
      
      throw new Error(`Failed to load Lead Prosper campaigns: ${error.message}`);
    }
  },

  // Map campaign
  async mapCampaign(ts_campaign_id: string, lp_campaign_id: string): Promise<any> {
    try {
      // First get the external LP campaign
      const { data: externalCampaign, error: externalCampaignError } = await supabase
        .from('external_lp_campaigns')
        .select('id')
        .eq('lp_campaign_id', parseInt(lp_campaign_id))
        .maybeSingle();
        
      if (externalCampaignError) {
        console.error('Error getting external Lead Prosper campaign:', externalCampaignError);
        throw externalCampaignError;
      }
      
      if (!externalCampaign) {
        console.error('No external campaign found with ID:', lp_campaign_id);
        throw new Error(`No external campaign found with ID: ${lp_campaign_id}`);
      }

      // Create the mapping
      const { data, error } = await supabase
        .from('lp_to_ts_map')
        .insert([{
          ts_campaign_id,
          lp_campaign_id: externalCampaign.id,
          active: true,
          linked_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (error) {
        console.error('Error mapping Lead Prosper campaign:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error in mapCampaign:', error);
      throw error;
    }
  },

  // Unmap campaign
  async unmapCampaign(mappingId: string): Promise<any> {
    try {
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
    } catch (error) {
      console.error('Error in unmapCampaign:', error);
      throw error;
    }
  },

  // Get campaign mappings
  async getCampaignMappings(ts_campaign_id?: string): Promise<any[]> {
    try {
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
    } catch (error) {
      console.error('Error in getCampaignMappings:', error);
      throw error;
    }
  },

  // Get lead metrics
  async getDailyLeadMetrics(ts_campaign_id: string, startDate: string, endDate: string): Promise<any[]> {
    try {
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
    } catch (error) {
      console.error('Error in getDailyLeadMetrics:', error);
      throw error;
    }
  },

  // Get the webhook URL
  async getLeadProsperWebhookUrl(): Promise<string> {
    const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL || "";
    const baseUrl = SUPABASE_PROJECT_URL.replace('.supabase.co', '');
    return `${baseUrl}/functions/v1/lead-prosper-webhook`;
  },

  // Test connection
  async testConnection(apiKey: string): Promise<boolean> {
    try {
      await this.verifyApiKey(apiKey);
      return true;
    } catch {
      return false;
    }
  },

  // Backfill leads from Lead Prosper
  async backfillLeads(
    apiKey: string,
    lp_campaign_id: number,
    ts_campaign_id: string,
    startDate: string,
    endDate: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Starting Lead Prosper backfill process...');
      console.log(`Campaign: LP ID ${lp_campaign_id} -> TS ID ${ts_campaign_id}`);
      console.log(`Date range: ${startDate} to ${endDate}`);
      
      if (!apiKey) {
        const cachedKey = this.getCachedApiKey();
        if (!cachedKey) {
          throw new Error('No API key provided or found in cache');
        }
        apiKey = cachedKey;
      }
      
      // Get current session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call the sync edge function with backfill mode
      const { data, error } = await supabase.functions.invoke('lead-prosper-sync', {
        body: {
          apiKey,
          lp_campaign_id,
          ts_campaign_id,
          startDate,
          endDate,
          mode: 'backfill'
        },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });
      
      if (error) {
        console.error('Error during Lead Prosper backfill:', error);
        return { 
          success: false, 
          error: `Failed to backfill leads: ${error.message || 'Unknown error'}`
        };
      }
      
      if (!data?.success) {
        console.error('Backfill process returned an error:', data?.error);
        return { 
          success: false, 
          error: data?.error || 'Backfill process failed without specific error message'
        };
      }
      
      console.log('Lead Prosper backfill completed successfully');
      return {
        success: true
      };
      
    } catch (error) {
      console.error('Unexpected error during backfill process:', error);
      return { 
        success: false, 
        error: error.message || 'An unexpected error occurred during backfill'
      };
    }
  },
  
  // New method to fetch today's leads for all mapped campaigns
  async fetchTodayLeads(): Promise<{ success: boolean; total_leads: number; campaigns_processed: number; results: any[]; error?: string }> {
    try {
      console.log('Fetching today\'s leads for all mapped campaigns');
      
      // Get API key
      const apiKey = this.getCachedApiKey();
      if (!apiKey) {
        const connectionData = await this.checkConnection();
        if (!connectionData.isConnected) {
          throw new Error('No active Lead Prosper connection found');
        }
        
        if (connectionData.credentials?.credentials) {
          const credentials = typeof connectionData.credentials.credentials === 'string' 
            ? JSON.parse(connectionData.credentials.credentials) 
            : connectionData.credentials.credentials;
            
          if (!credentials?.apiKey) {
            throw new Error('API key not found in connection credentials');
          }
        }
      }
      
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();
      
      // Call the fetch-today edge function with the API key
      const { data, error } = await supabase.functions.invoke('lead-prosper-fetch-today', {
        body: { apiKey: apiKey },
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });
      
      if (error) {
        console.error('Error fetching today\'s leads:', error);
        return { 
          success: false, 
          total_leads: 0,
          campaigns_processed: 0,
          results: [],
          error: error.message
        };
      }
      
      console.log(`Successfully fetched ${data.total_leads} leads from ${data.campaigns_processed} campaigns`);
      return data;
      
    } catch (error) {
      console.error('Error in fetchTodayLeads:', error);
      return { 
        success: false, 
        total_leads: 0,
        campaigns_processed: 0,
        results: [],
        error: error.message
      };
    }
  },
  
  // Fetch detailed leads with pagination and filtering
  async getLeadsList(options: {
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
    ts_campaign_id?: string;
    status?: string;
  } = {}): Promise<{
    leads: any[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const {
        page = 1,
        pageSize = 20,
        startDate,
        endDate,
        ts_campaign_id,
        status
      } = options;
      
      let query = supabase
        .from('lp_leads_raw')
        .select('*, campaign:ts_campaign_id(id, name)', { count: 'exact' });
      
      // Apply filters
      if (ts_campaign_id) {
        query = query.eq('ts_campaign_id', ts_campaign_id);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      if (startDate) {
        // Convert lead_date_ms to date for comparison
        const startTimestamp = new Date(startDate).getTime();
        query = query.gte('lead_date_ms', startTimestamp);
      }
      
      if (endDate) {
        // Add one day to include the end date fully
        const endDateObj = new Date(endDate);
        endDateObj.setDate(endDateObj.getDate() + 1);
        const endTimestamp = endDateObj.getTime();
        query = query.lt('lead_date_ms', endTimestamp);
      }
      
      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      query = query
        .order('lead_date_ms', { ascending: false })
        .range(from, to);
      
      const { data, error, count } = await query;
      
      if (error) {
        console.error('Error fetching leads:', error);
        throw error;
      }
      
      return {
        leads: data || [],
        total: count || 0,
        page,
        pageSize
      };
    } catch (error) {
      console.error('Error in getLeadsList:', error);
      throw error;
    }
  }
};
