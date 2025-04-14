import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { StatHistoryEntry } from "@/types/campaign";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BulkStatsFormProps {
  selectedDate: Date;
}

export const BulkStatsForm: React.FC<BulkStatsFormProps> = ({ selectedDate }) => {
  const { campaigns } = useCampaign();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, boolean>>({});
  const [statsData, setStatsData] = useState<Record<string, {
    leads: number;
    cases: number;
    retainers: number;
    revenue: number;
  }>>({});

  const handleSelectAll = () => {
    const allSelected = campaigns.length === Object.values(selectedCampaigns).filter(Boolean).length;
    const newSelected = {};
    
    campaigns.forEach(campaign => {
      newSelected[campaign.id] = !allSelected;
      
      if (!allSelected && !statsData[campaign.id]) {
        setStatsData(prev => ({
          ...prev,
          [campaign.id]: { leads: 0, cases: 0, retainers: 0, revenue: 0 }
        }));
      }
    });
    
    setSelectedCampaigns(newSelected);
  };

  const handleSelectCampaign = (campaignId: string) => {
    setSelectedCampaigns(prev => ({
      ...prev,
      [campaignId]: !prev[campaignId]
    }));
    
    if (!selectedCampaigns[campaignId] && !statsData[campaignId]) {
      setStatsData(prev => ({
        ...prev,
        [campaignId]: { leads: 0, cases: 0, retainers: 0, revenue: 0 }
      }));
    }
  };

  const handleInputChange = (campaignId: string, field: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    setStatsData(prev => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] || { leads: 0, cases: 0, retainers: 0, revenue: 0 }),
        [field]: numValue
      }
    }));
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
      
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      
      const statsToAdd = selectedCampaignIds.map(campaignId => {
        const stats = statsData[campaignId] || { leads: 0, cases: 0, retainers: 0, revenue: 0 };
        
        return {
          id: uuidv4(),
          campaign_id: campaignId,
          date: formattedDate,
          leads: stats.leads || 0,
          cases: stats.cases || 0,
          retainers: stats.retainers || 0,
          revenue: stats.revenue || 0,
          created_at: new Date().toISOString()
        };
      });
      
      const { error } = await supabase
        .from('campaign_stats_history')
        .upsert(statsToAdd, { 
          onConflict: 'campaign_id,date',
          ignoreDuplicates: false
        });
        
      if (error) {
        console.error("Error adding stats:", error);
        toast.error("Failed to add stats: " + error.message);
        setLoading(false);
        return;
      }
      
      const manualStatsToAdd = selectedCampaignIds.map(campaignId => {
        const stats = statsData[campaignId] || { leads: 0, cases: 0, retainers: 0, revenue: 0 };
        
        return {
          id: uuidv4(),
          campaign_id: campaignId,
          date: formattedDate,
          leads: stats.leads || 0,
          cases: stats.cases || 0,
          retainers: stats.retainers || 0,
          revenue: stats.revenue || 0
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
      
      toast.success(`Stats added for ${selectedCampaignIds.length} campaigns`);
      
      setSelectedCampaigns({});
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
                    value={statsData[campaign.id]?.leads || ''}
                    onChange={(e) => handleInputChange(campaign.id, 'leads', e.target.value)}
                    disabled={!selectedCampaigns[campaign.id]}
                    placeholder="0"
                  />
                </div>
                
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="0"
                    value={statsData[campaign.id]?.cases || ''}
                    onChange={(e) => handleInputChange(campaign.id, 'cases', e.target.value)}
                    disabled={!selectedCampaigns[campaign.id]}
                    placeholder="0"
                  />
                </div>
                
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="0"
                    value={statsData[campaign.id]?.retainers || ''}
                    onChange={(e) => handleInputChange(campaign.id, 'retainers', e.target.value)}
                    disabled={!selectedCampaigns[campaign.id]}
                    placeholder="0"
                  />
                </div>
                
                <div className="col-span-1">
                  <Input
                    type="number"
                    min="0"
                    value={statsData[campaign.id]?.revenue || ''}
                    onChange={(e) => handleInputChange(campaign.id, 'revenue', e.target.value)}
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
