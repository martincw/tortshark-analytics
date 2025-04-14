import React, { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BulkAdsStatsFormProps {
  startDate: Date;
}

type DailyAdStats = {
  adSpend: number;
  impressions: number;
  clicks: number;
  cpc: number;
};

type WeeklyAdStats = {
  [key: string]: DailyAdStats; // key is the date string in format YYYY-MM-DD
};

export const BulkAdsStatsForm: React.FC<BulkAdsStatsFormProps> = ({ startDate }) => {
  const { campaigns } = useCampaign();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [weeklyStatsData, setWeeklyStatsData] = useState<Record<string, WeeklyAdStats>>({}); // campaign_id -> { date -> stats }
  const [activeDay, setActiveDay] = useState<string>("0"); // Changed to string to match TabsTrigger value
  
  // Generate dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const handleSelectAll = () => {
    const allSelected = campaigns.length === Object.values(selectedCampaigns).filter(Boolean).length;
    const newSelected = {};
    
    campaigns.forEach(campaign => {
      newSelected[campaign.id] = !allSelected;
      
      if (!allSelected) {
        initializeWeeklyStats(campaign.id);
        fetchExistingStats(campaign.id);
      }
    });
    
    setSelectedCampaigns(newSelected);
  };

  const handleSelectCampaign = (campaignId: string) => {
    const isCurrentlySelected = !!selectedCampaigns[campaignId];
    
    setSelectedCampaigns(prev => ({
      ...prev,
      [campaignId]: !isCurrentlySelected
    }));
    
    if (!isCurrentlySelected) {
      initializeWeeklyStats(campaignId);
      fetchExistingStats(campaignId);
    }
  };

  const initializeWeeklyStats = (campaignId: string) => {
    const emptyWeekStats: WeeklyAdStats = {};
    
    weekDates.forEach(date => {
      const dateKey = format(date, "yyyy-MM-dd");
      emptyWeekStats[dateKey] = { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
    });
    
    setWeeklyStatsData(prev => ({
      ...prev,
      [campaignId]: emptyWeekStats
    }));
  };

  const fetchExistingStats = async (campaignId: string) => {
    if (!user) return;
    
    setLoadingStats(true);
    
    try {
      // Prepare date strings for the week
      const dateStrings = weekDates.map(date => format(date, "yyyy-MM-dd"));
      
      // First, fetch ad spend data from campaign_stats_history
      const { data: historyData, error: historyError } = await supabase
        .from('campaign_stats_history')
        .select('date, ad_spend')
        .eq('campaign_id', campaignId)
        .in('date', dateStrings);
        
      if (historyError) {
        console.error("Error fetching ad spend stats:", historyError);
      }
      
      // Then, fetch impressions, clicks, CPC from campaign_stats (for records that match our date range)
      const { data: statsData, error: statsError } = await supabase
        .from('campaign_stats')
        .select('id, date, ad_spend, impressions, clicks, cpc')
        .eq('campaign_id', campaignId)
        .in('date', dateStrings);
        
      if (statsError) {
        console.error("Error fetching ad metrics:", statsError);
      }
      
      // Merge all the data into our weekly stats
      setWeeklyStatsData(prev => {
        const campaignStats = { ...prev[campaignId] } || {};
        
        // First apply the ad_spend from history data
        if (historyData && historyData.length > 0) {
          historyData.forEach(stat => {
            const dateKey = format(new Date(stat.date), "yyyy-MM-dd");
            if (campaignStats[dateKey]) {
              campaignStats[dateKey] = {
                ...campaignStats[dateKey],
                adSpend: stat.ad_spend || 0
              };
            } else {
              campaignStats[dateKey] = {
                adSpend: stat.ad_spend || 0,
                impressions: 0,
                clicks: 0,
                cpc: 0
              };
            }
          });
        }
        
        // Then apply the stats data (overriding ad_spend and adding other metrics)
        if (statsData && statsData.length > 0) {
          statsData.forEach(stat => {
            const dateKey = format(new Date(stat.date), "yyyy-MM-dd");
            if (campaignStats[dateKey]) {
              campaignStats[dateKey] = {
                adSpend: stat.ad_spend || campaignStats[dateKey].adSpend || 0,
                impressions: stat.impressions || 0,
                clicks: stat.clicks || 0,
                cpc: stat.cpc || 0
              };
            } else {
              campaignStats[dateKey] = {
                adSpend: stat.ad_spend || 0,
                impressions: stat.impressions || 0,
                clicks: stat.clicks || 0,
                cpc: stat.cpc || 0
              };
            }
          });
        }
        
        return {
          ...prev,
          [campaignId]: campaignStats
        };
      });
    } catch (err) {
      console.error("Error fetching existing stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleInputChange = (campaignId: string, dateKey: string, field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    setWeeklyStatsData(prev => {
      const campaignStats = prev[campaignId] || {};
      const dayStats = campaignStats[dateKey] || { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
      
      return {
        ...prev,
        [campaignId]: {
          ...campaignStats,
          [dateKey]: {
            ...dayStats,
            [field]: numValue
          }
        }
      };
    });
    
    // Calculate CPC if adSpend or clicks were changed
    if (field === 'adSpend' || field === 'clicks') {
      setTimeout(() => calculateCPC(campaignId, dateKey), 0);
    }
  };

  const calculateCPC = (campaignId: string, dateKey: string) => {
    setWeeklyStatsData(prev => {
      const campaignStats = prev[campaignId] || {};
      const dayStats = campaignStats[dateKey] || { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
      
      const { adSpend, clicks } = dayStats;
      let cpc = 0;
      
      if (clicks > 0) {
        cpc = adSpend / clicks;
      }
      
      return {
        ...prev,
        [campaignId]: {
          ...campaignStats,
          [dateKey]: {
            ...dayStats,
            cpc
          }
        }
      };
    });
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
      
      // Process campaign_stats_history updates for ad_spend
      for (const campaignId of selectedCampaignIds) {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        
        for (const date of weekDates) {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayStats = campaignWeeklyStats[dateKey] || { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
          
          // Check if stats exist for this campaign and date
          const { data, error: checkError } = await supabase
            .from('campaign_stats_history')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('date', dateKey)
            .maybeSingle();
            
          if (checkError && checkError.code !== 'PGRST116') {
            console.error(`Error checking stats for ${campaignId} on ${dateKey}:`, checkError);
            continue;
          }
          
          if (data) {
            // Update existing stats
            const { error: updateError } = await supabase
              .from('campaign_stats_history')
              .update({ ad_spend: dayStats.adSpend || 0 })
              .eq('id', data.id);
              
            if (updateError) {
              console.error(`Error updating stats for ${campaignId} on ${dateKey}:`, updateError);
            }
          } else {
            // Insert new stats
            const { error: insertError } = await supabase
              .from('campaign_stats_history')
              .insert({
                id: uuidv4(),
                campaign_id: campaignId,
                date: dateKey,
                ad_spend: dayStats.adSpend || 0,
                leads: 0,
                cases: 0,
                retainers: 0,
                revenue: 0
              });
              
            if (insertError) {
              console.error(`Error inserting stats for ${campaignId} on ${dateKey}:`, insertError);
            }
          }
        }
      }
      
      // Process campaign_stats updates for ad metrics
      // Use the most recent day's data for current stats
      const recentDateKey = format(weekDates[weekDates.length - 1], "yyyy-MM-dd");
      const adsStatsToAdd = [];
      
      for (const campaignId of selectedCampaignIds) {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        
        // For each date in the week, add or update campaign_stats
        for (const date of weekDates) {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayStats = campaignWeeklyStats[dateKey] || { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
          
          // Check if an entry already exists for this day
          const { data: existingStats, error: statsCheckError } = await supabase
            .from('campaign_stats')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('date', dateKey)
            .maybeSingle();
            
          const statsId = existingStats?.id || uuidv4();
          
          adsStatsToAdd.push({
            id: statsId,
            campaign_id: campaignId,
            date: dateKey,
            ad_spend: dayStats.adSpend || 0,
            impressions: dayStats.impressions || 0,
            clicks: dayStats.clicks || 0,
            cpc: dayStats.cpc || 0
          });
        }
      }
      
      // Use id for conflict resolution
      const { error: statsError } = await supabase
        .from('campaign_stats')
        .upsert(adsStatsToAdd, { 
          onConflict: 'id',
          ignoreDuplicates: false
        });
        
      if (statsError) {
        console.error("Error updating ad stats:", statsError);
        toast.error("Failed to update ad stats: " + statsError.message);
        setLoading(false);
        return;
      }
      
      toast.success(`Ad stats added for ${selectedCampaignIds.length} campaigns for the entire week`);
      
      setSelectedCampaigns({});
      setWeeklyStatsData({});
    } catch (err) {
      console.error("Error in submission:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  // Get the current date based on the active day index
  const currentDateKey = format(weekDates[parseInt(activeDay)], "yyyy-MM-dd");
  const formattedActiveDate = format(weekDates[parseInt(activeDay)], "EEE, MMM d");

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

      <div className="mb-4">
        <Tabs defaultValue="0" value={activeDay} onValueChange={setActiveDay}>
          <TabsList className="w-full justify-start">
            {weekDates.map((date, index) => (
              <TabsTrigger 
                key={index}
                value={index.toString()}
              >
                {format(date, "EEE, d")}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <p className="mt-2 text-sm text-muted-foreground">
          Entering stats for: <span className="font-semibold">{formattedActiveDate}</span>
        </p>
      </div>

      {loadingStats ? (
        <div className="text-center py-4">Loading existing stats...</div>
      ) : (
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
                      value={weeklyStatsData[campaign.id]?.[currentDateKey]?.adSpend || ''}
                      onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'adSpend', e.target.value)}
                      disabled={!selectedCampaigns[campaign.id]}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Input
                      type="number"
                      min="0"
                      value={weeklyStatsData[campaign.id]?.[currentDateKey]?.impressions || ''}
                      onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'impressions', e.target.value)}
                      disabled={!selectedCampaigns[campaign.id]}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Input
                      type="number"
                      min="0"
                      value={weeklyStatsData[campaign.id]?.[currentDateKey]?.clicks || ''}
                      onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'clicks', e.target.value)}
                      disabled={!selectedCampaigns[campaign.id]}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={weeklyStatsData[campaign.id]?.[currentDateKey]?.cpc || ''}
                      onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'cpc', e.target.value)}
                      disabled={!selectedCampaigns[campaign.id]}
                      placeholder="0"
                      readOnly
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={loading || loadingStats || Object.values(selectedCampaigns).filter(Boolean).length === 0}
        >
          {loading ? "Saving..." : "Save All Ad Stats"}
        </Button>
      </div>
    </div>
  );
};
