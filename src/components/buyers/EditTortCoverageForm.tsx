
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
import { Loader2, AlertTriangle, Wand2, Hash, Link, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBuyers } from "@/hooks/useBuyers";
import { BuyerTortCoverage } from "@/types/buyer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditTortCoverageFormProps {
  coverage: BuyerTortCoverage;
  onSave: (updatedCoverage: BuyerTortCoverage) => void;
  onCancel: () => void;
  existingCoverages: BuyerTortCoverage[];
}

export function EditTortCoverageForm({ 
  coverage, 
  onSave, 
  onCancel,
  existingCoverages 
}: EditTortCoverageFormProps) {
  const { updateBuyerTortCoverage } = useBuyers();
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>(coverage.campaign_id);
  const [amount, setAmount] = useState<string>(coverage.payout_amount.toString());
  const [inboundDid, setInboundDid] = useState<string>(coverage.inbound_did || "");
  const [transferDid, setTransferDid] = useState<string>(coverage.transfer_did || "");
  const [intakeCenter, setIntakeCenter] = useState<string>(coverage.intake_center || "");
  const [campaignKey, setCampaignKey] = useState<string>(coverage.campaign_key || "");
  const [notes, setNotes] = useState<string>(coverage.notes || "");
  const [specSheetUrl, setSpecSheetUrl] = useState<string>(coverage.spec_sheet_url || "");
  const [campaignUrl, setCampaignUrl] = useState<string>(coverage.campaign_url || "");
  const [label, setLabel] = useState<string>(coverage.label || "");
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>("");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    // Check if selected campaign is already covered by this buyer (excluding current coverage)
    if (selectedCampaign && selectedCampaign !== coverage.campaign_id) {
      const duplicate = existingCoverages.some(c => c.campaign_id === selectedCampaign);
      setIsDuplicate(duplicate);

      // If it's a duplicate, suggest updating the label
      if (duplicate) {
        const campaignName = campaigns.find(c => c.id === selectedCampaign)?.name || "";
        const existingCount = existingCoverages.filter(c => c.campaign_id === selectedCampaign).length;
        setLabel(`${campaignName} - Option ${existingCount + 1}`);
      }
    } else {
      setIsDuplicate(false);
    }
    
    // Save the selected campaign name
    const campaign = campaigns.find(c => c.id === selectedCampaign);
    if (campaign) {
      setSelectedCampaignName(campaign.name);
    }
  }, [selectedCampaign, existingCoverages, campaigns, coverage.campaign_id]);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCampaigns(data || []);
      
      // Set the campaign name for the current coverage
      const currentCampaign = data?.find(c => c.id === coverage.campaign_id);
      if (currentCampaign) {
        setSelectedCampaignName(currentCampaign.name);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoadingCampaigns(false);
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
      const updates = {
        campaign_id: selectedCampaign,
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
        is_active: coverage.is_active
      };
      
      // Update in the database
      await updateBuyerTortCoverage(coverage.id, payoutAmount, updates);
      
      // Get the campaign name for the updated coverage
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      
      // Create updated coverage object for local state update
      const updatedCoverage: BuyerTortCoverage = {
        ...coverage,
        ...updates,
        campaigns: campaign ? {
          id: campaign.id,
          name: campaign.name
        } : coverage.campaigns
      };
      
      // Call the onSave callback with the updated coverage
      onSave(updatedCoverage);
    } catch (error) {
      console.error("Error updating coverage:", error);
      toast.error("Failed to update coverage");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Edit Tort Coverage</h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaign">Campaign (Tort)</Label>
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
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

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
          disabled={loading || !selectedCampaign || parseFloat(amount) <= 0}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : "Update Coverage"}
        </Button>
      </div>
    </form>
  );
}
