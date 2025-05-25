
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { leadProsperApi } from "@/integrations/leadprosper/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LeadProsperMappingDialogProps {
  campaignId: string;
  campaignName: string;
  onMappingUpdated: () => void;
}

interface LeadProsperCampaign {
  id: number;
  name: string;
  status: string;
}

const LeadProsperMappingDialog: React.FC<LeadProsperMappingDialogProps> = ({
  campaignId,
  campaignName,
  onMappingUpdated
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<LeadProsperCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
    }
  }, [isOpen]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Loading Lead Prosper campaigns for mapping...");
      
      // Check if Lead Prosper is connected
      const { isConnected } = await leadProsperApi.checkConnection();
      if (!isConnected) {
        setError("Lead Prosper is not connected. Please connect your account first.");
        return;
      }

      const fetchedCampaigns = await leadProsperApi.fetchCampaigns();
      console.log("Fetched campaigns:", fetchedCampaigns);
      
      setCampaigns(fetchedCampaigns);
      
      if (fetchedCampaigns.length === 0) {
        setError("No campaigns found in your Lead Prosper account.");
      }
    } catch (err) {
      console.error("Error loading campaigns:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Lead Prosper campaigns';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMapping = async () => {
    if (!selectedCampaignId) {
      toast.error("Please select a Lead Prosper campaign");
      return;
    }

    setIsCreatingMapping(true);
    
    try {
      console.log(`Creating mapping: LP ${selectedCampaignId} -> TS ${campaignId}`);
      
      // Find the external campaign UUID for the selected LP campaign ID
      const { data: externalCampaigns, error: fetchError } = await supabase
        .from('external_lp_campaigns')
        .select('id')
        .eq('lp_campaign_id', parseInt(selectedCampaignId))
        .single();

      if (fetchError || !externalCampaigns) {
        throw new Error("Lead Prosper campaign not found in database");
      }

      const success = await leadProsperApi.createCampaignMapping(
        externalCampaigns.id, 
        campaignId
      );
      
      if (success) {
        toast.success("Campaign mapping created successfully");
        setIsOpen(false);
        onMappingUpdated();
      } else {
        throw new Error("Failed to create mapping");
      }
    } catch (err) {
      console.error("Error creating mapping:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create mapping';
      toast.error(errorMessage);
    } finally {
      setIsCreatingMapping(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Link2 className="h-4 w-4 mr-2" />
          Map Lead Prosper Campaign
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Map Lead Prosper Campaign</DialogTitle>
          <DialogDescription>
            Connect "{campaignName}" to a Lead Prosper campaign for automatic lead data import
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length > 0 ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Lead Prosper Campaign</label>
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a campaign..." />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id.toString()}>
                        <div className="flex items-center justify-between w-full">
                          <span>{campaign.name}</span>
                          <Badge variant="outline" className="ml-2">
                            {campaign.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateMapping}
                  disabled={!selectedCampaignId || isCreatingMapping}
                >
                  {isCreatingMapping && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Mapping
                </Button>
              </div>
            </>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No Lead Prosper campaigns available. Please check your connection and try again.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadProsperMappingDialog;
