
import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, Link2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { fetchGoogleAdsCampaignsForAccount, mapGoogleAdsCampaignToTortshark } from "@/services/googleAdsConnection";
import { useCampaign } from "@/contexts/CampaignContext";
import { campaignMappingService } from "@/services/campaignMappingService";
import { useAuth } from "@/contexts/AuthContext";

interface CampaignMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  campaigns: any[];
}

export function CampaignMappingDialog({
  isOpen,
  onClose,
  accountId,
  campaigns
}: CampaignMappingDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [googleCampaigns, setGoogleCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedGoogleCampaign, setSelectedGoogleCampaign] = useState<string>("");
  const [mappings, setMappings] = useState<any[]>([]);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { accountConnections } = useCampaign();
  
  const account = accountConnections.find(acc => acc.customerId === accountId);
  
  useEffect(() => {
    if (isOpen && accountId && user) {
      loadGoogleCampaigns();
      loadExistingMappings();
    }
  }, [isOpen, accountId, user]);
  
  const loadGoogleCampaigns = async () => {
    if (!accountId || !account?.customerId) {
      setFetchError("Invalid account selected");
      return;
    }
    
    setIsLoading(true);
    setFetchError(null);
    
    try {
      console.log("Fetching campaigns for account:", account.customerId);
      const campaigns = await fetchGoogleAdsCampaignsForAccount(account.customerId);
      setGoogleCampaigns(campaigns);
      
      if (campaigns.length === 0) {
        setFetchError("No campaigns found for this account. This could be due to an API limitation or no campaigns exist in this account.");
      }
    } catch (error) {
      console.error("Failed to fetch Google Ads campaigns:", error);
      setFetchError(`Could not load Google Ads campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Could not load Google Ads campaigns");
    } finally {
      setIsLoading(false);
    }
  };

  const loadExistingMappings = async () => {
    setIsLoading(true);
    try {
      const allMappings: any[] = [];
      
      for (const campaign of campaigns) {
        try {
          const campaignMappings = await campaignMappingService.getMappingsForCampaign(campaign.id);
          campaignMappings.forEach(mapping => {
            allMappings.push({
              ...mapping,
              tortshark_campaign_name: campaign.name
            });
          });
        } catch (error) {
          console.error(`Error getting mappings for campaign ${campaign.id}:`, error);
        }
      }
      
      const accountMappings = allMappings.filter(mapping => mapping.google_account_id === accountId);
      setMappings(accountMappings);
    } catch (error) {
      console.error("Failed to fetch campaign mappings:", error);
      toast.error("Could not load campaign mappings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMapping = async () => {
    if (!selectedCampaign || !selectedGoogleCampaign) {
      toast.error("Please select both a Tortshark campaign and a Google Ads campaign");
      return;
    }
    
    setIsCreatingMapping(true);
    
    try {
      const googleCampaign = googleCampaigns.find(c => c.id === selectedGoogleCampaign);
      
      if (!googleCampaign) {
        throw new Error("Selected Google campaign not found");
      }
      
      const success = await mapGoogleAdsCampaignToTortshark(
        selectedCampaign,
        accountId,
        googleCampaign.id,
        googleCampaign.name
      );
      
      if (success) {
        toast.success("Campaign successfully mapped");
        loadExistingMappings();
        setSelectedCampaign("");
        setSelectedGoogleCampaign("");
      }
    } catch (error) {
      console.error("Error creating mapping:", error);
      toast.error("Failed to create campaign mapping");
    } finally {
      setIsCreatingMapping(false);
    }
  };

  const handleDeleteMapping = async (mapping: any) => {
    try {
      await campaignMappingService.deleteMapping(
        mapping.tortshark_campaign_id,
        mapping.google_account_id,
        mapping.google_campaign_id
      );
      
      toast.success("Mapping removed successfully");
      loadExistingMappings();
    } catch (error) {
      console.error("Error removing mapping:", error);
      toast.error("Failed to remove mapping");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Map Campaigns for {account?.name || "Google Ads Account"}</DialogTitle>
          <DialogDescription>
            Connect your Google Ads campaigns to your Tortshark campaigns to track performance and manage budgets
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Tortshark Campaign</label>
                <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Google Ads Campaign</label>
                <Select value={selectedGoogleCampaign} onValueChange={setSelectedGoogleCampaign}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      googleCampaigns.length === 0 
                        ? "No Google campaigns available" 
                        : "Select a Google Ads campaign"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {googleCampaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name} {campaign.status && `(${campaign.status})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button 
              onClick={handleCreateMapping}
              disabled={!selectedCampaign || !selectedGoogleCampaign || isCreatingMapping}
              className="w-full"
            >
              {isCreatingMapping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Link2 className="mr-2 h-4 w-4" />
              Create Campaign Mapping
            </Button>
            
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Existing Mappings</h3>
              
              {mappings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tortshark Campaign</TableHead>
                      <TableHead>Google Ads Campaign</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>{mapping.tortshark_campaign_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{mapping.google_campaign_name}</span>
                            <span className="text-xs text-muted-foreground">ID: {mapping.google_campaign_id}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMapping(mapping)}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-4 bg-muted/30 rounded-md">
                  <p className="text-muted-foreground">No campaign mappings found</p>
                </div>
              )}
            </div>
            
            {googleCampaigns.length === 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {fetchError || "No Google Ads campaigns found for this account. Make sure you have campaigns created in Google Ads."}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
