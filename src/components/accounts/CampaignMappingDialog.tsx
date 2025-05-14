
import React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Campaign Mapping</DialogTitle>
          <DialogDescription>
            Campaign mapping functionality is being reimplemented
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The integration feature has been temporarily removed and will be reimplemented soon.
          </AlertDescription>
        </Alert>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
