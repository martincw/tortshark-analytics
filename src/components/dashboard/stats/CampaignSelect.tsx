
import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campaign } from "@/types/campaign-base";

interface CampaignSelectProps {
  campaigns: Campaign[];
  selectedCampaignId: string;
  onCampaignChange: (id: string) => void;
}

export const CampaignSelect: React.FC<CampaignSelectProps> = ({
  campaigns,
  selectedCampaignId,
  onCampaignChange
}) => {
  return (
    <div className="grid gap-2">
      <Label htmlFor="campaign">Campaign</Label>
      <Select 
        value={selectedCampaignId} 
        onValueChange={onCampaignChange}
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
  );
};
