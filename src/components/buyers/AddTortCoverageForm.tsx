
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { 
  Loader2, 
  AlertTriangle, 
  Wand2, 
  Hash, 
  Link, 
  Plus,
  FilePlus
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBuyers } from "@/hooks/useBuyers";
import { useCampaign } from "@/contexts/CampaignContext";
import { BuyerTortCoverage } from "@/types/buyer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AddTortCoverageFormProps {
  buyerId: string;
  onSuccess: (newCoverage: BuyerTortCoverage) => void;
  onCancel: () => void;
  existingCoverages: BuyerTortCoverage[];
}

export function AddTortCoverageForm({ 
  buyerId, 
  onSuccess, 
  onCancel,
  existingCoverages 
}: AddTortCoverageFormProps) {
  const { addBuyerTortCoverage } = useBuyers();
  const { addCampaign, campaigns } = useCampaign();
  const [availableCampaigns, setAvailableCampaigns] = useState<{ id: string; name: string; }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>("");
  const [amount, setAmount] = useState<string>("0");
  const [inboundDid, setInboundDid] = useState<string>("");
  const [transferDid, setTransferDid] = useState<string>("");
  const [intakeCenter, setIntakeCenter] = useState<string>("");
  const [campaignKey, setCampaignKey] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [specSheetUrl, setSpecSheetUrl] = useState<string>("");
  const [campaignUrl, setCampaignUrl] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  
  // New campaign creation states
  const [showNewCampaignDialog, setShowNewCampaignDialog] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignPlatform, setNewCampaignPlatform] = useState("manual");
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  
  // AI parsing states
  const [rawCampaignText, setRawCampaignText] = useState<string>("");
  const [isAiParsingDialogOpen, setIsAiParsingDialogOpen] = useState(false);
  const [isParsingLoading, setIsParsingLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    // Check if selected campaign is already covered by this buyer
    if (selectedCampaign) {
      const duplicate = existingCoverages.some(coverage => coverage.campaign_id === selectedCampaign);
      setIsDuplicate(duplicate);

      // If it's a duplicate, suggest a label
      if (duplicate) {
        const campaignName = availableCampaigns.find(c => c.id === selectedCampaign)?.name || "";
        const existingCount = existingCoverages.filter(c => c.campaign_id === selectedCampaign).length;
        setLabel(`${campaignName} - Option ${existingCount + 1}`);
      } else {
        setLabel("");
      }
      
      // Save the selected campaign name
      const campaign = availableCampaigns.find(c => c.id === selectedCampaign);
      if (campaign) {
        setSelectedCampaignName(campaign.name);
        setCampaignId(campaign.id); // Set the campaign ID display field
      }
    } else {
      setIsDuplicate(false);
      setLabel("");
      setSelectedCampaignName("");
      setCampaignId("");
    }
  }, [selectedCampaign, existingCoverages, availableCampaigns]);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setAvailableCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleCreateNewCampaign = async () => {
    if (!newCampaignName.trim()) {
      toast.error("Please enter a campaign name");
      return;
    }
    
    setCreatingCampaign(true);
    
    try {
      // Get current user ID for campaign creation
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user?.id) {
        throw new Error("User not authenticated");
      }

      // Create campaign directly with supabase
      const { data: newCampaign, error: createError } = await supabase
        .from("campaigns")
        .insert({
          name: newCampaignName.trim(),
          platform: newCampaignPlatform,
          account_id: "manual",
          account_name: "Manual Entry",
          user_id: userData.user.id,
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        throw createError;
      }
      
      if (newCampaign) {
        // Update campaigns list
        setAvailableCampaigns([...availableCampaigns, { id: newCampaign.id, name: newCampaign.name }]);
        
        // Select the newly created campaign
        setSelectedCampaign(newCampaign.id);
        setSelectedCampaignName(newCampaign.name);
        setCampaignId(newCampaign.id);
        
        toast.success(`Campaign "${newCampaignName}" created successfully`);
        setShowNewCampaignDialog(false);
        
        // Reset form
        setNewCampaignName("");
        setNewCampaignPlatform("manual");
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast.error("Failed to create campaign");
    } finally {
      setCreatingCampaign(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCampaign || parseFloat(amount) <= 0) {
      toast.error("Please select a campaign and enter a valid amount");
      return;
    }
    
    setLoading(true);
    
    try {
      const payoutAmount = parseFloat(amount);
      const newCoverage = await addBuyerTortCoverage(
        buyerId, 
        selectedCampaign, 
        payoutAmount,
        "", // No longer using separate did field
        campaignKey,
        notes,
        specSheetUrl,
        label,
        inboundDid,
        transferDid,
        intakeCenter,
        campaignUrl
      );
      
      if (newCoverage) {
        // Get the campaign details to include in the updated coverage
        const campaign = availableCampaigns.find(c => c.id === selectedCampaign);
        
        // Create a full coverage object for the UI update
        const fullCoverage: BuyerTortCoverage = {
          ...newCoverage,
          campaign_id: selectedCampaign,
          buyer_id: buyerId,
          payout_amount: payoutAmount,
          did: "",
          campaign_key: campaignKey,
          notes,
          spec_sheet_url: specSheetUrl,
          label,
          inbound_did: inboundDid,
          transfer_did: transferDid,
          intake_center: intakeCenter,
          campaign_url: campaignUrl,
          is_active: true,
          campaigns: campaign ? { id: campaign.id, name: campaign.name } : undefined
        };
        
        onSuccess(fullCoverage);
      }
    } catch (error) {
      console.error("Error adding tort coverage:", error);
      toast.error("Failed to add coverage");
    } finally {
      setLoading(false);
    }
  };

  const parseWithAI = async () => {
    if (!selectedCampaign) {
      toast.error("Please select a campaign first");
      return;
    }
    
    if (!rawCampaignText.trim()) {
      toast.error("Please enter campaign information to parse");
      return;
    }

    setIsParsingLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('extract-tort-coverage', {
        body: { 
          campaignText: rawCampaignText,
          selectedCampaignId: selectedCampaign,
          selectedCampaignName: selectedCampaignName
        }
      });

      if (error) throw error;
      
      if (!data.success) {
        throw new Error(data.error || "Failed to parse campaign information");
      }

      const parsedData = data.data;
      
      // Fill form fields with parsed data
      if (parsedData.amount && !isNaN(parsedData.amount)) {
        setAmount(parsedData.amount.toString());
      }
      
      if (parsedData.inboundDid) setInboundDid(parsedData.inboundDid);
      if (parsedData.transferDid) setTransferDid(parsedData.transferDid);
      if (parsedData.intakeCenter) setIntakeCenter(parsedData.intakeCenter);
      if (parsedData.campaignKey) setCampaignKey(parsedData.campaignKey);
      if (parsedData.notes) setNotes(parsedData.notes);
      if (parsedData.specSheetUrl) setSpecSheetUrl(parsedData.specSheetUrl);
      if (parsedData.campaignUrl) setCampaignUrl(parsedData.campaignUrl);
      if (parsedData.label) setLabel(parsedData.label);
      if (parsedData.campaignId) setCampaignId(parsedData.campaignId);

      setIsAiParsingDialogOpen(false);
      toast.success("Successfully parsed campaign information");
    } catch (error) {
      console.error("Error parsing with AI:", error);
      toast.error(error instanceof Error ? error.message : "Failed to parse campaign information");
    } finally {
      setIsParsingLoading(false);
    }
  };

  // Only show Parse with AI button if a campaign is selected
  const showParseWithAI = !!selectedCampaign;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Add Tort Coverage</h2>
        
        {showParseWithAI && (
          <Dialog open={isAiParsingDialogOpen} onOpenChange={setIsAiParsingDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                type="button" 
                variant="outline" 
                className="flex items-center gap-1"
              >
                <Wand2 className="h-4 w-4 mr-1" />
                Parse with AI
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle>Parse Campaign Information with AI</DialogTitle>
                <DialogDescription>
                  Paste campaign details from emails, specs, or other sources and our AI will extract the relevant information to populate the form.
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4">
                <p className="text-sm mb-2">Selected campaign: <strong>{selectedCampaignName}</strong> (ID: {selectedCampaign})</p>
                <Textarea
                  className="min-h-[200px]"
                  placeholder="Paste campaign information here... Include payout amount, DIDs, campaign URL, and other relevant details."
                  value={rawCampaignText}
                  onChange={(e) => setRawCampaignText(e.target.value)}
                />
              </div>
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button 
                  type="button" 
                  onClick={parseWithAI}
                  disabled={isParsingLoading || !rawCampaignText.trim()}
                >
                  {isParsingLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-1" />
                      Parse
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign">Select Campaign (Tort)</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Select 
              value={selectedCampaign}
              onValueChange={setSelectedCampaign}
              disabled={loadingCampaigns}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
                {campaigns.length === 0 && (
                  <SelectItem value="none" disabled>
                    No available campaigns
                  </SelectItem>
                )}
                <SelectItem value="new-campaign" className="text-primary font-medium">
                  + Add New Campaign
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowNewCampaignDialog(true)}
            title="Create New Campaign"
          >
            <FilePlus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaignDialog || selectedCampaign === "new-campaign"} onOpenChange={(open) => {
        setShowNewCampaignDialog(open);
        if (!open && selectedCampaign === "new-campaign") {
          setSelectedCampaign("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Add a new campaign that will be available for tort coverage
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="newCampaignName">Campaign Name</Label>
              <Input
                id="newCampaignName"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                placeholder="Enter campaign name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newCampaignPlatform">Platform</Label>
              <Select
                value={newCampaignPlatform}
                onValueChange={setNewCampaignPlatform}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  
                  <SelectItem value="manual">Manual Entry</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowNewCampaignDialog(false);
                if (selectedCampaign === "new-campaign") {
                  setSelectedCampaign("");
                }
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!newCampaignName.trim() || creatingCampaign}
              onClick={handleCreateNewCampaign}
            >
              {creatingCampaign ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Campaign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isDuplicate && (
        <Alert variant="warning" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            This buyer already has price points for this campaign.
            Adding another will create a distinct entry for the same campaign.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="campaignId">Campaign ID</Label>
        <div className="flex items-center">
          <Hash className="h-4 w-4 text-muted-foreground absolute ml-3" />
          <Input
            id="campaignId"
            type="text"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            placeholder="Enter campaign ID"
            className="pl-9"
            readOnly
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Internal ID used to identify this campaign (auto-filled when campaign is selected)
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="campaignUrl">Campaign URL</Label>
        <div className="flex items-center">
          <Link className="h-4 w-4 text-muted-foreground absolute ml-3" />
          <Input
            id="campaignUrl"
            type="url"
            value={campaignUrl}
            onChange={(e) => setCampaignUrl(e.target.value)}
            placeholder="https://example.com/campaign"
            className="pl-9"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="label">Label (to distinguish multiple entries)</Label>
        <Input
          id="label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Standard, Premium, Special, etc."
        />
        <p className="text-xs text-muted-foreground">
          A descriptive name to identify this specific price point
        </p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="amount">Payout Amount per Case ($)</Label>
        <Input
          id="amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="inboundDid">Inbound DID</Label>
          <Input
            id="inboundDid"
            type="text"
            value={inboundDid}
            onChange={(e) => setInboundDid(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="transferDid">Transfer DID</Label>
          <Input
            id="transferDid"
            type="text"
            value={transferDid}
            onChange={(e) => setTransferDid(e.target.value)}
            placeholder="(555) 123-4567"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="intakeCenter">Intake Center</Label>
        <Input
          id="intakeCenter"
          type="text"
          value={intakeCenter}
          onChange={(e) => setIntakeCenter(e.target.value)}
          placeholder="Enter intake center name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaignKey">Campaign Key</Label>
        <Input
          id="campaignKey"
          type="text"
          value={campaignKey}
          onChange={(e) => setCampaignKey(e.target.value)}
          placeholder="Enter campaign key"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="specSheetUrl">Spec Sheet URL</Label>
        <Input
          id="specSheetUrl"
          type="url"
          value={specSheetUrl}
          onChange={(e) => setSpecSheetUrl(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Enter any additional notes about this tort"
          className="min-h-[80px]"
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading || !selectedCampaign || selectedCampaign === "new-campaign" || parseFloat(amount) <= 0}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
            </>
          ) : "Add Coverage"}
        </Button>
      </div>
    </form>
  );
}
