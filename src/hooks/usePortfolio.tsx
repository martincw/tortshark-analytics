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
  splitPercentage: number;
  yourShare: number; // settlement × split %
  hasSettlementSetting: boolean;
  isEnabled: boolean;
}

export interface PortfolioSummary {
  totalCases: number;
  totalNAV: number;
  avgSettlement: number;
  avgSplit: number;
  projectedValue: number; // Sum of (cases × settlement × split)
  campaignCount: number;
}

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface PortfolioSetting {
  campaign_id: string;
  settlement_value: number;
  split_percentage?: number;
  is_enabled?: boolean;
}

export const usePortfolio = () => {
  const [portfolioData, setPortfolioData] = useState<CampaignPortfolio[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalCases: 0,
    totalNAV: 0,
    avgSettlement: 0,
    avgSplit: 0,
    projectedValue: 0,
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
    
    const avgSplit = settlementsWithValue.length > 0
      ? settlementsWithValue.reduce((sum, item) => sum + item.splitPercentage, 0) / settlementsWithValue.length
      : 0;
    
    // Projected value = sum of (cases × settlement × split%)
    const projectedValue = enabledData.reduce((sum, item) => {
      if (item.settlementValue > 0) {
        return sum + (item.totalCases * item.settlementValue * (item.splitPercentage / 100));
      }
      return sum;
    }, 0);

    setSummary({
      totalCases,
      totalNAV,
      avgSettlement,
      avgSplit,
      projectedValue,
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

      // Fetch portfolio settings - include is_enabled
      const { data: portfolioSettings, error: settingsError } = await supabase
        .from('campaign_portfolio_settings')
        .select('*')
        .eq('workspace_id', currentWorkspace.id);

      if (settingsError) {
        console.error('Error fetching portfolio settings:', settingsError);
      }

      // Create settings map
      const settingsMap = new Map<string, { settlement: number; split: number; enabled: boolean }>();
      (portfolioSettings as PortfolioSetting[] | null)?.forEach(setting => {
        settingsMap.set(setting.campaign_id, {
          settlement: setting.settlement_value || 0,
          split: setting.split_percentage ?? 42.5,
          enabled: setting.is_enabled !== false, // Default true if not set
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
        const settlement = settings?.settlement || 0;
        const split = settings?.split ?? 42.5;
        // If no setting exists for this campaign, default to enabled
        const isEnabled = settings ? settings.enabled : true;
        
        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          totalCases: caseData.cases,
          totalValue: caseData.value,
          settlementValue: settlement,
          splitPercentage: split,
          yourShare: settlement * (split / 100),
          hasSettlementSetting: settingsMap.has(campaign.id),
          isEnabled,
        };
      });

      // Sort: enabled first, then alphabetically by name
      portfolioItems.sort((a, b) => {
        if (a.isEnabled !== b.isEnabled) return a.isEnabled ? -1 : 1;
        return a.campaignName.localeCompare(b.campaignName);
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

  const updatePortfolioSettings = async (
    campaignId: string, 
    settlementValue: number, 
    splitPercentage: number
  ) => {
    if (!currentWorkspace?.id) return;

    try {
      const existingSetting = portfolioData.find(p => p.campaignId === campaignId);
      
      const { error } = await supabase
        .from('campaign_portfolio_settings')
        .upsert({
          campaign_id: campaignId,
          settlement_value: settlementValue,
          split_percentage: splitPercentage,
          is_enabled: existingSetting?.isEnabled ?? true,
          workspace_id: currentWorkspace.id,
        }, {
          onConflict: 'campaign_id',
        });

      if (error) throw error;

      // Update local state
      const updatedData = portfolioData.map(item => 
        item.campaignId === campaignId 
          ? { 
              ...item, 
              settlementValue, 
              splitPercentage,
              yourShare: settlementValue * (splitPercentage / 100),
              hasSettlementSetting: true 
            }
          : item
      );
      setPortfolioData(updatedData);
      calculateSummary(updatedData);

      toast({
        title: "Updated",
        description: "Portfolio settings saved.",
      });
    } catch (error) {
      console.error('Error updating portfolio settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings.",
        variant: "destructive",
      });
    }
  };

  const toggleCampaignEnabled = async (campaignId: string, enabled: boolean) => {
    if (!currentWorkspace?.id) return;

    try {
      const existingSetting = portfolioData.find(p => p.campaignId === campaignId);
      
      // Persist to database
      const { error } = await supabase
        .from('campaign_portfolio_settings')
        .upsert({
          campaign_id: campaignId,
          settlement_value: existingSetting?.settlementValue || 0,
          split_percentage: existingSetting?.splitPercentage ?? 42.5,
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
      
      // Re-sort: enabled first, then alphabetically
      updatedData.sort((a, b) => {
        if (a.isEnabled !== b.isEnabled) return a.isEnabled ? -1 : 1;
        return a.campaignName.localeCompare(b.campaignName);
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
    updatePortfolioSettings,
    toggleCampaignEnabled,
  };
};
