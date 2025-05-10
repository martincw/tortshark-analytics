import { supabase } from "@/integrations/supabase/client";

interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
}

interface CampaignMapping {
  id: string;
  tortshark_campaign_id: string;
  google_account_id: string;
  google_campaign_id: string;
  google_campaign_name: string;
  is_active: boolean;
  last_synced: string | null;
}

export const campaignMappingService = {
  async listAvailableCampaigns(accountId: string): Promise<GoogleCampaign[]> {
    try {
      const { data, error } = await supabase.functions.invoke("google-ads-mapping", {
        body: { 
          action: "list-available-campaigns",
          googleAccountId: accountId
        }
      });

      if (error) throw error;
      return data.campaigns || [];
    } catch (error) {
      console.error("Error listing available campaigns:", error);
      throw error;
    }
  },

  async getMappingsForCampaign(campaignId: string): Promise<CampaignMapping[]> {
    try {
      const { data, error } = await supabase
        .from("campaign_ad_mappings")
        .select("*")
        .eq("tortshark_campaign_id", campaignId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error getting campaign mappings:", error);
      throw error;
    }
  },

  async createMapping(
    tortsharkCampaignId: string, 
    googleAccountId: string, 
    googleCampaignId: string,
    googleCampaignName: string
  ): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke("google-ads-mapping", {
        body: { 
          action: "create-mapping",
          tortsharkCampaignId,
          googleAccountId,
          googleCampaignId,
          googleCampaignName
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error creating campaign mapping:", error);
      throw error;
    }
  },

  async deleteMapping(
    tortsharkCampaignId: string,
    googleAccountId: string,
    googleCampaignId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke("google-ads-mapping", {
        body: { 
          action: "delete-mapping",
          tortsharkCampaignId,
          googleAccountId,
          googleCampaignId
        }
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting campaign mapping:", error);
      throw error;
    }
  }
};
