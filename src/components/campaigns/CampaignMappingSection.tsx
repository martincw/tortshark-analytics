
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { CampaignMappingDialog } from "@/components/accounts/CampaignMappingDialog";
import { CardHeader, CardTitle, CardDescription, CardContent, Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";

interface CampaignMappingSectionProps {
  campaignId: string;
  availableAccounts: any[];
}

export default function CampaignMappingSection({ campaignId, availableAccounts }: CampaignMappingSectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const { campaigns } = useCampaign();
  
  // Find the current campaign object for use in the mapping dialog
  const currentCampaign = campaigns?.find(c => c.id === campaignId);
  const campaignsForMapping = currentCampaign ? [currentCampaign] : [];
  
  // Get the selected account ID based on the current campaign
  const selectedAccountId = currentCampaign?.accountId || "";

  useEffect(() => {
    // Find campaign name from campaigns context or availableAccounts
    if (campaignId) {
      const campaign = campaigns?.find(c => c.id === campaignId) || 
                       availableAccounts?.find(a => a.id === campaignId);
      if (campaign) {
        setCampaignName(campaign.name || "Campaign");
      }
    }
  }, [campaignId, campaigns, availableAccounts]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>External Integrations</CardTitle>
        <CardDescription>
          Map this campaign to external platforms for automatic data import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Integration Update</AlertTitle>
          <AlertDescription className="text-blue-700">
            External integrations are being reimplemented. New functionality will be available soon.
          </AlertDescription>
        </Alert>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Campaign Mappings</h3>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              Map Campaign
            </Button>
          </div>
          
          {/* Campaign Mapping Dialog */}
          <CampaignMappingDialog 
            isOpen={isDialogOpen} 
            onClose={() => {
              setIsDialogOpen(false);
            }} 
            accountId={selectedAccountId}
            campaigns={campaignsForMapping} 
          />
          
          <div className="text-center py-4 text-muted-foreground text-sm">
            Campaign mapping functionality is being reimplemented
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
