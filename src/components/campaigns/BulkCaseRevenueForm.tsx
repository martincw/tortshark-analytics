
import React, { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatDateForStorage } from "@/lib/utils/ManualDateUtils";
import { Loader2, Plus, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CampaignData {
  id: string;
  name: string;
  cases: string;
  revenue: string;
}

interface BulkCaseRevenueFormProps {
  selectedDate: Date;
}

export const BulkCaseRevenueForm: React.FC<BulkCaseRevenueFormProps> = ({ selectedDate }) => {
  const { campaigns, fetchCampaigns } = useCampaign();
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter active campaigns and initialize form data
  useEffect(() => {
    const activeCampaigns = campaigns.filter(campaign => campaign.is_active !== false);
    const initialData = activeCampaigns.map(campaign => ({
      id: campaign.id,
      name: campaign.name,
      cases: "",
      revenue: ""
    }));
    setCampaignData(initialData);
  }, [campaigns]);

  const handleInputChange = (campaignId: string, field: 'cases' | 'revenue', value: string) => {
    setCampaignData(prev =>
      prev.map(campaign =>
        campaign.id === campaignId
          ? { ...campaign, [field]: value }
          : campaign
      )
    );
  };

  const handleBulkPaste = (field: 'cases' | 'revenue', pasteText: string) => {
    const lines = pasteText.trim().split('\n');
    const values = lines.map(line => line.replace(/[$,]/g, '').trim());

    setCampaignData(prev =>
      prev.map((campaign, index) => {
        if (index < values.length && values[index]) {
          return { ...campaign, [field]: values[index] };
        }
        return campaign;
      })
    );

    toast.success(`Pasted ${Math.min(values.length, campaignData.length)} ${field} values`);
  };

  const clearAllData = () => {
    setCampaignData(prev =>
      prev.map(campaign => ({
        ...campaign,
        cases: "",
        revenue: ""
      }))
    );
    toast.success("Cleared all data");
  };

  const handleSubmit = async () => {
    const dateStr = formatDateForStorage(selectedDate);
    
    // Filter campaigns with data
    const campaignsWithData = campaignData.filter(
      campaign => campaign.cases.trim() !== "" || campaign.revenue.trim() !== ""
    );

    if (campaignsWithData.length === 0) {
      toast.error("Please enter cases or revenue data for at least one campaign");
      return;
    }

    setIsSubmitting(true);

    try {
      let successCount = 0;
      let addedCases = 0;
      let addedRevenue = 0;

      for (const campaign of campaignsWithData) {
        const cases = parseInt(campaign.cases) || 0;
        const revenue = parseFloat(campaign.revenue.replace(/[$,]/g, '')) || 0;

        if (cases === 0 && revenue === 0) continue;

        // Check if stats already exist for this date
        const { data: existingStats } = await supabase
          .from('campaign_stats_history')
          .select('*')
          .eq('campaign_id', campaign.id)
          .eq('date', dateStr)
          .single();

        if (existingStats) {
          // Update existing stats by adding to them
          const { error: updateError } = await supabase
            .from('campaign_stats_history')
            .update({
              cases: existingStats.cases + cases,
              revenue: existingStats.revenue + revenue,
            })
            .eq('id', existingStats.id);

          if (updateError) {
            console.error(`Error updating stats for ${campaign.name}:`, updateError);
            toast.error(`Failed to update stats for ${campaign.name}`);
            continue;
          }
        } else {
          // Create new stats entry
          const { error: insertError } = await supabase
            .from('campaign_stats_history')
            .insert({
              campaign_id: campaign.id,
              date: dateStr,
              leads: 0,
              cases: cases,
              retainers: 0,
              revenue: revenue,
              ad_spend: 0,
            });

          if (insertError) {
            console.error(`Error creating stats for ${campaign.name}:`, insertError);
            toast.error(`Failed to create stats for ${campaign.name}`);
            continue;
          }
        }

        successCount++;
        addedCases += cases;
        addedRevenue += revenue;
      }

      if (successCount > 0) {
        toast.success(
          `Successfully added ${addedCases} cases and $${addedRevenue.toFixed(2)} revenue across ${successCount} campaigns`
        );
        
        // Clear form and refresh data
        clearAllData();
        await fetchCampaigns();
      }
    } catch (error) {
      console.error("Error submitting bulk case/revenue data:", error);
      toast.error("Failed to submit data");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCases = campaignData.reduce((sum, campaign) => {
    const cases = parseInt(campaign.cases) || 0;
    return sum + cases;
  }, 0);

  const totalRevenue = campaignData.reduce((sum, campaign) => {
    const revenue = parseFloat(campaign.revenue.replace(/[$,]/g, '')) || 0;
    return sum + revenue;
  }, 0);

  return (
    <div className="space-y-4">
      <Alert>
        <Plus className="h-4 w-4" />
        <AlertDescription>
          <strong>Additive Entry:</strong> Values entered here will be ADDED to any existing stats for this date. 
          This will not overwrite leads, ad spend, or other existing metrics.
        </AlertDescription>
      </Alert>

      <div className="flex gap-4 items-center">
        <div className="flex gap-2">
          <Textarea
            placeholder="Paste cases data (one per line)"
            className="w-40 h-20 resize-none"
            onPaste={(e) => {
              e.preventDefault();
              const pasteText = e.clipboardData.getData('text');
              handleBulkPaste('cases', pasteText);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.readText().then(text => {
                handleBulkPaste('cases', text);
              });
            }}
          >
            <Copy className="h-4 w-4 mr-1" />
            Paste Cases
          </Button>
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="Paste revenue data (one per line)"
            className="w-40 h-20 resize-none"
            onPaste={(e) => {
              e.preventDefault();
              const pasteText = e.clipboardData.getData('text');
              handleBulkPaste('revenue', pasteText);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.readText().then(text => {
                handleBulkPaste('revenue', text);
              });
            }}
          >
            <Copy className="h-4 w-4 mr-1" />
            Paste Revenue
          </Button>
        </div>

        <Button variant="outline" onClick={clearAllData}>
          Clear All
        </Button>
      </div>

      <div className="grid gap-2 max-h-96 overflow-y-auto">
        <div className="grid grid-cols-3 gap-4 font-medium text-sm bg-muted p-2 rounded sticky top-0">
          <div>Campaign</div>
          <div>Cases (+)</div>
          <div>Revenue (+)</div>
        </div>

        {campaignData.map((campaign) => (
          <div key={campaign.id} className="grid grid-cols-3 gap-4 items-center p-2 border rounded">
            <div className="font-medium text-sm">{campaign.name}</div>
            <Input
              type="number"
              min="0"
              value={campaign.cases}
              onChange={(e) => handleInputChange(campaign.id, 'cases', e.target.value)}
              placeholder="0"
              className="text-center"
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              value={campaign.revenue}
              onChange={(e) => handleInputChange(campaign.id, 'revenue', e.target.value)}
              placeholder="0.00"
              className="text-center"
            />
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">
                Total Cases to Add: <span className="font-medium">{totalCases}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Total Revenue to Add: <span className="font-medium">${totalRevenue.toFixed(2)}</span>
              </div>
            </div>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || (totalCases === 0 && totalRevenue === 0)}
              className="ml-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cases & Revenue
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
