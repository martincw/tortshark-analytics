
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
import { useBuyers } from "@/hooks/useBuyers";
import { Campaign, BuyerTortCoverage } from "@/types/campaign";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddTortCoverageFormProps {
  buyerId: string;
  onSuccess: () => void;
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
  const [campaigns, setCampaigns] = useState<{ id: string; name: string; }[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [amount, setAmount] = useState<string>("0");
  const [did, setDid] = useState<string>("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [campaignKey, setCampaignKey] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [specSheetUrl, setSpecSheetUrl] = useState<string>("");
  const [label, setLabel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);

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
        const campaignName = campaigns.find(c => c.id === selectedCampaign)?.name || "";
        const existingCount = existingCoverages.filter(c => c.campaign_id === selectedCampaign).length;
        setLabel(`${campaignName} - Option ${existingCount + 1}`);
      } else {
        setLabel("");
      }
    } else {
      setIsDuplicate(false);
      setLabel("");
    }
  }, [selectedCampaign, existingCoverages, campaigns]);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCampaign || parseFloat(amount) <= 0) {
      return;
    }
    
    setLoading(true);
    
    const payoutAmount = parseFloat(amount);
    await addBuyerTortCoverage(
      buyerId, 
      selectedCampaign, 
      payoutAmount,
      did,
      campaignKey,
      notes,
      specSheetUrl,
      label
    );
    
    setLoading(false);
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="campaign">Select Campaign (Tort)</Label>
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

      <div className="space-y-2">
        <Label htmlFor="did">DID (Direct Inward Dialing)</Label>
        <Input
          id="did"
          type="text"
          value={did}
          onChange={(e) => setDid(e.target.value)}
          placeholder="18005551234"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="campaignId">Campaign ID</Label>
        <Input
          id="campaignId"
          type="text"
          value={campaignId}
          onChange={(e) => setCampaignId(e.target.value)}
          placeholder="Enter campaign ID"
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
          {loading ? "Adding..." : "Add Coverage"}
        </Button>
      </div>
    </form>
  );
}
