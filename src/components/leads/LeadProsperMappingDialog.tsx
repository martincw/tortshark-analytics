
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { leadProsperApi } from "@/integrations/leadprosper/client";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface LeadProsperCampaign {
  id: number;
  name: string;
  status: string;
}

interface LeadProsperQuickMappingDialogProps {
  tsCampaignId: string;
  tsCampaignName: string;
  onMappingUpdated: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadProsperQuickMappingDialog: React.FC<LeadProsperQuickMappingDialogProps> = ({
  tsCampaignId,
  tsCampaignName,
  onMappingUpdated,
  open,
  onOpenChange
}) => {
  const [selectedLpCampaignId, setSelectedLpCampaignId] = useState<string>('');
  const [lpCampaigns, setLpCampaigns] = useState<LeadProsperCampaign[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadLeadProsperCampaigns();
      setSelectedLpCampaignId('');
      setError(null);
    }
  }, [open]);

  const loadLeadProsperCampaigns = async () => {
    setIsLoadingCampaigns(true);
    setError(null);
    
    try {
      const campaigns = await leadProsperApi.fetchCampaigns();
      setLpCampaigns(campaigns);
    } catch (err) {
      console.error("Error loading Lead Prosper campaigns:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaigns';
      setError(errorMessage);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const handleCreateMapping = async () => {
    if (!selectedLpCampaignId) {
      toast.error("Please select a Lead Prosper campaign");
      return;
    }

    setIsCreatingMapping(true);
    
    try {
      console.log(`Creating mapping: LP ${selectedLpCampaignId} -> TS ${tsCampaignId}`);
      
      const success = await leadProsperApi.mapCampaign(tsCampaignId, parseInt(selectedLpCampaignId));
      
      if (success) {
        toast.success("Campaign mapping created successfully");
        onOpenChange(false);
        onMappingUpdated();
      } else {
        throw new Error("Failed to create mapping");
      }
    } catch (err) {
      console.error("Error creating mapping:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create mapping';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsCreatingMapping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Map Campaign</DialogTitle>
          <DialogDescription>
            Connect "{tsCampaignName}" to a Lead Prosper campaign for automatic lead data import
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Lead Prosper Campaign</label>
            {isLoadingCampaigns ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">Loading campaigns...</span>
              </div>
            ) : (
              <Select value={selectedLpCampaignId} onValueChange={setSelectedLpCampaignId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a Lead Prosper campaign..." />
                </SelectTrigger>
                <SelectContent>
                  {lpCampaigns && lpCampaigns.length > 0 ? (
                    lpCampaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id.toString()}>
                        {campaign.name} ({campaign.status})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem disabled value="none">
                      No Lead Prosper campaigns available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
            {(!lpCampaigns || lpCampaigns.length === 0) && !isLoadingCampaigns && (
              <p className="text-xs text-muted-foreground">
                No Lead Prosper campaigns available. Please ensure your Lead Prosper connection is active.
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateMapping}
              disabled={!selectedLpCampaignId || isCreatingMapping || isLoadingCampaigns}
            >
              {isCreatingMapping && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Mapping
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadProsperQuickMappingDialog;
