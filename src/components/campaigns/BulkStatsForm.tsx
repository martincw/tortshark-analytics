
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCampaign } from "@/contexts/CampaignContext";
import { Campaign } from "@/types/campaign";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export interface BulkStatsFormProps {
  onSubmitComplete?: () => void;
}

export function BulkStatsForm({ onSubmitComplete }: BulkStatsFormProps) {
  const { campaigns, addStatHistoryEntry } = useCampaign();
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form fields
  const [leads, setLeads] = useState("");
  const [cases, setCases] = useState("");
  const [retainers, setRetainers] = useState("");
  const [revenue, setRevenue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const resetForm = () => {
    setLeads("");
    setCases("");
    setRetainers("");
    setRevenue("");
    setDate(new Date().toISOString().split('T')[0]);
    setSelectedCampaigns({});
  };
  
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
    if (!leads && !cases && !retainers && !revenue) {
      toast.error("Please enter at least one value");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Convert values to numbers
      const leadsValue = leads ? parseInt(leads) : 0;
      const casesValue = cases ? parseInt(cases) : 0;
      const retainersValue = retainers ? parseInt(retainers) : 0;
      const revenueValue = revenue ? parseFloat(revenue) : 0;
      
      // Add entries to each selected campaign
      for (const campaignId of selectedCampaignIds) {
        addStatHistoryEntry(campaignId, {
          date,
          leads: leadsValue,
          cases: casesValue,
          retainers: retainersValue,
          revenue: revenueValue
        });
      }
      
      toast.success(`Stats added to ${selectedCampaignIds.length} campaign${selectedCampaignIds.length > 1 ? 's' : ''}`);
      resetForm();
      
      if (onSubmitComplete) {
        onSubmitComplete();
      }
    } catch (error) {
      console.error("Error adding bulk stats:", error);
      toast.error("Failed to add stats");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleSelectAll = () => {
    const allSelected = campaigns.every(c => selectedCampaigns[c.id]);
    
    if (allSelected) {
      // Deselect all
      setSelectedCampaigns({});
    } else {
      // Select all
      const newSelected: Record<string, boolean> = {};
      campaigns.forEach(c => {
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
        <CardTitle>Add Manual Stats in Bulk</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Select Campaigns</h3>
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={toggleSelectAll}
              >
                {campaigns.every(c => selectedCampaigns[c.id]) ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
              {campaigns.length > 0 ? (
                <div className="space-y-2">
                  {campaigns.map(campaign => (
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
                  No campaigns available
                </p>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Stats to Add</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leads">Leads</Label>
                <Input
                  id="leads"
                  type="number"
                  min="0"
                  value={leads}
                  onChange={(e) => setLeads(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cases">Cases</Label>
                <Input
                  id="cases"
                  type="number"
                  min="0"
                  value={cases}
                  onChange={(e) => setCases(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="retainers">Retainers</Label>
                <Input
                  id="retainers"
                  type="number"
                  min="0"
                  value={retainers}
                  onChange={(e) => setRetainers(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="revenue">Revenue ($)</Label>
                <Input
                  id="revenue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
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
              {isSubmitting ? "Adding..." : "Add Stats"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
