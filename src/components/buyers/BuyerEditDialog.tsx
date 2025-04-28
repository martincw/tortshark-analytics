
import { useState, useEffect } from "react";
import { CaseBuyer } from "@/types/campaign";
import { useBuyers } from "@/hooks/useBuyers";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface BuyerEditDialogProps {
  buyer: CaseBuyer;
  isOpen: boolean;
  onClose: () => void;
}

export function BuyerEditDialog({ buyer, isOpen, onClose }: BuyerEditDialogProps) {
  const { updateBuyer } = useBuyers();
  
  const [name, setName] = useState(buyer.name);
  const [url, setUrl] = useState(buyer.url || "");
  const [contactName, setContactName] = useState(buyer.contact_name || "");
  const [email, setEmail] = useState(buyer.email || "");
  const [platform, setPlatform] = useState(buyer.platform || "");
  const [notes, setNotes] = useState(buyer.notes || "");
  const [payoutTerms, setPayoutTerms] = useState(buyer.payout_terms || "");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset form if buyer changes
    setName(buyer.name);
    setUrl(buyer.url || "");
    setContactName(buyer.contact_name || "");
    setEmail(buyer.email || "");
    setPlatform(buyer.platform || "");
    setNotes(buyer.notes || "");
    setPayoutTerms(buyer.payout_terms || "");
  }, [buyer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    
    await updateBuyer(buyer.id, {
      name,
      url,
      contact_name: contactName,
      email,
      platform,
      notes,
      payout_terms: payoutTerms
    });
    
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Buyer</DialogTitle>
          <DialogDescription>
            Update the details for {buyer.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Company Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter company name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-url">Website URL</Label>
            <Input
              id="edit-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-contact-name">Contact Name</Label>
            <Input
              id="edit-contact-name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="John Smith"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-platform">Platform</Label>
            <Input
              id="edit-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Email, SMS, Telegram, etc."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-payout-terms">Payout Terms</Label>
            <Input
              id="edit-payout-terms"
              value={payoutTerms}
              onChange={(e) => setPayoutTerms(e.target.value)}
              placeholder="Net 30, etc."
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Budget information and other notes"
              className="min-h-[100px]"
            />
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
