
import React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountConnection } from "@/types/campaign";

interface CampaignDetailsSectionProps {
  campaignName: string;
  setCampaignName: (value: string) => void;
  platform: "google";
  accountId: string;
  setAccountId: (value: string) => void;
  availableAccounts: AccountConnection[];
}

const CampaignDetailsSection: React.FC<CampaignDetailsSectionProps> = ({
  campaignName,
  setCampaignName,
  platform,
  accountId,
  setAccountId,
  availableAccounts,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Campaign Name *
        </label>
        <Input
          id="name"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="e.g., Rideshare - Search"
          required
        />
        <p className="text-xs text-muted-foreground">
          Start with the tort type, e.g., "Rideshare", "LDS", "MD", or "Wildfire"
        </p>
      </div>
      <div className="space-y-2">
        <label htmlFor="platform" className="text-sm font-medium">
          Platform *
        </label>
        <div className="w-full p-2 border rounded-md bg-muted/30 text-sm">
          Google Ads
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="account" className="text-sm font-medium">
          Account 
        </label>
        <Select
          value={accountId}
          onValueChange={setAccountId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manual">Manual Entry (No Account)</SelectItem>
            {availableAccounts.filter(acc => acc.id !== "manual").map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name} (Google Ads)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Manual account creation only. No automatic syncing available.
        </p>
      </div>
    </div>
  );
};

export default CampaignDetailsSection;
