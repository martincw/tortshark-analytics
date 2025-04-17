import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBulkStatsData, StatsField } from "@/hooks/useBulkStatsData";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

const statsFields: { id: StatsField; label: string }[] = [
  { id: 'leads', label: 'Leads' },
  { id: 'cases', label: 'Cases' },
  { id: 'revenue', label: 'Revenue ($)' },
  { id: 'adSpend', label: 'Ad Spend ($)' },
];

export const BulkStatsForm: React.FC<BulkStatsFormProps> = ({ startDate }) => {
  const { campaigns, fetchCampaigns } = useCampaign();
  const { uniqueCampaigns, activeField, setActiveField, refreshAfterBulkUpdate } = useBulkStatsData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [weeklyStatsData, setWeeklyStatsData] = useState<Record<string, WeeklyStats>>({});
  const [activeDay, setActiveDay] = useState<string>("0");
  
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    console.log(`BulkStatsForm - Formatting date key for: ${date.toString()}`);
    console.log(`BulkStatsForm - Date components: Year=${year}, Month=${month}, Day=${day}`);
    
    return `${year}-${month}-${day}`;
  };
  
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const newDate = new Date(startDate);
    newDate.setHours(12, 0, 0, 0);
    newDate.setDate(startDate.getDate() + i);
    
    console.log(`BulkStatsForm - Week date ${i}:`, newDate.toString());
    console.log(`BulkStatsForm - Week date ${i} ISO:`, newDate.toISOString());
    
    return newDate;
  });
  
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
    const emptyWeekStats: WeeklyStats = {};
    
    weekDates.forEach(date => {
      const dateKey = formatDateKey(date);
      emptyWeekStats[dateKey] = { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
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
      
      console.log("BulkStatsForm - Selected campaign IDs:", selectedCampaignIds);
      
      const allStatsToAdd = [];
      
      for (const campaignId of selectedCampaignIds) {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        
        for (const date of weekDates) {
          const dateKey = formatDateKey(date);
          const dayStats = campaignWeeklyStats[dateKey] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
          
          console.log(`BulkStatsForm - Processing stats for campaign ${campaignId} on date:`, date.toString());
          console.log(`BulkStatsForm - Date key (YYYY-MM-DD): ${dateKey}`);
          
          const { data: existingRecord, error: checkError } = await supabase
            .from('campaign_stats_history')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('date', dateKey)
            .maybeSingle();
            
          if (checkError) {
            console.error(`BulkStatsForm - Error checking stats for ${campaignId} on ${dateKey}:`, checkError);
            continue;
          }
          
          if (existingRecord) {
            console.log(`BulkStatsForm - Updating existing stats for ${campaignId} on ${dateKey}`);
            const { error: updateError } = await supabase
              .from('campaign_stats_history')
              .update({
                leads: dayStats.leads || 0,
                cases: dayStats.cases || 0,
                retainers: dayStats.cases || 0,
                revenue: dayStats.revenue || 0,
                ad_spend: dayStats.adSpend || 0,
                date: dateKey
              })
              .eq('id', existingRecord.id);
              
            if (updateError) {
              console.error(`BulkStatsForm - Error updating stats for ${campaignId} on ${dateKey}:`, updateError);
              toast.error(`Failed to update stats for ${dateKey}`);
            }
          } else {
            console.log(`BulkStatsForm - Inserting new stats for ${campaignId} on ${dateKey}`);
            allStatsToAdd.push({
              id: uuidv4(),
              campaign_id: campaignId,
              date: dateKey,
              leads: dayStats.leads || 0,
              cases: dayStats.cases || 0,
              retainers: dayStats.cases || 0,
              revenue: dayStats.revenue || 0,
              ad_spend: dayStats.adSpend || 0,
              created_at: new Date().toISOString()
            });
          }
        }
      }
      
      if (allStatsToAdd.length > 0) {
        console.log("BulkStatsForm - Bulk inserting new stats:", allStatsToAdd);
        const { error } = await supabase
          .from('campaign_stats_history')
          .insert(allStatsToAdd);
          
        if (error) {
          console.error("BulkStatsForm - Error adding stats:", error);
          toast.error("Failed to add stats: " + error.message);
          setLoading(false);
          return;
        }
      }
      
      const recentDateKey = formatDateKey(weekDates[weekDates.length - 1]);
      console.log("BulkStatsForm - Recent date key for manual stats:", recentDateKey);
      
      for (const campaignId of selectedCampaignIds) {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        const recentStats = campaignWeeklyStats[recentDateKey] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
        
        const { data: existingManualStats, error: checkManualError } = await supabase
          .from('campaign_manual_stats')
          .select('id')
          .eq('campaign_id', campaignId)
          .maybeSingle();
          
        if (checkManualError) {
          console.error(`BulkStatsForm - Error checking manual stats for ${campaignId}:`, checkManualError);
          continue;
        }
        
        if (existingManualStats) {
          const { error: updateManualError } = await supabase
            .from('campaign_manual_stats')
            .update({
              leads: recentStats.leads || 0,
              cases: recentStats.cases || 0,
              retainers: recentStats.cases || 0,
              revenue: recentStats.revenue || 0,
              date: recentDateKey
            })
            .eq('id', existingManualStats.id);
            
          if (updateManualError) {
            console.error(`BulkStatsForm - Error updating manual stats for ${campaignId}:`, updateManualError);
          }
        } else {
          const { error: insertManualError } = await supabase
            .from('campaign_manual_stats')
            .insert({
              id: uuidv4(),
              campaign_id: campaignId,
              date: recentDateKey,
              leads: recentStats.leads || 0,
              cases: recentStats.cases || 0,
              retainers: recentStats.cases || 0,
              revenue: recentStats.revenue || 0
            });
            
          if (insertManualError) {
            console.error(`BulkStatsForm - Error inserting manual stats for ${campaignId}:`, insertManualError);
          }
        }
      }
      
      refreshAfterBulkUpdate();
      await fetchCampaigns();
      
      toast.success(`Stats added for ${selectedCampaignIds.length} campaigns for the entire week`);
      
      setSelectedCampaigns({});
      setWeeklyStatsData({});
    } catch (err) {
      console.error("BulkStatsForm - Error in submission:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const currentDateKey = formatDateKey(weekDates[parseInt(activeDay)]);
  const formattedActiveDate = format(weekDates[parseInt(activeDay)], "EEE, MMM d");

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 mb-4">
        <Checkbox
          id="select-all"
          checked={uniqueCampaigns.length > 0 && uniqueCampaigns.length === Object.values(selectedCampaigns).filter(Boolean).length}
          onCheckedChange={handleSelectAll}
        />
        <label htmlFor="select-all" className="text-sm font-medium">
          Select All Campaigns
        </label>
      </div>

      <div className="flex justify-between items-center mb-4">
        <Tabs defaultValue="leads" value={activeField} onValueChange={(value) => setActiveField(value as StatsField)}>
          <TabsList>
            {statsFields.map((field) => (
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
        Entering <span className="font-semibold">{statsFields.find(f => f.id === activeField)?.label}</span> for: <span className="font-semibold">{formattedActiveDate}</span>
      </p>

      <div className="grid grid-cols-1 gap-4">
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
                    id={`select-${campaign.id}`}
                    checked={selectedCampaigns[campaign.id] || false}
                    onCheckedChange={() => handleSelectCampaign(campaign.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{campaign.name}</TableCell>
                {weekDates.map((date, index) => {
                  const dateKey = formatDateKey(date);
                  return (
                    <TableCell key={index}>
                      <Input
                        type="number"
                        min="0"
                        step={activeField === 'revenue' || activeField === 'adSpend' ? "0.01" : "1"}
                        value={weeklyStatsData[campaign.id]?.[dateKey]?.[activeField] || ''}
                        onChange={(e) => handleInputChange(campaign.id, dateKey, activeField, e.target.value)}
                        disabled={!selectedCampaigns[campaign.id]}
                        placeholder="0"
                        className="text-center"
                      />
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
