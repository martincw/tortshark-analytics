
import React, { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { hyrosApi } from '@/integrations/hyros/client';
import { useCampaign } from '@/contexts/CampaignContext';
import { HyrosCampaign, HyrosMapping } from '@/integrations/hyros/types';

interface HyrosMappingDialogProps {
  open: boolean;
  hyrosCampaign: HyrosCampaign;
  onMappingCreated: (mapping: HyrosMapping) => void;
  onCancel: () => void;
}

export default function HyrosMappingDialog({
  open,
  hyrosCampaign,
  onMappingCreated,
  onCancel
}: HyrosMappingDialogProps) {
  const { toast } = useToast();
  const { campaigns } = useCampaign();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleMapping = async () => {
    if (!selectedCampaignId) {
      setError("Please select a campaign");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const mapping = await hyrosApi.mapCampaign(hyrosCampaign.hyrosCampaignId, selectedCampaignId);
      
      onMappingCreated(mapping);
    } catch (error) {
      console.error("Error mapping campaign:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
      toast({
        title: "Error",
        description: "Failed to map campaign. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const activeCampaigns = campaigns?.filter(c => c.is_active) || [];
  
  return (
    <Dialog open={open} onOpenChange={open => !open && onCancel()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Map HYROS Campaign</DialogTitle>
          <DialogDescription>
            Select a TortShark campaign to map to "{hyrosCampaign.name}"
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="campaign">TortShark Campaign</Label>
            <Select
              value={selectedCampaignId}
              onValueChange={setSelectedCampaignId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {activeCampaigns.length === 0 ? (
                  <SelectItem value="" disabled>No campaigns available</SelectItem>
                ) : (
                  activeCampaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleMapping} disabled={loading || !selectedCampaignId}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mapping...
              </>
            ) : (
              'Map Campaign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
