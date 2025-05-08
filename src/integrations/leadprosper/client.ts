
// Create a basic client for interacting with Lead Prosper API
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LeadProsperCredentials {
  apiKey?: string;
  isConnected: boolean;
}

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

      return {
        apiKey: tokens?.access_token,
        isConnected: !!tokens?.access_token,
      };
    } catch (error) {
      console.error('Error in getApiCredentials:', error);
      return { isConnected: false };
    }
  },

  // Check if connected to Lead Prosper
  async checkConnection(): Promise<LeadProsperCredentials> {
    return this.getApiCredentials();
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
      return true;
    } catch (error) {
      console.error('Error removing Lead Prosper credentials:', error);
      return false;
    }
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

  // Map Lead Prosper campaign to Tortshark campaign
  async mapCampaign(lpCampaignId: number, tsCampaignId: string): Promise<boolean> {
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
  async unmapCampaign(tsCampaignId: string, lpCampaignId: string): Promise<boolean> {
    try {
      // Find the mapping
      const { error } = await supabase
        .from('lp_to_ts_map')
        .delete()
        .eq('ts_campaign_id', tsCampaignId)
        .eq('lp_campaign_id', lpCampaignId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unmapping Lead Prosper campaign:', error);
      throw error;
    }
  },

  // Get mapped campaigns for a specific Tortshark campaign
  async getMappedCampaigns(tsCampaignId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('lp_to_ts_map')
        .select(`
          id, 
          active,
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
