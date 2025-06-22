import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBulkStatsData } from "@/hooks/useBulkStatsData";
import { formatDateForStorage, createDateAtUTCNoon, subDays } from "@/lib/utils/ManualDateUtils";
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
} from "@/components/ui/dialog";

interface SingleDayBulkStatsFormProps {
  selectedDate: Date;
}

type DailyStats = {
  leads: number;
  cases: number;
  revenue: number;
  adSpend: number;
};

export const SingleDayBulkStatsForm: React.FC<SingleDayBulkStatsFormProps> = ({ selectedDate }) => {
  const { uniqueCampaigns, refreshAfterBulkUpdate } = useBulkStatsData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [statsData, setStatsData] = useState<Record<string, DailyStats>>({});
  const [bulkPasteField, setBulkPasteField] = useState<'leads' | 'cases' | 'revenue' | 'adSpend' | null>(null);
  const [bulkPasteDialogOpen, setBulkPasteDialogOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  
  const dateKey = formatDateForStorage(selectedDate);

  const handleCampaignSelect = async (campaignId: string, isSelected: boolean) => {
    const newSelectedCampaigns = new Set(selectedCampaigns);
    
    if (isSelected) {
      newSelectedCampaigns.add(campaignId);
      
      // Fetch existing stats for this campaign on the selected date
      const { data: existingStats, error } = await supabase
        .from('campaign_stats_history')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('date', dateKey)
        .maybeSingle();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching existing stats:", error);
        toast.error("Failed to load existing stats");
        return;
      }

      // Initialize stats with existing data or defaults
      setStatsData(prev => ({
        ...prev,
        [campaignId]: {
          leads: existingStats?.leads || 0,
          cases: existingStats?.cases || 0,
          revenue: existingStats?.revenue || 0,
          adSpend: existingStats?.ad_spend || 0
        }
      }));
    } else {
      newSelectedCampaigns.delete(campaignId);
      setStatsData(prev => {
        const newData = { ...prev };
        delete newData[campaignId];
        return newData;
      });
    }
    
    setSelectedCampaigns(newSelectedCampaigns);
  };

  const handleInputChange = (campaignId: string, field: keyof DailyStats, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    setStatsData(prev => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 }),
        [field]: numValue
      }
    }));
  };

  const cleanNumericValue = (value: string): number => {
    const cleanedValue = value.replace(/[$,\s]/g, '');
    return cleanedValue === '' ? 0 : parseFloat(cleanedValue);
  };

  const handleBulkPaste = () => {
    if (!bulkPasteField || selectedCampaigns.size === 0) return;

    const values = pasteContent
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(value => {
        const cleanedValue = cleanNumericValue(value);
        return isNaN(cleanedValue) ? 0 : cleanedValue;
      });

    const campaignArray = Array.from(selectedCampaigns);
    const validValues = values.slice(0, campaignArray.length);

    setStatsData(prev => {
      const newData = { ...prev };
      
      validValues.forEach((value, index) => {
        if (index < campaignArray.length) {
          const campaignId = campaignArray[index];
          newData[campaignId] = {
            ...(newData[campaignId] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 }),
            [bulkPasteField]: value
          };
        }
      });

      return newData;
    });

    setBulkPasteDialogOpen(false);
    setPasteContent("");
    setBulkPasteField(null);
    toast.success(`Pasted ${validValues.length} values for ${bulkPasteField}`);
  };

  const handleSubmit = async () => {
    if (!user || selectedCampaigns.size === 0) {
      toast.error("Please select at least one campaign");
      return;
    }
    
    setLoading(true);
    
    try {
      for (const campaignId of selectedCampaigns) {
        const campaignStats = statsData[campaignId] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
        
        const { data: existingRecord, error: checkError } = await supabase
          .from('campaign_stats_history')
          .select('id')
          .eq('campaign_id', campaignId)
          .eq('date', dateKey)
          .maybeSingle();
          
        if (checkError && checkError.code !== 'PGRST116') {
          console.error(`Error checking stats for ${campaignId} on ${dateKey}:`, checkError);
          continue;
        }
        
        if (existingRecord) {
          const { error: updateError } = await supabase
            .from('campaign_stats_history')
            .update({
              leads: campaignStats.leads || 0,
              cases: campaignStats.cases || 0,
              retainers: campaignStats.cases || 0,
              revenue: campaignStats.revenue || 0,
              ad_spend: campaignStats.adSpend || 0,
              date: dateKey
            })
            .eq('id', existingRecord.id);
            
          if (updateError) {
            console.error(`Error updating stats for ${campaignId} on ${dateKey}:`, updateError);
            toast.error(`Failed to update stats for campaign`);
          }
        } else {
          const { error: insertError } = await supabase
            .from('campaign_stats_history')
            .insert({
              id: uuidv4(),
              campaign_id: campaignId,
              date: dateKey,
              leads: campaignStats.leads || 0,
              cases: campaignStats.cases || 0,
              retainers: campaignStats.cases || 0,
              revenue: campaignStats.revenue || 0,
              ad_spend: campaignStats.adSpend || 0,
              created_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error(`Error inserting stats for ${campaignId} on ${dateKey}:`, insertError);
            toast.error(`Failed to add stats for campaign`);
          }
        }
      }
      
      refreshAfterBulkUpdate();
      toast.success("Stats saved successfully");
      
      setSelectedCampaigns(new Set());
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
      <div className="grid grid-cols-1 gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-right">
                Ad Spend ($)
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2"
                  disabled={selectedCampaigns.size === 0}
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
                  disabled={selectedCampaigns.size === 0}
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
                  disabled={selectedCampaigns.size === 0}
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
                  disabled={selectedCampaigns.size === 0}
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
            {uniqueCampaigns.map((campaign) => {
              const isSelected = selectedCampaigns.has(campaign.id);
              const campaignStats = statsData[campaign.id] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
              
              return (
                <TableRow key={campaign.id} className={isSelected ? "bg-muted/50" : ""}>
                  <TableCell>
                    <Checkbox
                      id={`select-${campaign.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) => handleCampaignSelect(campaign.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={isSelected ? (campaignStats.adSpend || '') : ''}
                      onChange={(e) => handleInputChange(campaign.id, 'adSpend', e.target.value)}
                      className="w-24 ml-auto"
                      placeholder="0"
                      disabled={!isSelected}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      value={isSelected ? (campaignStats.leads || '') : ''}
                      onChange={(e) => handleInputChange(campaign.id, 'leads', e.target.value)}
                      className="w-24 ml-auto"
                      placeholder="0"
                      disabled={!isSelected}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      value={isSelected ? (campaignStats.cases || '') : ''}
                      onChange={(e) => handleInputChange(campaign.id, 'cases', e.target.value)}
                      className="w-24 ml-auto"
                      placeholder="0"
                      disabled={!isSelected}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={isSelected ? (campaignStats.revenue || '') : ''}
                      onChange={(e) => handleInputChange(campaign.id, 'revenue', e.target.value)}
                      className="w-24 ml-auto"
                      placeholder="0"
                      disabled={!isSelected}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {selectedCampaigns.size > 0 && (
          <div className="flex justify-end mt-4">
            <Button 
              onClick={handleSubmit} 
              disabled={loading}
            >
              {loading ? "Saving..." : `Save Stats for ${selectedCampaigns.size} Campaign${selectedCampaigns.size > 1 ? 's' : ''}`}
            </Button>
          </div>
        )}
      </div>

      <Dialog open={bulkPasteDialogOpen} onOpenChange={setBulkPasteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Paste {bulkPasteField}</DialogTitle>
            <DialogDescription>
              Paste your data (one value per line) for the selected campaigns. Values will be applied in the order campaigns appear in the table.
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
