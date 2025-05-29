import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LeadProsperConnection {
  id: string;
  apiKey: string;
  isConnected: boolean;
  lastSynced?: string;
}

interface LeadProsperCampaign {
  id: number;
  name: string;
  status: string;
}

interface LeadProsperMapping {
  id: string;
  lp_campaign_id: string;
  ts_campaign_id: string;
  active: boolean;
  linked_at: string;
  lp_campaign?: {
    name: string;
    lp_campaign_id: number;
  };
}

interface LeadProsperSyncResult {
  success: boolean;
  total_leads: number;
  campaigns_processed: number;
  error?: string;
  debug_info?: any[];
  results?: any[];
}

interface ConnectionCheckResult {
  isConnected: boolean;
  credentials?: any;
  error?: string;
  apiKey?: string;
  fromCache?: boolean;
}

class LeadProsperApiClient {
  private cachedApiKey: string | null = null;
  
  setCachedApiKey(apiKey: string | null) {
    this.cachedApiKey = apiKey;
  }
  
  getCachedApiKey(): string | null {
    return this.cachedApiKey;
  }
  
  resetState() {
    this.cachedApiKey = null;
  }

  getLeadProsperWebhookUrl(): string {
    return `https://msgqsgftjwpbnqenhfmc.supabase.co/functions/v1/lead-prosper-webhook`;
  }

