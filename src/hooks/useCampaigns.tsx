
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Campaign, StatHistoryEntry } from "@/types/campaign";
import { calculateMetrics } from "@/utils/campaignUtils";
import { toast } from "sonner";

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      console.log("Fetching campaigns without workspace filtering...");
      
      // Fetch campaigns without workspace filtering - admins see all data
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        throw campaignsError;
      }

      if (!campaignsData || campaignsData.length === 0) {
        console.log("No campaigns found");
        setCampaigns([]);
        return;
      }

      console.log(`Found ${campaignsData.length} campaigns`);

      // Fetch stats history for all campaigns without workspace filtering
      const campaignIds = campaignsData.map(c => c.id);
      const { data: statsData, error: statsError } = await supabase
        .from('campaign_stats_history')
        .select('*')
        .in('campaign_id', campaignIds)
        .order('date', { ascending: true });

      if (statsError) {
        console.error('Error fetching stats history:', statsError);
        throw statsError;
      }

      // Fetch manual stats without workspace filtering
      const { data: manualStatsData, error: manualStatsError } = await supabase
        .from('campaign_manual_stats')
        .select('*')
        .in('campaign_id', campaignIds);

      if (manualStatsError) {
        console.error('Error fetching manual stats:', manualStatsError);
        throw manualStatsError;
      }

      // Fetch targets without workspace filtering
      const { data: targetsData, error: targetsError } = await supabase
        .from('campaign_targets')
        .select('*')
        .in('campaign_id', campaignIds);

      if (targetsError) {
        console.error('Error fetching targets:', targetsError);
        throw targetsError;
      }

      // Group stats by campaign
      const campaignStatsMap = new Map<string, StatHistoryEntry[]>();
      if (statsData) {
        statsData.forEach(stat => {
          const campaignId = stat.campaign_id;
          if (!campaignStatsMap.has(campaignId)) {
            campaignStatsMap.set(campaignId, []);
          }
          
          campaignStatsMap.get(campaignId)!.push({
            id: stat.id,
            campaignId: stat.campaign_id,
            date: stat.date,
            leads: stat.leads || 0,
            cases: stat.cases || 0,
            revenue: stat.revenue || 0,
            adSpend: stat.ad_spend || 0
          });
        });
      }

      // Create manual stats map
      const manualStatsMap = new Map();
      if (manualStatsData) {
        manualStatsData.forEach(stat => {
          manualStatsMap.set(stat.campaign_id, {
            leads: stat.leads || 0,
            cases: stat.cases || 0,
            retainers: stat.retainers || 0,
            revenue: stat.revenue || 0
          });
        });
      }

      // Create targets map  
      const targetsMap = new Map();
      if (targetsData) {
        targetsData.forEach(target => {
          targetsMap.set(target.campaign_id, target);
        });
      }

      // Combine all data
      const enrichedCampaigns: Campaign[] = campaignsData.map(campaign => {
        const statsHistory = campaignStatsMap.get(campaign.id) || [];
        const manualStats = manualStatsMap.get(campaign.id) || {
          leads: 0,
          cases: 0,
          retainers: 0,
          revenue: 0
        };
        const targets = targetsMap.get(campaign.id);

        // Calculate total ad spend from stats history
        const totalAdSpend = statsHistory.reduce((sum, stat) => sum + (stat.adSpend || 0), 0);

        const enrichedCampaign: Campaign = {
          ...campaign,
          statsHistory,
          manualStats,
          targets,
          stats: { 
            impressions: 0,
            clicks: 0,
            conversions: 0,
            cost: totalAdSpend,
            ctr: 0,
            cpc: 0,
            conversionRate: 0,
            adSpend: totalAdSpend,
            averageCpc: 0
          }
        };

        // Calculate and cache metrics
        const metrics = calculateMetrics(enrichedCampaign);
        enrichedCampaign._metrics = metrics;

        return enrichedCampaign;
      });

      console.log(`Successfully processed ${enrichedCampaigns.length} campaigns with metrics`);
      setCampaigns(enrichedCampaigns);

    } catch (error) {
      console.error('Error in fetchCampaigns:', error);
      toast.error('Failed to fetch campaigns');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return { campaigns, loading, fetchCampaigns };
};
