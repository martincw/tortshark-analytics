
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("");
  const [amount, setAmount] = useState<string>("0");
  const [loading, setLoading] = useState(false);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

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

  // Filter out campaigns that already have coverage
  const availableCampaigns = campaigns.filter(
    (campaign) => !existingCoverages.some(
      (coverage) => coverage.campaign_id === campaign.id
    )
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCampaign || parseFloat(amount) <= 0) {
      return;
    }
    
    setLoading(true);
    
    const payoutAmount = parseFloat(amount);
    await addBuyerTortCoverage(buyerId, selectedCampaign, payoutAmount);
    
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
          disabled={loadingCampaigns || availableCampaigns.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a campaign" />
          </SelectTrigger>
          <SelectContent>
            {availableCampaigns.map((campaign) => (
              <SelectItem key={campaign.id} value={campaign.id}>
                {campaign.name}
              </SelectItem>
            ))}
            {availableCampaigns.length === 0 && (
              <SelectItem value="none" disabled>
                No available campaigns
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {availableCampaigns.length === 0 && !loadingCampaigns && (
          <p className="text-sm text-muted-foreground mt-1">
            This buyer is already covering all campaigns
          </p>
        )}
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
