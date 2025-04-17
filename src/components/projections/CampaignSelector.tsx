
import React from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CampaignSelectorProps {
  campaigns: Campaign[];
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
}

export function CampaignSelector({ campaigns, selectedCampaignId, setSelectedCampaignId }: CampaignSelectorProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-md">Select Campaign</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <Label htmlFor="campaign-select">Campaign</Label>
          <Select 
            value={selectedCampaignId} 
            onValueChange={setSelectedCampaignId}
          >
            <SelectTrigger id="campaign-select">
              <SelectValue placeholder="Select a campaign" />
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
        
        {selectedCampaignId && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">Campaign Details</p>
            <div className="space-y-1">
              {campaigns.find(c => c.id === selectedCampaignId)?.platform && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Platform:</span> {campaigns.find(c => c.id === selectedCampaignId)?.platform}
                </p>
              )}
              {campaigns.find(c => c.id === selectedCampaignId)?.accountName && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Account:</span> {campaigns.find(c => c.id === selectedCampaignId)?.accountName}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
