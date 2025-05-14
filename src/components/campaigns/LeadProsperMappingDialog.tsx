
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, LinkIcon } from 'lucide-react';

interface LeadProsperMappingDialogProps {
  campaignId: string;
  campaignName: string;
  onMappingUpdated: () => void;
}

export default function LeadProsperMappingDialog({
  campaignId,
  campaignName,
  onMappingUpdated
}: LeadProsperMappingDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon className="h-4 w-4 mr-2" />
          Lead Prosper Mapping
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Map Lead Prosper Campaign</DialogTitle>
          <DialogDescription>
            Link a Lead Prosper campaign to "{campaignName}" to automatically import leads
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The Lead Prosper integration feature has been temporarily removed and will be reimplemented soon.
          </AlertDescription>
        </Alert>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
