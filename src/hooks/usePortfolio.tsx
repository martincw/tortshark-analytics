import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCampaign } from "@/contexts/CampaignContext";

export interface CampaignPortfolio {
  campaignId: string;
  campaignName: string;
  totalCases: number;
  totalValue: number; // NAV
  settlementValue: number;
  hasSettlementSetting: boolean;
  isEnabled: boolean;
}

export interface PortfolioSummary {
  totalCases: number;
  totalNAV: number;
  avgSettlement: number;
  campaignCount: number;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export const usePortfolio = () => {
  const [portfolioData, setPortfolioData] = useState<CampaignPortfolio[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalCases: 0,
    totalNAV: 0,
    avgSettlement: 0,
    campaignCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const { toast } = useToast();
  const { currentWorkspace } = useWorkspace();
  const { campaigns } = useCampaign();

  const calculateSummary = useCallback((data: CampaignPortfolio[]) => {
    const enabledData = data.filter(item => item.isEnabled);
    const totalCases = enabledData.reduce((sum, item) => sum + item.totalCases, 0);
    const totalNAV = enabledData.reduce((sum, item) => sum + item.totalValue, 0);
    const settlementsWithValue = enabledData.filter(item => item.settlementValue > 0);
    const avgSettlement = settlementsWithValue.length > 0
      ? settlementsWithValue.reduce((sum, item) => sum + item.settlementValue, 0) / settlementsWithValue.length
      : 0;

    setSummary({
      totalCases,
      totalNAV,
      avgSettlement,
      campaignCount: enabledData.length,
    });
  }, []);

  const fetchPortfolioData = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    
    try {
      setIsLoading(true);

      // Fetch backend case stats with date filter
      let caseStatsQuery = supabase
        .from('backend_case_stats')
        .select(`
          campaign_id,
          case_count,
          total_value,
          date
        `)
        .eq('workspace_id', currentWorkspace.id);

      if (dateRange.from) {
        caseStatsQuery = caseStatsQuery.gte('date', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange.to) {
        caseStatsQuery = caseStatsQuery.lte('date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data: caseStats, error: caseError } = await caseStatsQuery;

      if (caseError) {
        console.error('Error fetching case stats:', caseError);
        throw caseError;
      }

      // Fetch portfolio settings (settlement values and enabled status)
      const { data: portfolioSettings, error: settingsError } = await supabase
        .from('campaign_portfolio_settings')
        .select('campaign_id, settlement_value, is_enabled')
        .eq('workspace_id', currentWorkspace.id);

      if (settingsError) {
        console.error('Error fetching portfolio settings:', settingsError);
        // Continue without settings - they might not exist yet
      }

      // Create settings map
      const settingsMap = new Map<string, { settlement: number; enabled: boolean }>();
      portfolioSettings?.forEach(setting => {
        settingsMap.set(setting.campaign_id, {
          settlement: setting.settlement_value || 0,
          enabled: setting.is_enabled !== false, // Default to true
        });
      });

      // Aggregate case stats by campaign
      const caseAggregates = new Map<string, { cases: number; value: number }>();
      caseStats?.forEach(stat => {
        const campaignId = stat.campaign_id;
        if (caseAggregates.has(campaignId)) {
          const existing = caseAggregates.get(campaignId)!;
          existing.cases += stat.case_count;
          existing.value += stat.total_value || 0;
        } else {
          caseAggregates.set(campaignId, {
            cases: stat.case_count,
            value: stat.total_value || 0,
          });
        }
      });

      // Build portfolio data from ALL campaigns
      const portfolioItems: CampaignPortfolio[] = campaigns.map(campaign => {
        const caseData = caseAggregates.get(campaign.id) || { cases: 0, value: 0 };
        const settings = settingsMap.get(campaign.id);
        
        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          totalCases: caseData.cases,
          totalValue: caseData.value,
          settlementValue: settings?.settlement || 0,
          hasSettlementSetting: settingsMap.has(campaign.id),
          isEnabled: settings?.enabled !== false, // Default to enabled
        };
      });

      // Sort: enabled first, then by NAV descending
      portfolioItems.sort((a, b) => {
        if (a.isEnabled !== b.isEnabled) return a.isEnabled ? -1 : 1;
        return b.totalValue - a.totalValue;
      });

      setPortfolioData(portfolioItems);
      calculateSummary(portfolioItems);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to load portfolio data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id, dateRange, campaigns, toast, calculateSummary]);

  const updateSettlementValue = async (campaignId: string, value: number) => {
    if (!currentWorkspace?.id) return;

    try {
      const existingSetting = portfolioData.find(p => p.campaignId === campaignId);
      
      // Upsert the settlement value
      const { error } = await supabase
        .from('campaign_portfolio_settings')
        .upsert({
          campaign_id: campaignId,
          settlement_value: value,
          is_enabled: existingSetting?.isEnabled !== false,
          workspace_id: currentWorkspace.id,
        }, {
          onConflict: 'campaign_id',
        });

      if (error) throw error;

      // Update local state
      const updatedData = portfolioData.map(item => 
        item.campaignId === campaignId 
          ? { ...item, settlementValue: value, hasSettlementSetting: true }
          : item
      );
      setPortfolioData(updatedData);
      calculateSummary(updatedData);

      toast({
        title: "Updated",
        description: "Settlement value saved.",
      });
    } catch (error) {
      console.error('Error updating settlement value:', error);
      toast({
        title: "Error",
        description: "Failed to update settlement value.",
        variant: "destructive",
      });
    }
  };

  const toggleCampaignEnabled = async (campaignId: string, enabled: boolean) => {
    if (!currentWorkspace?.id) return;

    try {
      const existingSetting = portfolioData.find(p => p.campaignId === campaignId);
      
      // Upsert the enabled status
      const { error } = await supabase
        .from('campaign_portfolio_settings')
        .upsert({
          campaign_id: campaignId,
          settlement_value: existingSetting?.settlementValue || 0,
          is_enabled: enabled,
          workspace_id: currentWorkspace.id,
        }, {
          onConflict: 'campaign_id',
        });

      if (error) throw error;

      // Update local state
      const updatedData = portfolioData.map(item => 
        item.campaignId === campaignId 
          ? { ...item, isEnabled: enabled, hasSettlementSetting: true }
          : item
      );
      
      // Re-sort: enabled first
      updatedData.sort((a, b) => {
        if (a.isEnabled !== b.isEnabled) return a.isEnabled ? -1 : 1;
        return b.totalValue - a.totalValue;
      });
      
      setPortfolioData(updatedData);
      calculateSummary(updatedData);

      toast({
        title: enabled ? "Activated" : "Deactivated",
        description: `Campaign ${enabled ? 'added to' : 'removed from'} portfolio.`,
      });
    } catch (error) {
      console.error('Error toggling campaign:', error);
      toast({
        title: "Error",
        description: "Failed to update campaign status.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (campaigns.length > 0) {
      fetchPortfolioData();
    }
  }, [fetchPortfolioData, campaigns.length]);

  return {
    portfolioData,
    summary,
    isLoading,
    dateRange,
    setDateRange,
    fetchPortfolioData,
    updateSettlementValue,
    toggleCampaignEnabled,
  };
};