  async verifyApiKey(apiKey: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('lead-prosper-verify', {
        body: { apiKey }
      });

      if (error) {
        console.error("API key verification error:", error);
        return false;
      }

      return data?.isValid || false;
    } catch (error) {
      console.error("Error in verifyApiKey:", error);
      return false;
    }
  }

  async storeCredentials(apiKey: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('account_connections')
        .upsert({
          user_id: userId,
          platform: 'leadprosper',
          name: 'Lead Prosper',
          is_connected: true,
          credentials: { apiKey },
          last_synced: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        });

      if (error) {
        console.error("Error storing credentials:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in storeCredentials:", error);
      return false;
    }
  }

  async checkConnection(skipCache = false): Promise<ConnectionCheckResult> {
    try {
      console.log("Checking Lead Prosper connection...");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user found");
        return { isConnected: false };
      }

      // Check for existing connection in database
      const { data: connections, error } = await supabase
        .from('account_connections')
        .select('*')
        .eq('platform', 'leadprosper')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error checking connection:", error);
        return { isConnected: false, error: error.message };
      }

      if (connections && connections.length > 0) {
        const connection = connections[0];
        console.log("Found existing Lead Prosper connection");
        
        // Extract API key from credentials
        let apiKey = '';
        if (connection.credentials) {
          const credentials = typeof connection.credentials === 'string' 
            ? JSON.parse(connection.credentials) 
            : connection.credentials;
          apiKey = credentials?.apiKey || '';
        }
        
        // Cache the API key if not cached
        if (!this.cachedApiKey && apiKey) {
          this.cachedApiKey = apiKey;
        }
        
        return { 
          isConnected: true, 
          credentials: connection,
          apiKey,
          fromCache: !skipCache
        };
      }

      console.log("No Lead Prosper connection found");
      return { isConnected: false };
    } catch (error) {
      console.error("Error in checkConnection:", error);
      return { isConnected: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async saveConnection(apiKey: string, connectionName: string, userId: string): Promise<any> {
    try {
      console.log("Saving Lead Prosper connection...");
      
      const { data, error } = await supabase
        .from('account_connections')
        .upsert({
          user_id: userId,
          platform: 'leadprosper',
          name: connectionName,
          is_connected: true,
          credentials: { apiKey },
          last_synced: new Date().toISOString()
        }, {
          onConflict: 'user_id,platform'
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving connection:", error);
        throw error;
      }

      console.log("Lead Prosper connection saved successfully");
      return data;
    } catch (error) {
      console.error("Error in saveConnection:", error);
      throw error;
    }
  }

  async deleteConnection(connectionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('account_connections')
        .delete()
        .eq('id', connectionId);

      if (error) {
        console.error("Error deleting connection:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error in deleteConnection:", error);
      return false;
    }
  }

  async fetchCampaigns(): Promise<LeadProsperCampaign[]> {
    try {
      console.log("Fetching Lead Prosper campaigns...");
      
      // Get API key from connection
      const { isConnected, credentials } = await this.checkConnection();
      if (!isConnected || !credentials?.credentials) {
        throw new Error("No valid Lead Prosper connection found");
      }

      const credentialsData = typeof credentials.credentials === 'string' 
        ? JSON.parse(credentials.credentials) 
        : credentials.credentials;
      const apiKey = credentialsData?.apiKey;

      if (!apiKey) {
        throw new Error("No API key found in credentials");
      }

      // Call the edge function to fetch campaigns
      const { data, error } = await supabase.functions.invoke('lead-prosper-campaigns', {
        body: { apiKey }
      });

      if (error) {
        console.error("Error calling edge function:", error);
        throw new Error(`Failed to fetch campaigns: ${error.message}`);
      }

      if (!data.authenticated) {
        throw new Error("Authentication failed");
      }

      console.log(`Successfully fetched ${data.campaigns?.length || 0} campaigns`);
      return data.campaigns || [];
    } catch (error) {
      console.error("Error in fetchCampaigns:", error);
      throw error;
    }
  }

  async getCampaignMappings(tsCampaignId: string): Promise<LeadProsperMapping[]> {
    try {
      console.log(`Getting campaign mappings for TS campaign: ${tsCampaignId}`);
      
      const { data, error } = await supabase
        .from('lp_to_ts_map')
        .select(`
          id,
          lp_campaign_id,
          ts_campaign_id,
          active,
          linked_at,
          lp_campaign:external_lp_campaigns!inner(
            name,
            lp_campaign_id
          )
        `)
        .eq('ts_campaign_id', tsCampaignId);

      if (error) {
        console.error("Error fetching mappings:", error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} mappings`);
      return data || [];
    } catch (error) {
      console.error("Error in getCampaignMappings:", error);
      throw error;
    }
  }

  async createCampaignMapping(lpCampaignId: string, tsCampaignId: string): Promise<boolean> {
    try {
      console.log(`Creating mapping: LP ${lpCampaignId} -> TS ${tsCampaignId}`);
      
      // First, deactivate any existing mappings for this TS campaign
      await supabase
        .from('lp_to_ts_map')
        .update({ active: false, unlinked_at: new Date().toISOString() })
        .eq('ts_campaign_id', tsCampaignId)
        .eq('active', true);

      // Create new mapping
      const { error } = await supabase
        .from('lp_to_ts_map')
        .insert({
          lp_campaign_id: lpCampaignId,
          ts_campaign_id: tsCampaignId,
          active: true,
          linked_at: new Date().toISOString()
        });

      if (error) {
        console.error("Error creating mapping:", error);
        throw error;
      }

      console.log("Mapping created successfully");
      return true;
    } catch (error) {
      console.error("Error in createCampaignMapping:", error);
      throw error;
    }
  }

  async mapCampaign(tsCampaignId: string, lpCampaignId: number): Promise<void> {
    try {
      // Find the external campaign UUID for the selected LP campaign ID
      const { data: externalCampaigns, error: fetchError } = await supabase
        .from('external_lp_campaigns')
        .select('id')
        .eq('lp_campaign_id', lpCampaignId)
        .single();

      if (fetchError || !externalCampaigns) {
        throw new Error("Lead Prosper campaign not found in database");
      }

      await this.createCampaignMapping(externalCampaigns.id, tsCampaignId);
    } catch (error) {
      console.error("Error in mapCampaign:", error);
      throw error;
    }
  }

  async getAccountConnections(): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('account_connections')
        .select('*')
        .eq('platform', 'leadprosper')
        .eq('user_id', user.id)
        .eq('is_connected', true);

      if (error) {
        console.error("Error fetching account connections:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Error in getAccountConnections:", error);
      return [];
    }
  }

  async fetchLeadsWithDateRange(startDate?: string, endDate?: string): Promise<LeadProsperSyncResult> {
    try {
      console.log("Fetching leads from Lead Prosper with date range...");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const body: any = { user_id: user.id };
      
      if (startDate) {
        body.start_date = startDate;
      }
      if (endDate) {
        body.end_date = endDate;
      }

      console.log("Calling fetch-today function with:", body);

      const { data, error } = await supabase.functions.invoke('lead-prosper-fetch-today', {
        body
      });

      if (error) {
        console.error("Error calling fetch-today function:", error);
        throw new Error(`Failed to fetch leads: ${error.message}`);
      }

      console.log("Lead fetch completed:", data);
      return data;
    } catch (error) {
      console.error("Error in fetchLeadsWithDateRange:", error);
      throw error;
    }
  }

  async fetchTodayLeads(): Promise<LeadProsperSyncResult> {
    return this.fetchLeadsWithDateRange();
  }

  async getLeadsList(params: {
    page: number;
    pageSize: number;
    ts_campaign_id: string;
    status?: string;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ leads: any[]; total: number }> {
    try {
      console.log("Fetching leads list with params:", params);
      
      let query = supabase
        .from('lp_leads_raw')
        .select('*', { count: 'exact' })
        .eq('ts_campaign_id', params.ts_campaign_id);

      // Apply filters
      if (params.status) {
        query = query.eq('status', params.status);
      }

      if (params.startDate) {
        const startMs = new Date(params.startDate).getTime();
        query = query.gte('lead_date_ms', startMs);
      }

      if (params.endDate) {
        const endMs = new Date(params.endDate + 'T23:59:59').getTime();
        query = query.lte('lead_date_ms', endMs);
      }

      if (params.searchTerm) {
        query = query.ilike('id', `%${params.searchTerm}%`);
      }

      // Apply pagination
      const from = (params.page - 1) * params.pageSize;
      const to = from + params.pageSize - 1;
      
      query = query
        .order('lead_date_ms', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching leads:", error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} leads (total: ${count})`);
      return {
        leads: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error("Error in getLeadsList:", error);
      throw error;
    }
  }

  async getAllLeadsList(params: {
    page: number;
    pageSize: number;
    status?: string;
    searchTerm?: string;
    startDate?: string;
    endDate?: string;
    mappingStatus?: 'all' | 'mapped' | 'unmapped';
  }): Promise<{ leads: any[]; total: number }> {
    try {
      console.log("Fetching all leads list with params:", params);
      
      let query = supabase
        .from('lp_leads_raw')
        .select(`
          *,
          lp_to_ts_map!inner(
            ts_campaign_id,
            active,
            campaigns!inner(name)
          ),
          external_lp_campaigns!inner(
            name,
            lp_campaign_id
          )
        `, { count: 'exact' });

      // Apply status filter
      if (params.status && params.status !== 'all') {
        query = query.eq('status', params.status);
      }

      // Apply date filters
      if (params.startDate) {
        const startMs = new Date(params.startDate).getTime();
        query = query.gte('lead_date_ms', startMs);
      }

      if (params.endDate) {
        const endMs = new Date(params.endDate + 'T23:59:59').getTime();
        query = query.lte('lead_date_ms', endMs);
      }

      // Apply search filter
      if (params.searchTerm) {
        query = query.ilike('id', `%${params.searchTerm}%`);
      }

      // Apply pagination
      const from = (params.page - 1) * params.pageSize;
      const to = from + params.pageSize - 1;
      
      query = query
        .order('lead_date_ms', { ascending: false })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching all leads:", error);
        throw error;
      }

      // Process leads to add mapping information
      const processedLeads = (data || []).map(lead => ({
        ...lead,
        mapped_campaign_name: lead.lp_to_ts_map?.[0]?.campaigns?.name || null,
        lp_campaign_name: lead.external_lp_campaigns?.name || `Campaign ${lead.lp_campaign_id}`,
        is_mapped: !!lead.lp_to_ts_map?.[0]?.active
      }));

      // Filter by mapping status if requested
      let filteredLeads = processedLeads;
      if (params.mappingStatus === 'mapped') {
        filteredLeads = processedLeads.filter(lead => lead.is_mapped);
      } else if (params.mappingStatus === 'unmapped') {
        filteredLeads = processedLeads.filter(lead => !lead.is_mapped);
      }

      console.log(`Fetched ${filteredLeads.length} leads (total: ${count})`);
      return {
        leads: filteredLeads,
        total: params.mappingStatus !== 'all' ? filteredLeads.length : count || 0
      };
    } catch (error) {
      console.error("Error in getAllLeadsList:", error);
      throw error;
    }
  }
}

export const leadProsperApi = new LeadProsperApiClient();
