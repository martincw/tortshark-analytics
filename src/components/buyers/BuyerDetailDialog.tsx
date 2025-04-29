
import { useState, useEffect } from "react";
import { CaseBuyer, BuyerTortCoverage } from "@/types/campaign";
import { useBuyers } from "@/hooks/useBuyers";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building, Globe, Mail, User, Phone, BadgeDollarSign, FileEdit, Calendar, Check, X } from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLATFORM_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "phone", label: "Phone" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "signal", label: "Signal" },
  { value: "other", label: "Other" }
];

interface BuyerDetailDialogProps {
  buyerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BuyerDetailDialog({ buyerId, isOpen, onClose }: BuyerDetailDialogProps) {
  const { getBuyerTortCoverage, updateBuyer } = useBuyers();
  const [buyer, setBuyer] = useState<CaseBuyer | null>(null);
  const [tortCoverage, setTortCoverage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [editMode, setEditMode] = useState(false);
  
  // Edit form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("");
  const [notes, setNotes] = useState("");
  const [payoutTerms, setPayoutTerms] = useState("");
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && buyerId) {
      loadBuyerData();
    }
  }, [isOpen, buyerId]);

  const loadBuyerData = async () => {
    setLoading(true);
    try {
      // Fetch buyer details
      const { data: buyerData, error: buyerError } = await supabase
        .from('case_buyers')
        .select('*')
        .eq('id', buyerId)
        .single();
      
      if (buyerError) throw buyerError;
      
      setBuyer(buyerData);
      
      // Reset form state with buyer data
      setName(buyerData.name || "");
      setUrl(buyerData.url || "");
      setContactName(buyerData.contact_name || "");
      setEmail(buyerData.email || "");
      setPlatform(buyerData.platform || "");
      setNotes(buyerData.notes || "");
      setPayoutTerms(buyerData.payout_terms || "");
      
      // Fetch tort coverage
      const coverage = await getBuyerTortCoverage(buyerId);
      setTortCoverage(coverage);
      
    } catch (error) {
      console.error("Error loading buyer data:", error);
      toast.error("Failed to load buyer data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      await updateBuyer(buyerId, {
        name,
        url,
        contact_name: contactName,
        email,
        platform,
        notes,
        payout_terms: payoutTerms
      });
      
      setEditMode(false);
      loadBuyerData(); // Refresh data
    } catch (error) {
      console.error("Error updating buyer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWebsite = () => {
    if (!buyer?.url) {
      toast.error("No website URL available");
      return;
    }

    let fullUrl = buyer.url;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }
    window.open(fullUrl, '_blank');
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px]">
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!buyer) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Buyer Not Found</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p>The requested buyer could not be found.</p>
          </div>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      if (editMode) {
        if (confirm("Discard unsaved changes?")) {
          setEditMode(false);
          onClose();
        }
      } else {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{buyer.name}</DialogTitle>
            {!editMode && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <FileEdit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <DialogDescription>
            Buyer details and tort coverage information
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="coverage">Tort Coverage ({tortCoverage.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="pt-4">
            {editMode ? (
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      Website URL
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
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORM_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setEditMode(false);
                      // Reset form values
                      setName(buyer.name || "");
                      setUrl(buyer.url || "");
                      setContactName(buyer.contact_name || "");
                      setEmail(buyer.email || "");
                      setPlatform(buyer.platform || "");
                      setNotes(buyer.notes || "");
                      setPayoutTerms(buyer.payout_terms || "");
                    }}
                    disabled={isSubmitting}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-1"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-1" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      Company
                    </span>
                    <p className="font-medium">{buyer.name}</p>
                  </div>
                  
                  {buyer.url && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Website
                      </span>
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate max-w-[200px]">{buyer.url}</p>
                        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={openWebsite}>
                          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {buyer.contact_name && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Contact
                      </span>
                      <p>{buyer.contact_name}</p>
                    </div>
                  )}
                  
                  {buyer.email && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </span>
                      <p>{buyer.email}</p>
                    </div>
                  )}
                  
                  {buyer.platform && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Platform</span>
                      <p>{buyer.platform}</p>
                    </div>
                  )}
                  
                  {buyer.payout_terms && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <BadgeDollarSign className="h-3 w-3" />
                        Payout Terms
                      </span>
                      <p>{buyer.payout_terms}</p>
                    </div>
                  )}
                  
                  <div className="space-y-1 md:col-span-2">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <p>{formatDate(buyer.created_at)}</p>
                  </div>
                </div>
                
                {buyer.notes && (
                  <div className="space-y-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Notes</span>
                    <div className="bg-muted/30 p-3 rounded-md whitespace-pre-wrap">
                      {buyer.notes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="coverage" className="pt-4">
            {tortCoverage.length === 0 ? (
              <div className="text-center py-8 border border-dashed rounded-md">
                <p className="text-muted-foreground">No tort coverage configured for this buyer</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3">
                  {tortCoverage.map((coverage) => (
                    <div key={coverage.id} className="flex justify-between items-center p-3 border rounded-md">
                      <div>
                        <div className="font-medium">{coverage.campaigns?.name || "Unknown Campaign"}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <BadgeDollarSign className="h-3.5 w-3.5" />
                          <span>{formatCurrency(coverage.payout_amount)} payout per case</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {!editMode && (
          <DialogFooter className="pt-4">
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
