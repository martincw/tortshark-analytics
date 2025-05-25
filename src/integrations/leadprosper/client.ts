
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
}

class LeadProsperApiClient {
  private cachedApiKey: string | null = null;
  
  setCachedApiKey(apiKey: string) {
    this.cachedApiKey = apiKey;
  }
  
  resetState() {
    this.cachedApiKey = null;
  }

  async checkConnection(skipCache = false): Promise<{ isConnected: boolean; credentials?: any }> {
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
        return { isConnected: false };
      }

      if (connections && connections.length > 0) {
        const connection = connections[0];
        console.log("Found existing Lead Prosper connection");
        
        // Cache the API key if not cached
        if (!this.cachedApiKey && connection.credentials?.apiKey) {
          this.cachedApiKey = connection.credentials.apiKey;
        }
        
        return { 
          isConnected: true, 
          credentials: connection 
        };
      }

      console.log("No Lead Prosper connection found");
      return { isConnected: false };
    } catch (error) {
      console.error("Error in checkConnection:", error);
      return { isConnected: false };
    }
  }

  async saveConnection(apiKey: string, platform: string, userId: string): Promise<boolean> {
    try {
      console.log("Saving Lead Prosper connection...");
      
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
        console.error("Error saving connection:", error);
        return false;
      }

      console.log("Lead Prosper connection saved successfully");
      return true;
    } catch (error) {
      console.error("Error in saveConnection:", error);
      return false;
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
      if (!isConnected || !credentials?.credentials?.apiKey) {
        throw new Error("No valid Lead Prosper connection found");
      }

      const apiKey = credentials.credentials.apiKey;

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

  async fetchTodayLeads(): Promise<LeadProsperSyncResult> {
    try {
      console.log("Fetching today's leads from Lead Prosper...");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase.functions.invoke('lead-prosper-fetch-today', {
        body: { user_id: user.id }
      });

      if (error) {
        console.error("Error calling fetch-today function:", error);
        throw new Error(`Failed to fetch leads: ${error.message}`);
      }

      console.log("Today's leads fetch completed:", data);
      return data;
    } catch (error) {
      console.error("Error in fetchTodayLeads:", error);
      throw error;
    }
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
}

export const leadProsperApi = new LeadProsperApiClient();
