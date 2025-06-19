import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Campaign } from "@/types/campaign";
import { calculateMetrics } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { useNavigate } from "react-router-dom";
import { useBuyers } from "@/hooks/useBuyers";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OptimalSpendBadge } from "@/components/ui/optimal-spend-badge";

import { CampaignCardHeader } from "./CampaignCardHeader";
import { MetricsOverview } from "./MetricsOverview";
import { CampaignCardActions } from "./CampaignCardActions";
import { QuickStatsDialog } from "./QuickStatsDialog";
import { MultiDayStatsDialog } from "./MultiDayStatsDialog";
import { useQuickStats } from "./useQuickStats";
import { useMultiDayStats } from "./useMultiDayStats";
import { BuyerStackItem } from "@/types/buyer";

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const { setSelectedCampaignId, updateCampaign } = useCampaign();
  const navigate = useNavigate();
  const { getActiveBuyerStackShort } = useBuyers();
  
  // Use pre-calculated metrics if available (from useCampaignGridData)
  const metrics = campaign._metrics || calculateMetrics(campaign);
  
  const [isActive, setIsActive] = useState(campaign.is_active !== false);
  const [buyerStack, setBuyerStack] = useState<BuyerStackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  const {
    isQuickEntryOpen,
    openQuickEntry,
    closeQuickEntry,
    handleQuickStatsSubmit
  } = useQuickStats(campaign.id);
  
  const {
    isMultiDayEntryOpen,
    selectedDates,
    dayStats,
    openMultiDayEntry,
    closeMultiDayEntry,
    handleDatesSelected,
    updateDayStats,
    handleBulkUpdateField,
    handleMultiDayStatsSubmit
  } = useMultiDayStats(campaign.id);
  
  // Update local state when campaign prop changes
  useEffect(() => {
    setIsActive(campaign.is_active !== false);
  }, [campaign.is_active]);
  
  // Fetch buyer stack when component mounts
  useEffect(() => {
    const fetchBuyerStack = async () => {
      const stackData = await getActiveBuyerStackShort(campaign.id, 3);
      if (Array.isArray(stackData)) {
        setBuyerStack(stackData);
      }
    };
    
    fetchBuyerStack();
  }, [campaign.id, getActiveBuyerStackShort]);
  
  const handleViewDetails = () => {
    setSelectedCampaignId(campaign.id);
    navigate(`/campaign/${campaign.id}`);
  };
  
  const handleToggleActive = async () => {
    const newActiveState = !isActive;
    setLoading(true);
    setIsToggling(true);
    
    try {
      // Update local state first for immediate UI feedback
      setIsActive(newActiveState);
      
      // Use context's updateCampaign to ensure proper state management
      await updateCampaign(campaign.id, { is_active: newActiveState });
      
      toast.success(`Campaign ${newActiveState ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error('Error toggling campaign active status:', error);
      toast.error('Failed to update campaign status');
      setIsActive(!newActiveState); // Revert the UI state on error
    } finally {
      setLoading(false);
      setTimeout(() => setIsToggling(false), 300); // Animation timeout
    }
  };

  return (
    <>
      <Card 
        className={`overflow-hidden hover:shadow-md transition-all duration-300 transform border border-border/80 group 
                   ${isActive ? 'bg-[#F2FCE2]/40' : ''} 
                   ${isToggling ? (isActive ? 'scale-[1.02]' : 'scale-[0.98]') : ''} 
                   animate-fade-in`}
      >
        <CampaignCardHeader 
          name={campaign.name} 
          date={campaign.stats.date}
          right={
            <div className="flex items-center gap-2">
              <span className={`text-xs transition-colors duration-200 ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </span>
              <Switch 
                checked={isActive} 
                onCheckedChange={handleToggleActive}
                disabled={loading}
                size="sm"
                className={`transition-all ${isToggling ? 'scale-110' : ''}`}
              />
            </div>
          }
        />
        
        <CardContent className="pb-0">
          <MetricsOverview 
            metrics={metrics}
            campaignStats={campaign.stats}
            manualStats={campaign.manualStats}
            targetProfit={campaign.targets.targetProfit}
          />
          
          {/* Add optimal spend section */}
          {metrics.optimalDailySpend && (
            <div className="mt-3 border-t pt-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-muted-foreground">Spend Optimization</span>
                <OptimalSpendBadge
                  optimalSpend={metrics.optimalDailySpend}
                  currentSpend={campaign.stats.adSpend}
                  efficiency={metrics.currentEfficiency}
                  confidence={metrics.spendConfidenceScore}
                  recommendation={metrics.spendRecommendation}
                  projectedIncrease={metrics.projectedLeadIncrease}
                />
              </div>
            </div>
          )}
          
          {buyerStack.length > 0 && (
            <div className="mt-3 border-t pt-2 animate-fade-in">
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Buyer Stack</p>
              <div className="space-y-1">
                {buyerStack.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="flex justify-between items-center text-sm hover:bg-muted/30 p-1 rounded-sm transition-colors duration-200"
                  >
                    <span className="font-medium truncate max-w-[70%]">
                      <span className="inline-block w-5 h-5 mr-1 bg-primary/10 text-primary rounded-full text-xs flex items-center justify-center">
                        {index + 1}
                      </span>
                      {item.buyers?.name}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      ${item.payout_amount?.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        
        <CampaignCardActions 
          onViewDetails={handleViewDetails}
          onAddStats={openQuickEntry}
          onAddMultiDayStats={openMultiDayEntry}
        />
      </Card>
      
      <QuickStatsDialog
        isOpen={isQuickEntryOpen}
        onClose={closeQuickEntry}
        campaignName={campaign.name}
        onSubmit={handleQuickStatsSubmit}
      />
      
      <MultiDayStatsDialog
        isOpen={isMultiDayEntryOpen}
        onClose={closeMultiDayEntry}
        campaignName={campaign.name}
        selectedDates={selectedDates}
        dayStats={dayStats}
        onDatesSelected={handleDatesSelected}
        onUpdateDayStats={updateDayStats}
        onBulkUpdateField={handleBulkUpdateField}
        onSubmit={handleMultiDayStatsSubmit}
      />
    </>
  );
}
