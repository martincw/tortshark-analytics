import React, { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BulkStatsFormProps {
  startDate: Date;
}

type DailyStats = {
  leads: number;
  cases: number;
  revenue: number;
  adSpend: number;
};

type WeeklyStats = {
  [key: string]: DailyStats; // key is the date string in format YYYY-MM-DD
};

export const BulkStatsForm: React.FC<BulkStatsFormProps> = ({ startDate }) => {
  const { campaigns } = useCampaign();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [weeklyStatsData, setWeeklyStatsData] = useState<Record<string, WeeklyStats>>({});
  const [activeDay, setActiveDay] = useState<string>("0");
  
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  
  const handleSelectAll = () => {
    // Ensure campaigns exist and explicitly check length
    const areAllSelected = campaigns.length > 0 && 
      campaigns.every(campaign => selectedCampaigns[campaign.id] === true);
    
    const newSelected: Record<string, boolean> = {};
    
    campaigns.forEach(campaign => {
      newSelected[campaign.id] = !areAllSelected;
      
      if (!areAllSelected) {
        initializeWeeklyStats(campaign.id);
        fetchExistingStats(campaign.id);
      }
    });
    
    setSelectedCampaigns(newSelected);
  };

  const handleSelectCampaign = (campaignId: string) => {
    // Fix: Use boolean negation to ensure we get a boolean value
    const isCurrentlySelected = Boolean(selectedCampaigns[campaignId]);
    
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
    const emptyWeekStats: WeeklyStats = {};
    
    weekDates.forEach(date => {
      const dateKey = format(date, "yyyy-MM-dd");
      emptyWeekStats[dateKey] = { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
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
      
      // Fetch existing stats for the campaign for the week
      const { data, error } = await supabase
        .from('campaign_stats_history')
        .select('id, date, leads, cases, revenue, ad_spend')
        .eq('campaign_id', campaignId)
        .in('date', dateStrings);
        
      if (error) {
        console.error("Error fetching stats:", error);
        return;
      }
      
      if (data && data.length > 0) {
        // Update weeklyStatsData with existing stats
        setWeeklyStatsData(prev => {
          const campaignStats = { ...prev[campaignId] } || {};
          
          data.forEach(stat => {
            const dateKey = format(new Date(stat.date), "yyyy-MM-dd");
            campaignStats[dateKey] = {
              leads: stat.leads || 0,
              cases: stat.cases || 0,
              revenue: stat.revenue || 0,
              adSpend: stat.ad_spend || 0
            };
          });
          
          return {
            ...prev,
            [campaignId]: campaignStats
          };
        });
      }
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
      const dayStats = campaignStats[dateKey] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
      
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
      
      const allStatsToAdd = [];
      
      // Prepare all stats entries for the week
      for (const campaignId of selectedCampaignIds) {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        
        for (const date of weekDates) {
          const dateKey = format(date, "yyyy-MM-dd");
          const dayStats = campaignWeeklyStats[dateKey] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
          
          // First check if an entry already exists for this campaign/date
          const { data: existingData, error: checkError } = await supabase
            .from('campaign_stats_history')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('date', dateKey)
            .maybeSingle();
            
          const id = existingData?.id || uuidv4();
          
          allStatsToAdd.push({
            id: id,
            campaign_id: campaignId,
            date: dateKey,
            leads: dayStats.leads || 0,
            cases: dayStats.cases || 0,
            retainers: dayStats.cases || 0, // Set retainers equal to cases
            revenue: dayStats.revenue || 0,
            ad_spend: dayStats.adSpend || 0,
            created_at: new Date().toISOString()
          });
        }
      }
      
      // Use id for conflict resolution, which is the primary key
      const { error } = await supabase
        .from('campaign_stats_history')
        .upsert(allStatsToAdd, { 
          onConflict: 'id',
          ignoreDuplicates: false
        });
        
      if (error) {
        console.error("Error adding stats:", error);
        toast.error("Failed to add stats: " + error.message);
        setLoading(false);
        return;
      }
      
      // Update current stats with the most recent day's data
      const recentDateKey = format(weekDates[weekDates.length - 1], "yyyy-MM-dd");
      const manualStatsToAdd = [];
      
      for (const campaignId of selectedCampaignIds) {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        const recentStats = campaignWeeklyStats[recentDateKey] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
        
        // Check if an entry already exists
        const { data: existingManual, error: manualCheckError } = await supabase
          .from('campaign_manual_stats')
          .select('id')
          .eq('campaign_id', campaignId)
          .maybeSingle();
          
        const manualId = existingManual?.id || uuidv4();
        
        manualStatsToAdd.push({
          id: manualId,
          campaign_id: campaignId,
          date: recentDateKey,
          leads: recentStats.leads || 0,
          cases: recentStats.cases || 0,
          retainers: recentStats.cases || 0, // Set retainers equal to cases
          revenue: recentStats.revenue || 0
        });
      }
      
      // Use id for conflict resolution
      const { error: manualError } = await supabase
        .from('campaign_manual_stats')
        .upsert(manualStatsToAdd, { 
          onConflict: 'id',
          ignoreDuplicates: false
        });
        
      if (manualError) {
        console.error("Error updating manual stats:", manualError);
        toast.error("Failed to update current stats: " + manualError.message);
      }
      
      toast.success(`Stats added for ${selectedCampaignIds.length} campaigns for the entire week`);
      
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
          id="select-all"
          checked={campaigns.length > 0 && campaigns.length === Object.values(selectedCampaigns).filter(Boolean).length}
          onCheckedChange={handleSelectAll}
        />
        <label htmlFor="select-all" className="text-sm font-medium">
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
            <div className="col-span-1 text-center">Leads</div>
            <div className="col-span-1 text-center">Cases</div>
            <div className="col-span-1 text-center">Revenue ($)</div>
            <div className="col-span-1 text-center">Ad Spend ($)</div>
          </div>

          {campaigns.map((campaign) => (
            <Card key={campaign.id} className={selectedCampaigns[campaign.id] ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="grid grid-cols-6 gap-4 items-center">
                  <div className="col-span-2 flex items-center space-x-2">
                    <Checkbox
                      id={`select-${campaign.id}`}
                      checked={selectedCampaigns[campaign.id] || false}
                      onCheckedChange={() => handleSelectCampaign(campaign.id)}
                    />
                    <label htmlFor={`select-${campaign.id}`} className="font-medium">
                      {campaign.name}
                    </label>
                  </div>
                  
                  <div className="col-span-1">
                    <Input
                      type="number"
                      min="0"
                      value={weeklyStatsData[campaign.id]?.[currentDateKey]?.leads || ''}
                      onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'leads', e.target.value)}
                      disabled={!selectedCampaigns[campaign.id]}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Input
                      type="number"
                      min="0"
                      value={weeklyStatsData[campaign.id]?.[currentDateKey]?.cases || ''}
                      onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'cases', e.target.value)}
                      disabled={!selectedCampaigns[campaign.id]}
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={weeklyStatsData[campaign.id]?.[currentDateKey]?.revenue || ''}
                      onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'revenue', e.target.value)}
                      disabled={!selectedCampaigns[campaign.id]}
                      placeholder="0"
                    />
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
          {loading ? "Saving..." : "Save All Stats"}
        </Button>
      </div>
    </div>
  );
};
