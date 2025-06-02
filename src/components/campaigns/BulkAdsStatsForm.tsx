import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBulkStatsData, AdsStatsField } from "@/hooks/useBulkStatsData";
import { formatDateForStorage, formatDisplayDate, createWeekDates } from "@/lib/utils/ManualDateUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const adsStatsFields: { id: AdsStatsField; label: string }[] = [
  { id: 'adSpend', label: 'Ad Spend ($)' },
  { id: 'impressions', label: 'Impressions' },
  { id: 'clicks', label: 'Clicks' },
  { id: 'cpc', label: 'CPC ($)' },
];

export const BulkAdsStatsForm: React.FC<BulkAdsStatsFormProps> = ({ startDate }) => {
  const { campaigns } = useCampaign();
  const { uniqueCampaigns, activeAdsField, setActiveAdsField } = useBulkStatsData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [weeklyStatsData, setWeeklyStatsData] = useState<Record<string, WeeklyAdStats>>({}); // campaign_id -> { date -> stats }
  const [activeDay, setActiveDay] = useState<string>("0"); // Changed to string to match TabsTrigger value
  
  // Pre-compute date keys for the entire week for consistent reference
  const weekDates = createWeekDates(startDate);
  const weekDateKeys = weekDates.map(date => formatDateForStorage(date));
  
  console.log("BulkAdsStatsForm - Week dates:", weekDates);
  console.log("BulkAdsStatsForm - Week date keys:", weekDateKeys);

  const handleSelectAll = () => {
    const allSelected = uniqueCampaigns.length === Object.values(selectedCampaigns).filter(Boolean).length;
    const newSelected = {};
    
    uniqueCampaigns.forEach(campaign => {
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
    const emptyWeekStats: WeeklyAdStats = {};
    
    // Use the pre-computed date keys for consistency
    weekDateKeys.forEach(dateKey => {
      emptyWeekStats[dateKey] = { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
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

  const handleSaveDailyStats = async () => {
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
      
      console.log("BulkAdsStatsForm - Selected campaign IDs:", selectedCampaignIds);
      console.log("BulkAdsStatsForm - Stats data to save:", weeklyStatsData);
      
      for (const campaignId of selectedCampaignIds) {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        
        for (let i = 0; i < weekDateKeys.length; i++) {
          const dateKey = weekDateKeys[i];
          const dayStats = campaignWeeklyStats[dateKey] || { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
          
          console.log(`BulkAdsStatsForm - Processing stats for campaign ${campaignId} on date key: ${dateKey}`);
          console.log(`BulkAdsStatsForm - Stats to save:`, dayStats);
          
          const { data, error: checkError } = await supabase
            .from('campaign_stats_history')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('date', dateKey)
            .maybeSingle();
            
          if (checkError) {
            console.error(`BulkAdsStatsForm - Error checking stats for ${campaignId} on ${dateKey}:`, checkError);
            continue;
          }
          
          console.log("BulkAdsStatsForm - Existing data check result:", data);
          
          if (data) {
            console.log(`BulkAdsStatsForm - Updating existing stats for ${campaignId} on ${dateKey}`);
            const { error: updateError } = await supabase
              .from('campaign_stats_history')
              .update({ 
                ad_spend: dayStats.adSpend || 0,
                date: dateKey 
              })
              .eq('id', data.id);
              
            if (updateError) {
              console.error(`BulkAdsStatsForm - Error updating stats for ${campaignId} on ${dateKey}:`, updateError);
            } else {
              console.log(`BulkAdsStatsForm - Successfully updated stats for ${campaignId} on ${dateKey}`);
            }
          } else {
            console.log(`BulkAdsStatsForm - Inserting new stats for ${campaignId} on ${dateKey}`);
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
              console.error(`BulkAdsStatsForm - Error inserting stats for ${campaignId} on ${dateKey}:`, insertError);
            } else {
              console.log(`BulkAdsStatsForm - Successfully inserted stats for ${campaignId} on ${dateKey}`);
            }
          }
        }
      }
      
      // Use the last date in the week for campaign_stats
      const recentDateKey = weekDateKeys[weekDateKeys.length - 1];
      console.log("BulkAdsStatsForm - Recent date key for campaign_stats:", recentDateKey);
      
      for (const campaignId of selectedCampaignIds) {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        const recentStats = campaignWeeklyStats[recentDateKey] || { adSpend: 0, impressions: 0, clicks: 0, cpc: 0 };
        
        console.log(`BulkAdsStatsForm - Updating campaign_stats for ${campaignId} with date ${recentDateKey}`);
        console.log("BulkAdsStatsForm - Stats to save:", recentStats);
        
        const { data: existingAdStats, error: checkAdStatsError } = await supabase
          .from('campaign_stats')
          .select('id')
          .eq('campaign_id', campaignId)
          .maybeSingle();
          
        if (checkAdStatsError) {
          console.error(`BulkAdsStatsForm - Error checking ad stats for ${campaignId}:`, checkAdStatsError);
          continue;
        }
        
        console.log("BulkAdsStatsForm - Existing ad stats check result:", existingAdStats);
        
        if (existingAdStats) {
          console.log(`BulkAdsStatsForm - Updating existing ad stats for ${campaignId}`);
          const { error: updateAdStatsError } = await supabase
            .from('campaign_stats')
            .update({
              ad_spend: recentStats.adSpend || 0,
              impressions: recentStats.impressions || 0,
              clicks: recentStats.clicks || 0,
              cpc: recentStats.cpc || 0,
              date: recentDateKey
            })
            .eq('id', existingAdStats.id);
            
          if (updateAdStatsError) {
            console.error(`BulkAdsStatsForm - Error updating ad stats for ${campaignId}:`, updateAdStatsError);
          } else {
            console.log(`BulkAdsStatsForm - Successfully updated ad stats for ${campaignId}`);
          }
        } else {
          console.log(`BulkAdsStatsForm - Inserting new ad stats for ${campaignId}`);
          const { error: insertAdStatsError } = await supabase
            .from('campaign_stats')
            .insert({
              id: uuidv4(),
              campaign_id: campaignId,
              date: recentDateKey,
              ad_spend: recentStats.adSpend || 0,
              impressions: recentStats.impressions || 0,
              clicks: recentStats.clicks || 0,
              cpc: recentStats.cpc || 0
            });
            
          if (insertAdStatsError) {
            console.error(`BulkAdsStatsForm - Error inserting ad stats for ${campaignId}:`, insertAdStatsError);
          } else {
            console.log(`BulkAdsStatsForm - Successfully inserted ad stats for ${campaignId}`);
          }
        }
      }
      
      toast.success(`Ad stats added for ${selectedCampaignIds.length} campaigns for the entire week`);
      
      setSelectedCampaigns({});
      setWeeklyStatsData({});
    } catch (err) {
      console.error("BulkAdsStatsForm - Error in submission:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const currentDateKey = weekDateKeys[parseInt(activeDay)];
  const formattedActiveDate = format(weekDates[parseInt(activeDay)], "EEE, MMM d");

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          id="select-all-ads"
          checked={uniqueCampaigns.length > 0 && uniqueCampaigns.length === Object.values(selectedCampaigns).filter(Boolean).length}
          onCheckedChange={handleSelectAll}
        />
        <label htmlFor="select-all-ads" className="text-sm font-medium">
          Select All Campaigns
        </label>
      </div>

      <div className="flex justify-between items-center mb-4">
        <Tabs defaultValue="adSpend" value={activeAdsField} onValueChange={(value) => setActiveAdsField(value as AdsStatsField)}>
          <TabsList>
            {adsStatsFields.map((field) => (
              <TabsTrigger key={field.id} value={field.id}>
                {field.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        <Tabs defaultValue="0" value={activeDay} onValueChange={setActiveDay} className="ml-4">
          <TabsList className="justify-start">
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
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Entering <span className="font-semibold">{adsStatsFields.find(f => f.id === activeAdsField)?.label}</span> for: <span className="font-semibold">{formattedActiveDate}</span>
      </p>

      <div className="grid grid-cols-1 gap-4">
        {activeAdsField === 'adSpend' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Campaign</TableHead>
                {weekDates.map((date, index) => (
                  <TableHead key={index} className="text-center">{format(date, "EEE, d")}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {uniqueCampaigns.map((campaign) => (
                <TableRow key={campaign.id} className={selectedCampaigns[campaign.id] ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      id={`select-ads-${campaign.id}`}
                      checked={selectedCampaigns[campaign.id] || false}
                      onCheckedChange={() => handleSelectCampaign(campaign.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  {weekDateKeys.map((dateKey, index) => (
                    <TableCell key={index}>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={weeklyStatsData[campaign.id]?.[dateKey]?.adSpend || ''}
                        onChange={(e) => handleInputChange(campaign.id, dateKey, 'adSpend', e.target.value)}
                        disabled={!selectedCampaigns[campaign.id]}
                        placeholder="0"
                        className="text-center"
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        
        {activeAdsField !== 'adSpend' && (
          <>
            <div className="grid grid-cols-6 gap-4 p-2 font-medium bg-muted rounded-md">
              <div className="col-span-2">Campaign</div>
              <div className="col-span-1 text-center">Ad Spend ($)</div>
              <div className="col-span-1 text-center">Impressions</div>
              <div className="col-span-1 text-center">Clicks</div>
              <div className="col-span-1 text-center">CPC ($)</div>
            </div>

            {uniqueCampaigns.map((campaign) => (
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
                        className="bg-muted"
                        readOnly
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="0"
                        value={weeklyStatsData[campaign.id]?.[currentDateKey]?.impressions || ''}
                        onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'impressions', e.target.value)}
                        disabled={!selectedCampaigns[campaign.id]}
                        className={activeAdsField !== 'impressions' ? "bg-muted" : ""}
                        readOnly={activeAdsField !== 'impressions'}
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="0"
                        value={weeklyStatsData[campaign.id]?.[currentDateKey]?.clicks || ''}
                        onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'clicks', e.target.value)}
                        disabled={!selectedCampaigns[campaign.id]}
                        className={activeAdsField !== 'clicks' ? "bg-muted" : ""}
                        readOnly={activeAdsField !== 'clicks'}
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
                        className={activeAdsField !== 'cpc' ? "bg-muted" : ""}
                        readOnly={activeAdsField !== 'cpc'}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleSaveDailyStats} 
          disabled={loading || Object.values(selectedCampaigns).filter(Boolean).length === 0}
        >
          {loading ? "Saving..." : "Save All Ad Stats"}
        </Button>
      </div>
    </div>
  );
};
