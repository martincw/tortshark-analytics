
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCampaign } from "@/contexts/CampaignContext";
import { Campaign } from "@/types/campaign";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface BulkAdsStatsFormProps {
  onSubmitComplete?: () => void;
}

export function BulkAdsStatsForm({ onSubmitComplete }: BulkAdsStatsFormProps) {
  const { campaigns, campaignTypes, updateCampaign } = useCampaign();
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [filterCampaign, setFilterCampaign] = useState<string>("all");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form fields
  const [impressions, setImpressions] = useState("");
  const [clicks, setClicks] = useState("");
  const [adSpend, setAdSpend] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const resetForm = () => {
    setImpressions("");
    setClicks("");
    setAdSpend("");
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedCampaigns({});
  };
  
  // Filter campaigns based on type selection
  const filteredCampaigns = React.useMemo(() => {
    if (filterCampaign === "all") {
      return campaigns;
    }
    
    return campaigns.filter(campaign => campaign.name === filterCampaign);
  }, [campaigns, filterCampaign]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate if at least one campaign is selected
    const selectedCampaignIds = Object.entries(selectedCampaigns)
      .filter(([_, isSelected]) => isSelected)
      .map(([id]) => id);
    
    if (selectedCampaignIds.length === 0) {
      toast.error("Please select at least one campaign");
      return;
    }
    
    // Validate if at least one field has a value
    if (!impressions && !clicks && !adSpend) {
      toast.error("Please enter at least one value");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert values to numbers
      const impressionsValue = impressions ? parseInt(impressions) : 0;
      const clicksValue = clicks ? parseInt(clicks) : 0;
      const adSpendValue = adSpend ? parseFloat(adSpend) : 0;
      
      // Update stats for each selected campaign
      for (const campaignId of selectedCampaignIds) {
        const campaign = campaigns.find(c => c.id === campaignId);
        if (!campaign) continue;
        
        // Calculate CPC if both clicks and ad spend are provided
        let cpc = campaign.stats.cpc;
        if (clicksValue > 0 && adSpendValue > 0) {
          cpc = adSpendValue / clicksValue;
        }
        
        updateCampaign(campaignId, {
          stats: {
            ...campaign.stats,
            impressions: impressionsValue > 0 ? campaign.stats.impressions + impressionsValue : campaign.stats.impressions,
            clicks: clicksValue > 0 ? campaign.stats.clicks + clicksValue : campaign.stats.clicks,
            adSpend: adSpendValue > 0 ? campaign.stats.adSpend + adSpendValue : campaign.stats.adSpend,
            cpc: cpc,
            date: date // Update the date
          }
        });
        
        // Also add to stat history if ad spend is provided
        if (adSpendValue > 0) {
          // Use addStatHistoryEntry with two arguments: campaignId and entry
          const statEntry = {
            date,
            leads: 0,
            cases: 0,
            retainers: 0,
            revenue: 0,
            adSpend: adSpendValue
          };
          // The context function requires these two arguments
          useCampaign().addStatHistoryEntry(campaignId, statEntry);
        }
      }
      
      toast.success(`Ad stats updated for ${selectedCampaignIds.length} campaign${selectedCampaignIds.length > 1 ? 's' : ''}`);
      resetForm();
      
      if (onSubmitComplete) {
        onSubmitComplete();
      }
    } catch (error) {
      console.error("Error updating bulk ad stats:", error);
      toast.error("Failed to update ad stats");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleSelectAll = () => {
    const allSelected = filteredCampaigns.every(c => selectedCampaigns[c.id]);
    
    if (allSelected) {
      // Deselect all
      setSelectedCampaigns({});
    } else {
      // Select all filtered campaigns
      const newSelected: Record<string, boolean> = {};
      filteredCampaigns.forEach(c => {
        newSelected[c.id] = true;
      });
      setSelectedCampaigns(newSelected);
    }
  };
  
  const toggleCampaign = (id: string) => {
    setSelectedCampaigns(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Update Ad Stats in Bulk</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-campaign">Filter by Campaign</Label>
                <Select
                  value={filterCampaign}
                  onValueChange={setFilterCampaign}
                >
                  <SelectTrigger id="filter-campaign">
                    <SelectValue placeholder="All Campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Campaigns</SelectItem>
                    {campaignTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Select Campaigns</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={toggleSelectAll}
              >
                {filteredCampaigns.every(c => selectedCampaigns[c.id]) ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
              {filteredCampaigns.length > 0 ? (
                <div className="space-y-2">
                  {filteredCampaigns.map(campaign => (
                    <div key={campaign.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={campaign.id}
                        checked={!!selectedCampaigns[campaign.id]}
                        onCheckedChange={() => toggleCampaign(campaign.id)}
                      />
                      <Label 
                        htmlFor={campaign.id}
                        className="flex flex-col cursor-pointer"
                      >
                        <span>{campaign.name}</span>
                        <span className="text-xs text-muted-foreground">{campaign.accountName}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No campaigns available for the selected filter
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Ad Stats to Update</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="impressions">Impressions</Label>
                <Input
                  id="impressions"
                  type="number"
                  min="0"
                  value={impressions}
                  onChange={(e) => setImpressions(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clicks">Clicks</Label>
                <Input
                  id="clicks"
                  type="number"
                  min="0"
                  value={clicks}
                  onChange={(e) => setClicks(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adSpend">Ad Spend ($)</Label>
                <Input
                  id="adSpend"
                  type="number"
                  min="0"
                  step="0.01"
                  value={adSpend}
                  onChange={(e) => setAdSpend(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>These values will be added to the current totals for the selected campaigns.</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Ad Stats"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
