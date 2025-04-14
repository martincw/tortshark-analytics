
import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BulkAdsStatsFormProps {
  selectedDate: Date;
}

export const BulkAdsStatsForm: React.FC<BulkAdsStatsFormProps> = ({ selectedDate }) => {
  const { campaigns, refreshCampaigns } = useCampaign();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [statsData, setStatsData] = useState<Record<string, {
    adSpend: number;
    impressions: number;
    clicks: number;
    cpc: number;
  }>>({});

  const handleSelectAll = () => {
    const allSelected = campaigns.length === Object.values(selectedCampaigns).filter(Boolean).length;
    const newSelected = {};
    
    campaigns.forEach(campaign => {
      newSelected[campaign.id] = !allSelected;
      
      // Initialize stat values if selecting
      if (!allSelected && !statsData[campaign.id]) {
        setStatsData(prev => ({
          ...prev,
          [campaign.id]: { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 }
        }));
      }
    });
    
    setSelectedCampaigns(newSelected);
  };

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => ({
      ...prev,
      [campaignId]: !prev[campaignId]
    }));
    
    // Initialize stat values if selecting
    if (!selectedCampaigns[campaignId] && !statsData[campaignId]) {
      setStatsData(prev => ({
        ...prev,
        [campaignId]: { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 }
      }));
    }
  };

  const handleInputChange = (campaignId: string, field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    setStatsData(prev => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] || { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 }),
        [field]: numValue
      }
    }));
  };

  // Auto-calculate CPC when adSpend or clicks change
  const calculateCPC = (campaignId: string) => {
    const stats = statsData[campaignId];
    if (!stats) return;
    
    const { adSpend, clicks } = stats;
    
    if (clicks > 0) {
      const cpc = adSpend / clicks;
      setStatsData(prev => ({
        ...prev,
        [campaignId]: {
          ...prev[campaignId],
          cpc
        }
      }));
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("You must be logged in to add stats");
      return;
    }
    
    setLoading(true);
    
    try {
      const selectedCampaignIds = Object.entries(selectedCampaigns)
        .filter(([_, isSelected]) => isSelected)
        .map(([id]) => id);
      
      if (selectedCampaignIds.length === 0) {
        toast.error("Please select at least one campaign");
        setLoading(false);
        return;
      }
      
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      
      // Update campaign_stats_history with ad_spend
      const historyUpdates = selectedCampaignIds.map(campaignId => {
        const stats = statsData[campaignId] || { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
        
        return {
          campaign_id: campaignId,
          date: formattedDate,
          ad_spend: stats.adSpend || 0
        };
      });
      
      // Check if entries exist for this date first
      for (const update of historyUpdates) {
        const { data, error: checkError } = await supabase
          .from('campaign_stats_history')
          .select('id')
          .eq('campaign_id', update.campaign_id)
          .eq('date', update.date)
          .single();
          
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows found"
          console.error("Error checking existing stats:", checkError);
          continue;
        }
        
        if (data) {
          // Update existing entry
          const { error: updateError } = await supabase
            .from('campaign_stats_history')
            .update({ ad_spend: update.ad_spend })
            .eq('id', data.id);
            
          if (updateError) {
            console.error("Error updating stats history:", updateError);
          }
        } else {
          // Create new entry with defaults for manual stats
          const { error: insertError } = await supabase
            .from('campaign_stats_history')
            .insert({
              id: uuidv4(),
              campaign_id: update.campaign_id,
              date: update.date,
              ad_spend: update.ad_spend,
              leads: 0,
              cases: 0,
              retainers: 0,
              revenue: 0
            });
            
          if (insertError) {
            console.error("Error inserting stats history:", insertError);
          }
        }
      }
      
      // Now update campaign_stats table
      const adsStatsToAdd = selectedCampaignIds.map(campaignId => {
        const stats = statsData[campaignId] || { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
        
        return {
          id: uuidv4(),
          campaign_id: campaignId,
          date: formattedDate,
          ad_spend: stats.adSpend || 0,
          impressions: stats.impressions || 0,
          clicks: stats.clicks || 0,
          cpc: stats.cpc || 0
        };
      });
      
      const { error: statsError } = await supabase
        .from('campaign_stats')
        .upsert(adsStatsToAdd, { 
          onConflict: 'campaign_id',
          ignoreDuplicates: false
        });
        
      if (statsError) {
        console.error("Error updating ad stats:", statsError);
        toast.error("Failed to update ad stats: " + statsError.message);
        setLoading(false);
        return;
      }
      
      toast.success(`Ad stats added for ${selectedCampaignIds.length} campaigns`);
      refreshCampaigns();
      
      // Reset form
      setSelectedCampaigns({});
      setStatsData({});
    } catch (err) {
      console.error("Error in submission:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="select-all-ads"
          checked={campaigns.length > 0 && campaigns.length === Object.values(selectedCampaigns).filter(Boolean).length}
          onCheckedChange={handleSelectAll}
        />
        <label htmlFor="select-all-ads" className="text-sm font-medium">
          Select All Campaigns
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-6 gap-4 p-2 font-medium bg-muted rounded-md">
          <div className="col-span-2">Campaign</div>
          <div className="col-span-1 text-center">Ad Spend ($)</div>
          <div className="col-span-1 text-center">Impressions</div>
          <div className="col-span-1 text-center">Clicks</div>
          <div className="col-span-1 text-center">CPC ($)</div>
        </div>

        {campaigns.map((campaign) => (
          <Card key={campaign.id} className={selectedCampaigns[campaign.id] ? "border-primary" : ""}>
            <CardContent className="p-4">
              <div className="grid grid-cols-6 gap-4 items-center">
                <div className="col-span-2 flex items-center space-x-2">
                  <Checkbox
                    id={`select-ads-${campaign.id}`}
                    checked={selectedCampaigns[campaign.id] || false}
                    onCheckedChange={() => handleSelectCampaign(campaign.id)}
                  />
                  <label htmlFor={`select-ads-${campaign.id}`} className="font-medium">
                    {campaign.name}
                  </label>
                </div>
                
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={statsData[campaign.id]?.adSpend || ''}
                    onChange={(e) => {
                      handleInputChange(campaign.id, 'adSpend', e.target.value);
                      // Recalculate CPC on next render
                      setTimeout(() => calculateCPC(campaign.id), 0);
                    }}
                    disabled={!selectedCampaigns[campaign.id]}
                    placeholder="0"
                  />
                </div>
                
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="0"
                    value={statsData[campaign.id]?.impressions || ''}
                    onChange={(e) => handleInputChange(campaign.id, 'impressions', e.target.value)}
                    disabled={!selectedCampaigns[campaign.id]}
                    placeholder="0"
                  />
                </div>
                
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="0"
                    value={statsData[campaign.id]?.clicks || ''}
                    onChange={(e) => {
                      handleInputChange(campaign.id, 'clicks', e.target.value);
                      // Recalculate CPC on next render
                      setTimeout(() => calculateCPC(campaign.id), 0);
                    }}
                    disabled={!selectedCampaigns[campaign.id]}
                    placeholder="0"
                  />
                </div>
                
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={statsData[campaign.id]?.cpc || ''}
                    onChange={(e) => handleInputChange(campaign.id, 'cpc', e.target.value)}
                    disabled={!selectedCampaigns[campaign.id]}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={loading || Object.values(selectedCampaigns).filter(Boolean).length === 0}
        >
          {loading ? "Saving..." : "Save All Ad Stats"}
        </Button>
      </div>
    </div>
  );
};
