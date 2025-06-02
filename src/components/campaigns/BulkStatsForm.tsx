import React, { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBulkStatsData } from "@/hooks/useBulkStatsData";
import { formatDateForStorage, createWeekDates } from "@/lib/utils/ManualDateUtils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  [key: string]: DailyStats;
};

export const BulkStatsForm: React.FC<BulkStatsFormProps> = ({ startDate }) => {
  const { uniqueCampaigns, refreshAfterBulkUpdate } = useBulkStatsData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [weeklyStatsData, setWeeklyStatsData] = useState<Record<string, WeeklyStats>>({});
  const [bulkPasteField, setBulkPasteField] = useState<'leads' | 'cases' | 'revenue' | 'adSpend' | null>(null);
  const [bulkPasteDialogOpen, setBulkPasteDialogOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  
  const weekDates = createWeekDates(startDate);
  const weekDateKeys = weekDates.map(date => formatDateForStorage(date));

  const handleCampaignSelect = async (campaignId: string) => {
    // Check if we're selecting or deselecting
    const isDeselecting = selectedCampaign === campaignId;
    
    // Update the selected campaign state
    setSelectedCampaign(isDeselecting ? null : campaignId);
    
    // If deselecting or we already have data, don't fetch
    if (isDeselecting || weeklyStatsData[campaignId]) {
      return;
    }
    
    // Fetch existing stats for this campaign
    const { data: existingStats, error } = await supabase
      .from('campaign_stats_history')
      .select('*')
      .eq('campaign_id', campaignId)
      .in('date', weekDateKeys);
      
    if (error) {
      console.error("Error fetching existing stats:", error);
      toast.error("Failed to load existing stats");
      initializeWeeklyStats(campaignId);
      return;
    }

    // Initialize stats with existing data
    const weekStats: WeeklyStats = {};
    weekDateKeys.forEach(dateKey => {
      const existingStat = existingStats?.find(stat => stat.date === dateKey);
      weekStats[dateKey] = {
        leads: existingStat?.leads || 0,
        cases: existingStat?.cases || 0,
        revenue: existingStat?.revenue || 0,
        adSpend: existingStat?.ad_spend || 0
      };
    });

    setWeeklyStatsData(prev => ({
      ...prev,
      [campaignId]: weekStats
    }));
  };

  const initializeWeeklyStats = (campaignId: string) => {
    const emptyWeekStats: WeeklyStats = {};
    weekDateKeys.forEach(dateKey => {
      emptyWeekStats[dateKey] = { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
    });
    
    setWeeklyStatsData(prev => ({
      ...prev,
      [campaignId]: emptyWeekStats
    }));
  };

  const handleInputChange = (campaignId: string, dateKey: string, field: keyof DailyStats, value: string) => {
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

  // Clean numeric string from currency symbols and formatting
  const cleanNumericValue = (value: string): number => {
    // Remove currency symbols, commas, and other non-numeric characters except decimal points
    const cleanedValue = value.replace(/[$,\s]/g, '');
    return cleanedValue === '' ? 0 : parseFloat(cleanedValue);
  };

  const handleBulkPaste = () => {
    if (!selectedCampaign || !bulkPasteField) return;

    const values = pasteContent
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(value => {
        const cleanedValue = cleanNumericValue(value);
        return isNaN(cleanedValue) ? 0 : cleanedValue;
      });

    // Only take up to 7 values (one week)
    const validValues = values.slice(0, 7);

    setWeeklyStatsData(prev => {
      const campaignStats = { ...(prev[selectedCampaign] || {}) };
      
      validValues.forEach((value, index) => {
        if (index < weekDateKeys.length) {
          const dateKey = weekDateKeys[index];
          campaignStats[dateKey] = {
            ...(campaignStats[dateKey] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 }),
            [bulkPasteField]: value
          };
        }
      });

      return {
        ...prev,
        [selectedCampaign]: campaignStats
      };
    });

    setBulkPasteDialogOpen(false);
    setPasteContent("");
    setBulkPasteField(null);
    toast.success(`Pasted ${validValues.length} values for ${bulkPasteField}`);
  };

  const handleSubmit = async () => {
    if (!user || !selectedCampaign) {
      toast.error("Please select a campaign first");
      return;
    }
    
    setLoading(true);
    
    try {
      const campaignWeeklyStats = weeklyStatsData[selectedCampaign] || {};
      
      for (let i = 0; i < weekDateKeys.length; i++) {
        const dateKey = weekDateKeys[i];
        const dayStats = campaignWeeklyStats[dateKey] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
        
        const { data: existingRecord, error: checkError } = await supabase
          .from('campaign_stats_history')
          .select('id')
          .eq('campaign_id', selectedCampaign)
          .eq('date', dateKey)
          .maybeSingle();
          
        if (checkError) {
          console.error(`Error checking stats for ${selectedCampaign} on ${dateKey}:`, checkError);
          continue;
        }
        
        if (existingRecord) {
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
            console.error(`Error updating stats for ${selectedCampaign} on ${dateKey}:`, updateError);
            toast.error(`Failed to update stats for ${dateKey}`);
          }
        } else {
          const { error: insertError } = await supabase
            .from('campaign_stats_history')
            .insert({
              id: uuidv4(),
              campaign_id: selectedCampaign,
              date: dateKey,
              leads: dayStats.leads || 0,
              cases: dayStats.cases || 0,
              retainers: dayStats.cases || 0,
              revenue: dayStats.revenue || 0,
              ad_spend: dayStats.adSpend || 0,
              created_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error(`Error inserting stats for ${selectedCampaign} on ${dateKey}:`, insertError);
            toast.error(`Failed to add stats for ${dateKey}`);
          }
        }
      }
      
      // Update manual stats with the most recent day's data
      const recentDateKey = weekDateKeys[weekDateKeys.length - 1];
      const recentStats = campaignWeeklyStats[recentDateKey] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
      
      const { data: existingManualStats, error: checkManualError } = await supabase
        .from('campaign_manual_stats')
        .select('id')
        .eq('campaign_id', selectedCampaign)
        .maybeSingle();
        
      if (checkManualError) {
        console.error(`Error checking manual stats for ${selectedCampaign}:`, checkManualError);
      } else {
        if (existingManualStats) {
          await supabase
            .from('campaign_manual_stats')
            .update({
              leads: recentStats.leads || 0,
              cases: recentStats.cases || 0,
              retainers: recentStats.cases || 0,
              revenue: recentStats.revenue || 0,
              date: recentDateKey
            })
            .eq('id', existingManualStats.id);
        } else {
          await supabase
            .from('campaign_manual_stats')
            .insert({
              id: uuidv4(),
              campaign_id: selectedCampaign,
              date: recentDateKey,
              leads: recentStats.leads || 0,
              cases: recentStats.cases || 0,
              retainers: recentStats.cases || 0,
              revenue: recentStats.revenue || 0
            });
        }
      }
      
      refreshAfterBulkUpdate();
      toast.success("Stats saved successfully");
      
      setSelectedCampaign(null);
      setWeeklyStatsData({});
    } catch (err) {
      console.error("Error in submission:", err);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Campaign</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uniqueCampaigns.map((campaign) => (
              <TableRow key={campaign.id} className={selectedCampaign === campaign.id ? "bg-muted/50" : ""}>
                <TableCell>
                  <Checkbox
                    id={`select-${campaign.id}`}
                    checked={selectedCampaign === campaign.id}
                    onCheckedChange={() => handleCampaignSelect(campaign.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{campaign.name}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {selectedCampaign && (
          <div className="mt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">
                    Ad Spend ($)
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        setBulkPasteField('adSpend');
                        setBulkPasteDialogOpen(true);
                      }}
                    >
                      Bulk Paste
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    Leads
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        setBulkPasteField('leads');
                        setBulkPasteDialogOpen(true);
                      }}
                    >
                      Bulk Paste
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    Cases
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        setBulkPasteField('cases');
                        setBulkPasteDialogOpen(true);
                      }}
                    >
                      Bulk Paste
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    Revenue ($)
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        setBulkPasteField('revenue');
                        setBulkPasteDialogOpen(true);
                      }}
                    >
                      Bulk Paste
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weekDates.map((date, index) => {
                  const dateKey = weekDateKeys[index];
                  const dayStats = weeklyStatsData[selectedCampaign]?.[dateKey] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
                  
                  return (
                    <TableRow key={dateKey}>
                      <TableCell className="font-medium">
                        {format(date, "EEE, MMM d")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={dayStats.adSpend || ''}
                          onChange={(e) => handleInputChange(selectedCampaign, dateKey, 'adSpend', e.target.value)}
                          className="w-24 ml-auto"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={dayStats.leads || ''}
                          onChange={(e) => handleInputChange(selectedCampaign, dateKey, 'leads', e.target.value)}
                          className="w-24 ml-auto"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={dayStats.cases || ''}
                          onChange={(e) => handleInputChange(selectedCampaign, dateKey, 'cases', e.target.value)}
                          className="w-24 ml-auto"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={dayStats.revenue || ''}
                          onChange={(e) => handleInputChange(selectedCampaign, dateKey, 'revenue', e.target.value)}
                          className="w-24 ml-auto"
                          placeholder="0"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex justify-end mt-4">
              <Button 
                onClick={handleSubmit} 
                disabled={loading}
              >
                {loading ? "Saving..." : "Save All Stats"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={bulkPasteDialogOpen} onOpenChange={setBulkPasteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Paste {bulkPasteField}</DialogTitle>
            <DialogDescription>
              Paste your data (one value per line) for the week. Only the first 7 values will be used.
              Currency symbols ($) and commas will be automatically removed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Paste your values here, one per line"
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="min-h-[200px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPasteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPaste}>
              Apply Values
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
