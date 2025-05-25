
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { leadProsperApi } from "@/integrations/leadprosper/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useCampaign } from "@/contexts/CampaignContext";

interface LeadProsperMappingDialogProps {
  campaignId: string;
  campaignName: string;
  onMappingUpdated: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadProsperMappingDialog: React.FC<LeadProsperMappingDialogProps> = ({
  campaignId,
  campaignName,
  onMappingUpdated,
  open,
  onOpenChange
}) => {
  const [selectedTsCampaignId, setSelectedTsCampaignId] = useState<string>('');
  const [isCreatingMapping, setIsCreatingMapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { campaigns: tsCampaigns } = useCampaign();

  useEffect(() => {
    if (open) {
      setSelectedTsCampaignId('');
      setError(null);
    }
  }, [open]);

  const handleCreateMapping = async () => {
    if (!selectedTsCampaignId) {
      toast.error("Please select a TortShark campaign");
      return;
    }

    setIsCreatingMapping(true);
    
    try {
      console.log(`Creating mapping: LP ${campaignId} -> TS ${selectedTsCampaignId}`);
      
      // Find the external campaign UUID for the selected LP campaign ID
      const { data: externalCampaigns, error: fetchError } = await supabase
        .from('external_lp_campaigns')
        .select('id')
        .eq('lp_campaign_id', parseInt(campaignId))
        .single();

      if (fetchError || !externalCampaigns) {
        throw new Error("Lead Prosper campaign not found in database");
      }

      const success = await leadProsperApi.createCampaignMapping(
        externalCampaigns.id, 
        selectedTsCampaignId
      );
      
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
          <DialogTitle>Map Lead Prosper Campaign</DialogTitle>
          <DialogDescription>
            Connect "{campaignName}" to a TortShark campaign for automatic lead data import
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
            <label className="text-sm font-medium">Select TortShark Campaign</label>
            <Select value={selectedTsCampaignId} onValueChange={setSelectedTsCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a campaign..." />
              </SelectTrigger>
              <SelectContent>
                {tsCampaigns && tsCampaigns.length > 0 ? (
                  tsCampaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem disabled value="none">
                    No campaigns available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {(!tsCampaigns || tsCampaigns.length === 0) && (
              <p className="text-xs text-muted-foreground">
                No TortShark campaigns available. Please create a campaign first.
              </p>
            )}
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateMapping}
              disabled={!selectedTsCampaignId || isCreatingMapping || !tsCampaigns?.length}
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

export default LeadProsperMappingDialog;
