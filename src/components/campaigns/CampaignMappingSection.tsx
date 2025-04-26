
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { campaignMappingService } from "@/services/campaignMappingService";
import { toast } from "sonner";

interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
}

interface CampaignMapping {
  id: string;
  google_account_id: string;
  google_campaign_id: string;
  google_campaign_name: string;
  is_active: boolean;
  last_synced: string | null;
}

interface CampaignMappingSectionProps {
  campaignId: string;
  availableAccounts: {
    id: string;
    name: string;
    platform: string;
  }[];
}

export function CampaignMappingSection({ campaignId, availableAccounts }: CampaignMappingSectionProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [availableCampaigns, setAvailableCampaigns] = useState<GoogleCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [mappings, setMappings] = useState<CampaignMapping[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMappings = async () => {
    try {
      const mappings = await campaignMappingService.getMappingsForCampaign(campaignId);
      setMappings(mappings);
    } catch (error) {
      console.error("Error loading mappings:", error);
      toast.error("Failed to load campaign mappings");
    }
  };

  useEffect(() => {
    loadMappings();
  }, [campaignId]);

  const handleAccountChange = async (accountId: string) => {
    setSelectedAccount(accountId);
    setSelectedCampaign("");
    setIsLoading(true);

    try {
      const campaigns = await campaignMappingService.listAvailableCampaigns(accountId);
      setAvailableCampaigns(campaigns);
    } catch (error) {
      console.error("Error loading campaigns:", error);
      toast.error("Failed to load Google Ads campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMapping = async () => {
    if (!selectedAccount || !selectedCampaign) return;

    const campaign = availableCampaigns.find(c => c.id === selectedCampaign);
    if (!campaign) return;

    try {
      await campaignMappingService.createMapping(
        campaignId,
        selectedAccount,
        campaign.id,
        campaign.name
      );
      
      toast.success("Campaign mapping added successfully");
      await loadMappings();
      
      // Reset selections
      setSelectedAccount("");
      setSelectedCampaign("");
      setAvailableCampaigns([]);
    } catch (error) {
      console.error("Error adding mapping:", error);
      toast.error("Failed to add campaign mapping");
    }
  };

  const handleDeleteMapping = async (mapping: CampaignMapping) => {
    try {
      await campaignMappingService.deleteMapping(
        campaignId,
        mapping.google_account_id,
        mapping.google_campaign_id
      );
      
      toast.success("Campaign mapping removed successfully");
      await loadMappings();
    } catch (error) {
      console.error("Error removing mapping:", error);
      toast.error("Failed to remove campaign mapping");
    }
  };

  const googleAccounts = availableAccounts.filter(account => account.platform === "google");

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Google Ads Campaign Mappings</h3>
      
      {googleAccounts.length === 0 ? (
        <Alert>
          <AlertDescription>
            No Google Ads accounts connected. Please connect a Google Ads account first.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Google Ads Account</label>
              <Select value={selectedAccount} onValueChange={handleAccountChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {googleAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Google Ads Campaign</label>
              <Select 
                value={selectedCampaign} 
                onValueChange={setSelectedCampaign}
                disabled={!selectedAccount || isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Loading campaigns..." : "Select a campaign"} />
                </SelectTrigger>
                <SelectContent>
                  {availableCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleAddMapping}
            disabled={!selectedAccount || !selectedCampaign}
          >
            Add Campaign Mapping
          </Button>

          {mappings.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-medium">Mapped Campaigns</h4>
              <div className="space-y-2">
                {mappings.map((mapping) => {
                  const account = googleAccounts.find(a => a.id === mapping.google_account_id);
                  return (
                    <div 
                      key={mapping.id} 
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{mapping.google_campaign_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {account?.name || mapping.google_account_id}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {mapping.last_synced && (
                          <Badge variant="secondary" className="font-normal">
                            Last synced: {new Date(mapping.last_synced).toLocaleDateString()}
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMapping(mapping)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
