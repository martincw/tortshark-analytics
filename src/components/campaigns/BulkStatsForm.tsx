
import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format, addDays, parseISO } from "date-fns";
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
  retainers: number;
  revenue: number;
};

type WeeklyStats = {
  [key: string]: DailyStats; // key is the date string in format YYYY-MM-DD
};

const statsFields: { id: StatsField; label: string }[] = [
  { id: 'adSpend', label: 'Ad Spend ($)' },
  { id: 'leads', label: 'Leads' },
  { id: 'cases', label: 'Cases' },
  { id: 'revenue', label: 'Revenue ($)' },
];

export const BulkStatsForm: React.FC<BulkStatsFormProps> = ({ startDate }) => {
  const { campaigns } = useCampaign();
  const { uniqueCampaigns, activeField, setActiveField } = useBulkStatsData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [weeklyStatsData, setWeeklyStatsData] = useState<Record<string, WeeklyStats>>({}); // campaign_id -> { date -> stats }
  const [activeDay, setActiveDay] = useState<string>("0"); // Changed to string to match TabsTrigger value
  
  // Generate dates for the week
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    // Create a new date with the time set to noon to avoid timezone issues
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    date.setHours(12, 0, 0, 0);
    return date;
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
          // Format date as YYYY-MM-DD string without any timezone conversion
          // This ensures the date is stored exactly as shown to the user
          const dateKey = format(date, "yyyy-MM-dd");
          const dayStats = campaignWeeklyStats[dateKey] || { leads: 0, cases: 0, retainers: 0, revenue: 0 };
          
          // For each date, check if a record already exists
          const { data: existingRecord, error: checkError } = await supabase
            .from('campaign_stats_history')
            .select('id')
            .eq('campaign_id', campaignId)
            .eq('date', dateKey)
            .maybeSingle();
            
          if (checkError) {
            console.error(`Error checking stats for ${campaignId} on ${dateKey}:`, checkError);
            continue;
          }
          
          if (existingRecord) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('campaign_stats_history')
              .update({
                leads: dayStats.leads || 0,
                cases: dayStats.cases || 0,
                retainers: dayStats.retainers || 0,
                revenue: dayStats.revenue || 0,
                ad_spend: activeField === 'adSpend' ? parseFloat(document.getElementById(`${campaignId}-adSpend`)?.getAttribute('value') || '0') : 0
              })
              .eq('id', existingRecord.id);
              
            if (updateError) {
              console.error(`Error updating stats for ${campaignId} on ${dateKey}:`, updateError);
              toast.error(`Failed to update stats for ${dateKey}`);
            }
          } else {
            // Insert new record
            allStatsToAdd.push({
              id: uuidv4(),
              campaign_id: campaignId,
              date: dateKey,
              leads: dayStats.leads || 0,
              cases: dayStats.cases || 0,
              retainers: dayStats.retainers || 0,
              revenue: dayStats.revenue || 0,
              ad_spend: activeField === 'adSpend' ? parseFloat(document.getElementById(`${campaignId}-adSpend`)?.getAttribute('value') || '0') : 0,
              created_at: new Date().toISOString()
            });
          }
        }
      }
      
      // Insert all new stats at once
      if (allStatsToAdd.length > 0) {
        const { error } = await supabase
          .from('campaign_stats_history')
          .insert(allStatsToAdd);
          
        if (error) {
          console.error("Error adding stats:", error);
          toast.error("Failed to add stats: " + error.message);
          setLoading(false);
          return;
        }
      }
      
      // Update current stats with the most recent day's data
      const recentDateKey = format(weekDates[weekDates.length - 1], "yyyy-MM-dd");
      
      for (const campaignId of selectedCampaignIds) {
        const campaignWeeklyStats = weeklyStatsData[campaignId] || {};
        const recentStats = campaignWeeklyStats[recentDateKey] || { leads: 0, cases: 0, retainers: 0, revenue: 0 };
        
        // Check if manual stats already exist for this campaign
        const { data: existingManualStats, error: checkManualError } = await supabase
          .from('campaign_manual_stats')
          .select('id')
          .eq('campaign_id', campaignId)
          .maybeSingle();
          
        if (checkManualError) {
          console.error(`Error checking manual stats for ${campaignId}:`, checkManualError);
          continue;
        }
        
        if (existingManualStats) {
          // Update existing manual stats
          const { error: updateManualError } = await supabase
            .from('campaign_manual_stats')
            .update({
              leads: recentStats.leads || 0,
              cases: recentStats.cases || 0,
              retainers: recentStats.retainers || 0,
              revenue: recentStats.revenue || 0,
              date: recentDateKey
            })
            .eq('id', existingManualStats.id);
            
          if (updateManualError) {
            console.error(`Error updating manual stats for ${campaignId}:`, updateManualError);
          }
        } else {
          // Insert new manual stats
          const { error: insertManualError } = await supabase
            .from('campaign_manual_stats')
            .insert({
              id: uuidv4(),
              campaign_id: campaignId,
              date: recentDateKey,
              leads: recentStats.leads || 0,
              cases: recentStats.cases || 0,
              retainers: recentStats.retainers || 0,
              revenue: recentStats.revenue || 0
            });
            
          if (insertManualError) {
            console.error(`Error inserting manual stats for ${campaignId}:`, insertManualError);
          }
        }
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
        <Tabs defaultValue="adSpend" value={activeField} onValueChange={(value) => setActiveField(value as StatsField)}>
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
        {activeField === 'adSpend' ? (
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
                    const dateKey = format(date, "yyyy-MM-dd");
                    return (
                      <TableCell key={index}>
                        <Input
                          id={`${campaign.id}-adSpend`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={weeklyStatsData[campaign.id]?.[dateKey]?.revenue || ''}
                          onChange={(e) => handleInputChange(campaign.id, dateKey, 'revenue', e.target.value)}
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
        ) : (
          <>
            <div className="grid grid-cols-6 gap-4 p-2 font-medium bg-muted rounded-md">
              <div className="col-span-2">Campaign</div>
              <div className="col-span-1 text-center">Ad Spend ($)</div>
              <div className="col-span-1 text-center">Leads</div>
              <div className="col-span-1 text-center">Cases</div>
              <div className="col-span-1 text-center">Revenue ($)</div>
            </div>

            {uniqueCampaigns.map((campaign) => (
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
                        step="0.01"
                        value={weeklyStatsData[campaign.id]?.[currentDateKey]?.adSpend || ''}
                        onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'adSpend', e.target.value)}
                        disabled={!selectedCampaigns[campaign.id] || activeField !== 'adSpend'}
                        placeholder="0"
                        className={activeField !== 'adSpend' ? "bg-muted" : ""}
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="0"
                        value={weeklyStatsData[campaign.id]?.[currentDateKey]?.leads || ''}
                        onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'leads', e.target.value)}
                        disabled={!selectedCampaigns[campaign.id] || activeField !== 'leads'}
                        placeholder="0"
                        className={activeField !== 'leads' ? "bg-muted" : ""}
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="0"
                        value={weeklyStatsData[campaign.id]?.[currentDateKey]?.cases || ''}
                        onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'cases', e.target.value)}
                        disabled={!selectedCampaigns[campaign.id] || activeField !== 'cases'}
                        placeholder="0"
                        className={activeField !== 'cases' ? "bg-muted" : ""}
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={weeklyStatsData[campaign.id]?.[currentDateKey]?.revenue || ''}
                        onChange={(e) => handleInputChange(campaign.id, currentDateKey, 'revenue', e.target.value)}
                        disabled={!selectedCampaigns[campaign.id] || activeField !== 'revenue'}
                        placeholder="0"
                        className={activeField !== 'revenue' ? "bg-muted" : ""}
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
          onClick={handleSubmit} 
          disabled={loading || Object.values(selectedCampaigns).filter(Boolean).length === 0}
        >
          {loading ? "Saving..." : "Save All Stats"}
        </Button>
      </div>
    </div>
  );
};
