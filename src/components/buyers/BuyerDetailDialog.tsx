
import { useState, useEffect } from "react";
import { CaseBuyer, BuyerTortCoverage } from "@/types/campaign";
import { useBuyers } from "@/hooks/useBuyers";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Building, Globe, Mail, User, Phone, 
  BadgeDollarSign, FileEdit, Calendar, 
  Check, X, Plus, Trash2, LinkIcon, 
  ExternalLink, Shield
} from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddTortCoverageForm } from "./AddTortCoverageForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const { getBuyerTortCoverage, updateBuyer, removeBuyerTortCoverage, updateBuyerTortCoverage } = useBuyers();
  const [buyer, setBuyer] = useState<CaseBuyer | null>(null);
  const [coverages, setCoverages] = useState<BuyerTortCoverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCoverageId, setEditingCoverageId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  
  // Edit form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [url2, setUrl2] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("");
  const [notes, setNotes] = useState("");
  const [payoutTerms, setPayoutTerms] = useState("");
  const [inboundDid, setInboundDid] = useState("");
  const [transferDid, setTransferDid] = useState("");
  
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
      setUrl2(buyerData.url2 || "");
      setContactName(buyerData.contact_name || "");
      setEmail(buyerData.email || "");
      setPlatform(buyerData.platform || "");
      setNotes(buyerData.notes || "");
      setPayoutTerms(buyerData.payout_terms || "");
      setInboundDid(buyerData.inbound_did || "");
      setTransferDid(buyerData.transfer_did || "");
      
      // Fetch tort coverage
      const coverage = await getBuyerTortCoverage(buyerId);
      setCoverages(coverage);
      
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
        url2,
        contact_name: contactName,
        email,
        platform,
        notes,
        payout_terms: payoutTerms,
        inbound_did: inboundDid,
        transfer_did: transferDid
      });
      
      setEditMode(false);
      loadBuyerData(); // Refresh data
    } catch (error) {
      console.error("Error updating buyer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openWebsite = (urlToOpen?: string) => {
    if (!urlToOpen) {
      toast.error("No website URL available");
      return;
    }

    let fullUrl = urlToOpen;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }
    window.open(fullUrl, '_blank');
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const handleRemoveCoverage = async (coverageId: string) => {
    if (confirm("Are you sure you want to remove this tort coverage?")) {
      try {
        const success = await removeBuyerTortCoverage(coverageId);
        if (success) {
          setCoverages(coverages.filter(c => c.id !== coverageId));
          toast.success("Coverage removed successfully");
        }
      } catch (error) {
        console.error("Error removing coverage:", error);
        toast.error("Failed to remove coverage");
      }
    }
  };

  const startEditCoverage = (coverageId: string, amount: number) => {
    setEditingCoverageId(coverageId);
    setEditAmount(amount.toString());
  };

  const handleUpdateCoverage = async (coverageId: string) => {
    const amount = parseFloat(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    try {
      await updateBuyerTortCoverage(coverageId, amount);
      setEditingCoverageId(null);
      toast.success("Coverage amount updated");
      loadBuyerData();
    } catch (error) {
      console.error("Error updating coverage:", error);
      toast.error("Failed to update coverage");
    }
  };

  const handleAddCoverage = async () => {
    await loadBuyerData();
    setShowAddForm(false);
    toast.success("Coverage added successfully");
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
          <div className="flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
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
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">{buyer.name}</DialogTitle>
            {!editMode && activeTab === "details" && (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                <FileEdit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Buyer Details</TabsTrigger>
            <TabsTrigger value="coverage">Tort Coverage ({coverages.length})</TabsTrigger>
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
                    <Label htmlFor="edit-url2" className="flex items-center gap-2">
                      <LinkIcon className="h-3.5 w-3.5 text-primary" />
                      Secondary URL 
                    </Label>
                    <Input
                      id="edit-url2"
                      value={url2}
                      onChange={(e) => setUrl2(e.target.value)}
                      placeholder="https://example.com/landing"
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-inbound-did" className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Inbound DID
                    </Label>
                    <Input
                      id="edit-inbound-did"
                      value={inboundDid}
                      onChange={(e) => setInboundDid(e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-transfer-did" className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-primary" />
                      Transfer DID
                    </Label>
                    <Input
                      id="edit-transfer-did"
                      value={transferDid}
                      onChange={(e) => setTransferDid(e.target.value)}
                      placeholder="(555) 123-4567"
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
                      setUrl2(buyer.url2 || "");
                      setContactName(buyer.contact_name || "");
                      setEmail(buyer.email || "");
                      setPlatform(buyer.platform || "");
                      setNotes(buyer.notes || "");
                      setPayoutTerms(buyer.payout_terms || "");
                      setInboundDid(buyer.inbound_did || "");
                      setTransferDid(buyer.transfer_did || "");
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
                  
                  {(buyer.url || buyer.url2) && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Website
                      </span>
                      <div className="flex gap-2">
                        {buyer.url && (
                          <Button variant="outline" size="sm" onClick={() => openWebsite(buyer.url)} className="h-8">
                            <Globe className="h-3.5 w-3.5 mr-1" />
                            Primary
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                        {buyer.url2 && (
                          <Button variant="outline" size="sm" onClick={() => openWebsite(buyer.url2)} className="h-8">
                            <LinkIcon className="h-3.5 w-3.5 mr-1" />
                            Secondary
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </Button>
                        )}
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
                  
                  {buyer.inbound_did && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Inbound DID
                      </span>
                      <p>{buyer.inbound_did}</p>
                    </div>
                  )}
                  
                  {buyer.transfer_did && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Transfer DID
                      </span>
                      <p>{buyer.transfer_did}</p>
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
          
          <TabsContent value="coverage" className="pt-4 space-y-4">
            {!showAddForm && (
              <div className="mb-4">
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tort Coverage
                </Button>
              </div>
            )}
            
            {showAddForm && (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add New Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddTortCoverageForm 
                    buyerId={buyerId} 
                    onSuccess={handleAddCoverage}
                    onCancel={() => setShowAddForm(false)}
                    existingCoverages={coverages}
                  />
                </CardContent>
              </Card>
            )}
            
            {coverages.length === 0 && !showAddForm ? (
              <div className="text-center py-8 bg-muted/30 rounded-md">
                <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="font-medium">No tort coverages added yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a tort coverage to specify which cases this buyer purchases.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Coverage
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {coverages.map((coverage) => (
                  <Card key={coverage.id} className="overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium">
                            {coverage.campaigns?.name || "Unknown Campaign"}
                          </h3>
                          
                          {editingCoverageId === coverage.id ? (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="relative">
                                <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                                <input
                                  type="number"
                                  className="pl-7 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                  value={editAmount}
                                  onChange={(e) => setEditAmount(e.target.value)}
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handleUpdateCoverage(coverage.id)}
                              >
                                Save
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setEditingCoverageId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center mt-1.5">
                              <BadgeDollarSign className="h-4 w-4 text-green-600 mr-1" />
                              <span className="font-semibold">
                                {formatCurrency(coverage.payout_amount)}
                              </span>
                              <Badge variant="outline" className="ml-2">
                                per case
                              </Badge>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {editingCoverageId !== coverage.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              onClick={() => startEditCoverage(coverage.id, coverage.payout_amount)}
                            >
                              <FileEdit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveCoverage(coverage.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Display additional fields */}
                      <div className="mt-4 space-y-3 text-sm">
                        {(coverage.did || coverage.campaign_key || coverage.spec_sheet_url || coverage.notes) && (
                          <Separator className="my-3" />
                        )}
                        
                        {coverage.did && (
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="font-medium mr-2">DID:</span>
                            <span>{coverage.did}</span>
                          </div>
                        )}
                        
                        {coverage.campaign_key && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Campaign Key:</span>
                            <span>{coverage.campaign_key}</span>
                          </div>
                        )}
                        
                        {coverage.spec_sheet_url && (
                          <div className="flex items-center">
                            <span className="font-medium mr-2">Spec Sheet:</span>
                            <Button 
                              variant="link" 
                              className="h-auto p-0 text-primary"
                              onClick={() => window.open(coverage.spec_sheet_url, '_blank')}
                            >
                              View Spec Sheet
                            </Button>
                          </div>
                        )}
                        
                        {coverage.notes && (
                          <div className="flex">
                            <span className="font-medium mr-2 mt-0.5">Notes:</span>
                            <p className="text-muted-foreground">{coverage.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {!editMode && activeTab === "details" && (
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
