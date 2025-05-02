
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { Input } from "@/components/ui/input";
import { formatSafeDate, subDays } from "@/lib/utils/ManualDateUtils";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

interface AddStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddStatsDialog: React.FC<AddStatsDialogProps> = ({ open, onOpenChange }) => {
  const { campaigns, fetchCampaigns } = useCampaign();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [statsDate, setStatsDate] = useState<Date>(() => {
    // Default to yesterday
    return subDays(new Date(), 1);
  });
  const [leads, setLeads] = useState<number>(0);
  const [cases, setCases] = useState<number>(0);
  const [adSpend, setAdSpend] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCampaignId(campaigns.length > 0 ? campaigns[0].id : "");
      setStatsDate(subDays(new Date(), 1));
      setLeads(0);
      setCases(0);
      setAdSpend(0);
      setRevenue(0);
    }
  }, [open, campaigns]);

  const handleSubmit = async () => {
    if (!selectedCampaignId) {
      toast.error("Please select a campaign");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const dateString = statsDate.toISOString().split('T')[0];
      
      // Check if there's existing data for this date and campaign
      const { data: existingData, error: checkError } = await supabase
        .from('campaign_stats_history')
        .select('id')
        .eq('campaign_id', selectedCampaignId)
        .eq('date', dateString)
        .maybeSingle();
        
      if (checkError) {
        console.error("Error checking for existing stats:", checkError);
        toast.error("Error checking for existing data");
        return;
      }
      
      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('campaign_stats_history')
          .update({
            leads,
            cases,
            retainers: cases, // Using cases as retainers
            revenue,
            ad_spend: adSpend
          })
          .eq('id', existingData.id);
          
        if (updateError) {
          throw new Error(`Error updating stats: ${updateError.message}`);
        }
        
        toast.success("Stats updated successfully");
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('campaign_stats_history')
          .insert({
            id: uuidv4(),
            campaign_id: selectedCampaignId,
            date: dateString,
            leads,
            cases,
            retainers: cases, // Using cases as retainers
            revenue,
            ad_spend: adSpend
          });
          
        if (insertError) {
          throw new Error(`Error adding stats: ${insertError.message}`);
        }
        
        toast.success("Stats added successfully");
      }
      
      // Also update the campaign's manual stats to reflect the latest entry
      const { error: manualStatsError } = await supabase
        .from('campaign_manual_stats')
        .upsert({
          campaign_id: selectedCampaignId,
          leads,
          cases,
          retainers: cases,
          revenue,
          date: dateString
        }, {
          onConflict: 'campaign_id'
        });
      
      if (manualStatsError) {
        console.error("Error updating manual stats:", manualStatsError);
      }
      
      // Refresh data
      await fetchCampaigns();
      
      // Close dialog
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting stats:", error);
      toast.error("Error saving stats: " + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Campaign Stats</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="campaign">Campaign</Label>
            <Select 
              value={selectedCampaignId} 
              onValueChange={setSelectedCampaignId}
            >
              <SelectTrigger id="campaign">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <DatePicker
              date={statsDate}
              onSelect={(date) => date && setStatsDate(date)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {statsDate ? formatSafeDate(statsDate.toISOString(), "EEEE, MMMM d, yyyy") : "Select a date"}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="leads">Leads</Label>
              <Input
                id="leads"
                type="number"
                min="0"
                value={leads || ""}
                onChange={(e) => setLeads(Number(e.target.value))}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="cases">Cases</Label>
              <Input
                id="cases"
                type="number"
                min="0"
                value={cases || ""}
                onChange={(e) => setCases(Number(e.target.value))}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="adSpend">Ad Spend ($)</Label>
              <Input
                id="adSpend"
                type="number"
                min="0"
                step="0.01"
                value={adSpend || ""}
                onChange={(e) => setAdSpend(Number(e.target.value))}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="revenue">Revenue ($)</Label>
              <Input
                id="revenue"
                type="number"
                min="0"
                step="0.01"
                value={revenue || ""}
                onChange={(e) => setRevenue(Number(e.target.value))}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Stats"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
