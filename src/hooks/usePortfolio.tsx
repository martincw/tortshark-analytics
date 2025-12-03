import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface CampaignPortfolio {
  campaignId: string;
  campaignName: string;
  totalCases: number;
  totalValue: number; // NAV
  settlementValue: number;
  hasSettlementSetting: boolean;
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
          date,
          campaigns (
            id,
            name
          )
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

      // Fetch portfolio settings (settlement values)
      const { data: portfolioSettings, error: settingsError } = await supabase
        .from('campaign_portfolio_settings')
        .select('campaign_id, settlement_value')
        .eq('workspace_id', currentWorkspace.id);

      if (settingsError) {
        console.error('Error fetching portfolio settings:', settingsError);
        throw settingsError;
      }

      // Create settlement value map
      const settlementMap = new Map<string, number>();
      portfolioSettings?.forEach(setting => {
        settlementMap.set(setting.campaign_id, setting.settlement_value);
      });

      // Aggregate by campaign
      const campaignAggregates = new Map<string, { name: string; cases: number; value: number }>();
      
      caseStats?.forEach(stat => {
        const campaignId = stat.campaign_id;
        const campaignName = stat.campaigns?.name || 'Unknown Campaign';
        
        if (campaignAggregates.has(campaignId)) {
          const existing = campaignAggregates.get(campaignId)!;
          existing.cases += stat.case_count;
          existing.value += stat.total_value || 0;
        } else {
          campaignAggregates.set(campaignId, {
            name: campaignName,
            cases: stat.case_count,
            value: stat.total_value || 0,
          });
        }
      });

      // Build portfolio data
      const portfolioItems: CampaignPortfolio[] = [];
      campaignAggregates.forEach((data, campaignId) => {
        const settlementValue = settlementMap.get(campaignId) || 0;
        portfolioItems.push({
          campaignId,
          campaignName: data.name,
          totalCases: data.cases,
          totalValue: data.value,
          settlementValue,
          hasSettlementSetting: settlementMap.has(campaignId),
        });
      });

      // Sort by NAV descending
      portfolioItems.sort((a, b) => b.totalValue - a.totalValue);
      setPortfolioData(portfolioItems);

      // Calculate summary
      const totalCases = portfolioItems.reduce((sum, item) => sum + item.totalCases, 0);
      const totalNAV = portfolioItems.reduce((sum, item) => sum + item.totalValue, 0);
      const settlementsWithValue = portfolioItems.filter(item => item.settlementValue > 0);
      const avgSettlement = settlementsWithValue.length > 0
        ? settlementsWithValue.reduce((sum, item) => sum + item.settlementValue, 0) / settlementsWithValue.length
        : 0;

      setSummary({
        totalCases,
        totalNAV,
        avgSettlement,
        campaignCount: portfolioItems.length,
      });

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
  }, [currentWorkspace?.id, dateRange, toast]);

  const updateSettlementValue = async (campaignId: string, value: number) => {
    if (!currentWorkspace?.id) return;

    try {
      // Upsert the settlement value
      const { error } = await supabase
        .from('campaign_portfolio_settings')
        .upsert({
          campaign_id: campaignId,
          settlement_value: value,
          workspace_id: currentWorkspace.id,
        }, {
          onConflict: 'campaign_id',
        });

      if (error) throw error;

      // Update local state
      setPortfolioData(prev => prev.map(item => 
        item.campaignId === campaignId 
          ? { ...item, settlementValue: value, hasSettlementSetting: true }
          : item
      ));

      // Recalculate summary
      const updatedData = portfolioData.map(item => 
        item.campaignId === campaignId 
          ? { ...item, settlementValue: value }
          : item
      );
      const settlementsWithValue = updatedData.filter(item => item.settlementValue > 0 || item.campaignId === campaignId);
      const avgSettlement = settlementsWithValue.length > 0
        ? settlementsWithValue.reduce((sum, item) => sum + (item.campaignId === campaignId ? value : item.settlementValue), 0) / settlementsWithValue.length
        : 0;
      
      setSummary(prev => ({ ...prev, avgSettlement }));

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

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  return {
    portfolioData,
    summary,
    isLoading,
    dateRange,
    setDateRange,
    fetchPortfolioData,
    updateSettlementValue,
  };
};
