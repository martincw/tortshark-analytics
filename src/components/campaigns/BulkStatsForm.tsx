import React, { useState } from "react";
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
  retainers: number;
  revenue: number;
};

type WeeklyStats = {
  [key: string]: DailyStats; // key is the date string in format YYYY-MM-DD
};

export const BulkStatsForm: React.FC<BulkStatsFormProps> = ({ startDate }) => {
  const { campaigns } = useCampaign();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [weeklyStatsData, setWeeklyStatsData] = useState<Record<string, WeeklyStats>>({}); // campaign_id -> { date -> stats }
  const [activeDay, setActiveDay] = useState<string>("0"); // Changed to string to match TabsTrigger value
  
  // Generate dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  
  const handleSelectAll = () => {
    const allSelected = campaigns.length === Object.values(selectedCampaigns).filter(Boolean).length;
    const newSelected = {};
    
    campaigns.forEach(campaign => {
      newSelected[campaign.id] = !allSelected;
      
      if (!allSelected && !weeklyStatsData[campaign.id]) {
        initializeWeeklyStats(campaign.id);
      }
    });
    
    setSelectedCampaigns(newSelected);
  };

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => ({
      ...prev,
      [campaignId]: !prev[campaignId]
    }));
    
    if (!selectedCampaigns[campaignId] && !weeklyStatsData[campaignId]) {
      initializeWeeklyStats(campaignId);
    }
  };

  const initializeWeeklyStats = (campaignId: string) => {
    const emptyWeekStats: WeeklyStats = {};
    
    weekDates.forEach(date => {
      const dateKey = format(date, "yyyy-MM-dd");
      emptyWeekStats[dateKey] = { leads: 0, cases: 0, retainers: 0, revenue: 0 };
    });
    
    setWeeklyStatsData(prev => ({
      ...prev,
      [campaignId]: emptyWeekStats
    }));
  };

  const handleInputChange = (campaignId: string, dateKey: string, field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    setWeeklyStatsData(prev => {
      const campaignStats = prev[campaignId] || {};
      const dayStats = campaignStats[dateKey] || { leads: 0, cases: 0, retainers: 0, revenue: 0 };
      
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
          const dayStats = campaignWeeklyStats[dateKey] || { leads: 0, cases: 0, retainers: 0, revenue: 0 };
          
          allStatsToAdd.push({
            id: uuidv4(),
            campaign_id: campaignId,
            date: dateKey,
            leads: dayStats.leads || 0,
            cases: dayStats.cases || 0,
            retainers: dayStats.retainers || 0,
            revenue: dayStats.revenue || 0,
            created_at: new Date().toISOString()
          });
        }
      }
      
      // Insert all stats at once
      const { error } = await supabase
        .from('campaign_stats_history')
        .upsert(allStatsToAdd, { 
          onConflict: 'campaign_id,date',
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
      const manualStatsToAdd = selectedCampaignIds.map(campaignId => {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        const recentStats = campaignWeeklyStats[recentDateKey] || { leads: 0, cases: 0, retainers: 0, revenue: 0 };
        
        return {
          id: uuidv4(),
          campaign_id: campaignId,
          date: recentDateKey,
          leads: recentStats.leads || 0,
          cases: recentStats.cases || 0,
          retainers: recentStats.retainers || 0,
          revenue: recentStats.revenue || 0
        };
      });
      
      const { error: manualError } = await supabase
        .from('campaign_manual_stats')
        .upsert(manualStatsToAdd, { 
          onConflict: 'campaign_id',
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

      <div className="grid grid-cols-1 gap-4">
        <div className="grid grid-cols-6 gap-4 p-2 font-medium bg-muted rounded-md">
          <div className="col-span-2">Campaign</div>
          <div className="col-span-1 text-center">Leads</div>
          <div className="col-span-1 text-center">Cases</div>
          <div className="col-span-1 text-center">Retainers</div>
          <div className="col-span-1 text-center">Revenue ($)</div>
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
                    value={weeklyStatsData[campaign.id]?.[currentDateKey]?.retainers || ''}
                    onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'retainers', e.target.value)}
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
          {loading ? "Saving..." : "Save All Stats"}
        </Button>
      </div>
    </div>
  );
};
