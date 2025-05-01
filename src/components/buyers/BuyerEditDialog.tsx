
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
import { Building, Globe, Mail, User, PencilLine, Plus, X, Phone } from "lucide-react";

interface BuyerEditDialogProps {
  buyer: CaseBuyer;
  isOpen: boolean;
  onClose: () => void;
}

export function BuyerEditDialog({ buyer, isOpen, onClose }: BuyerEditDialogProps) {
  const { updateBuyer } = useBuyers();
  
  const [name, setName] = useState(buyer.name);
  const [url, setUrl] = useState(buyer.url || "");
  const [urlSecondary, setUrlSecondary] = useState(buyer.url_secondary || "");
  const [showSecondaryUrl, setShowSecondaryUrl] = useState(!!buyer.url_secondary);
  const [contactName, setContactName] = useState(buyer.contact_name || "");
  const [email, setEmail] = useState(buyer.email || "");
  const [platform, setPlatform] = useState(buyer.platform || "");
  const [notes, setNotes] = useState(buyer.notes || "");
  const [payoutTerms, setPayoutTerms] = useState(buyer.payout_terms || "");
  const [didInbound, setDidInbound] = useState(buyer.did_inbound || "");
  const [didTransfer, setDidTransfer] = useState(buyer.did_transfer || "");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Reset form if buyer changes
    setName(buyer.name);
    setUrl(buyer.url || "");
    setUrlSecondary(buyer.url_secondary || "");
    setShowSecondaryUrl(!!buyer.url_secondary);
    setContactName(buyer.contact_name || "");
    setEmail(buyer.email || "");
    setPlatform(buyer.platform || "");
    setNotes(buyer.notes || "");
    setPayoutTerms(buyer.payout_terms || "");
    setDidInbound(buyer.did_inbound || "");
    setDidTransfer(buyer.did_transfer || "");
  }, [buyer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    
    await updateBuyer(buyer.id, {
      name,
      url,
      url_secondary: showSecondaryUrl ? urlSecondary : null,
      contact_name: contactName,
      email,
      platform,
      notes,
      payout_terms: payoutTerms,
      did_inbound: didInbound,
      did_transfer: didTransfer
    });
    
    setIsSubmitting(false);
    onClose();
  };

  const toggleSecondaryUrl = () => {
    setShowSecondaryUrl(!showSecondaryUrl);
    if (!showSecondaryUrl) {
      setUrlSecondary("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PencilLine className="h-5 w-5 text-primary" />
            Edit {buyer.name}
          </DialogTitle>
          <DialogDescription>
            Update the buyer details and information
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-name" className="flex items-center gap-2">
                <Building className="h-3.5 w-3.5 text-primary" />
                Company Name *
              </Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter company name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-url" className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-primary" />
                Landing Page URL
              </Label>
              <Input
                id="edit-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-platform" className="flex items-center gap-2">
                Platform
              </Label>
              <Input
                id="edit-platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="Email, SMS, Telegram, etc."
              />
            </div>

            {/* Secondary URL with toggle */}
            <div className="space-y-2 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-url-secondary" className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                  Landing Page URL #2
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2"
                  onClick={toggleSecondaryUrl}
                >
                  {showSecondaryUrl ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {showSecondaryUrl && (
                <Input
                  id="edit-url-secondary"
                  value={urlSecondary}
                  onChange={(e) => setUrlSecondary(e.target.value)}
                  placeholder="https://example2.com"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-contact-name" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-primary" />
                Contact Name
              </Label>
              <Input
                id="edit-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email" className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-primary" />
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@example.com"
              />
            </div>

            {/* DID Inbound */}
            <div className="space-y-2">
              <Label htmlFor="edit-did-inbound" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary" />
                DID (Inbound)
              </Label>
              <Input
                id="edit-did-inbound"
                value={didInbound}
                onChange={(e) => setDidInbound(e.target.value)}
                placeholder="(123) 456-7890"
              />
            </div>

            {/* DID Transfer */}
            <div className="space-y-2">
              <Label htmlFor="edit-did-transfer" className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-primary" />
                DID (Transfer)
              </Label>
              <Input
                id="edit-did-transfer"
                value={didTransfer}
                onChange={(e) => setDidTransfer(e.target.value)}
                placeholder="(123) 456-7890"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-payout-terms">Payout Terms</Label>
              <Input
                id="edit-payout-terms"
                value={payoutTerms}
                onChange={(e) => setPayoutTerms(e.target.value)}
                placeholder="Net 30, etc."
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Budget information and other notes"
                className="min-h-[120px]"
              />
            </div>
          </div>
          
          <DialogFooter className="pt-2">
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
