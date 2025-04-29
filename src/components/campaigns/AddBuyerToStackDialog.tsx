
import { useState, useEffect } from "react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBuyers } from "@/hooks/useBuyers";
import { CaseBuyer, BuyerTortCoverage } from "@/types/campaign";
import { supabase } from "@/integrations/supabase/client";

interface AddBuyerToStackDialogProps {
  campaignId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentStackIds: string[];
}

export function AddBuyerToStackDialog({ 
  campaignId, 
  isOpen, 
  onClose, 
  onSuccess,
  currentStackIds
}: AddBuyerToStackDialogProps) {
  const { addBuyerToStack } = useBuyers();
  const [buyers, setBuyers] = useState<{
    id: string;
    name: string;
    payout_amount: number;
    coverage_id: string;
  }[]>([]);
  const [selectedBuyer, setSelectedBuyer] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("0");
  const [loading, setLoading] = useState(false);
  const [loadingBuyers, setLoadingBuyers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEligibleBuyers();
    }
  }, [isOpen, campaignId]);

  const fetchEligibleBuyers = async () => {
    setLoadingBuyers(true);
    try {
      // Query buyers that have coverage for this campaign but are not yet in the stack
      const { data, error } = await supabase
        .from("buyer_tort_coverage")
        .select(`
          id,
          payout_amount,
          buyer_id,
          case_buyers (id, name)
        `)
        .eq("campaign_id", campaignId);

      if (error) throw error;

      // Filter out buyers already in the stack
      const eligibleBuyers = (data || [])
        .filter(item => !currentStackIds.includes(item.buyer_id))
        .map(item => ({
          id: item.buyer_id,
          name: item.case_buyers?.name || "Unknown",
          payout_amount: item.payout_amount,
          coverage_id: item.id
        }));

      setBuyers(eligibleBuyers);
      
      // Pre-select the first buyer and their payout amount
      if (eligibleBuyers.length > 0) {
        setSelectedBuyer(eligibleBuyers[0].id);
        setPayoutAmount(eligibleBuyers[0].payout_amount.toString());
      }
    } catch (error) {
      console.error("Error fetching eligible buyers:", error);
    } finally {
      setLoadingBuyers(false);
    }
  };

  // Update payout amount when selected buyer changes
  useEffect(() => {
    const selectedBuyerData = buyers.find(b => b.id === selectedBuyer);
    if (selectedBuyerData) {
      setPayoutAmount(selectedBuyerData.payout_amount.toString());
    }
  }, [selectedBuyer, buyers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBuyer) {
      return;
    }
    
    setLoading(true);
    
    // Get the next available stack_order
    const nextOrder = currentStackIds.length;
    
    const selectedBuyerData = buyers.find(b => b.id === selectedBuyer);
    if (!selectedBuyerData) return;
    
    // Use the payout amount from the buyer's tort coverage
    await addBuyerToStack(
      campaignId,
      selectedBuyer,
      selectedBuyerData.payout_amount,
      nextOrder
    );
    
    setLoading(false);
    onSuccess();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Buyer to Stack</DialogTitle>
          <DialogDescription>
            Select a buyer to add to this campaign's waterfall
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm mb-4">
              Buyers must have tort coverage for this campaign before they can be added to the stack. 
              The payout amount is automatically set based on the coverage.
            </p>
            
            <Select 
              value={selectedBuyer} 
              onValueChange={setSelectedBuyer}
              disabled={loadingBuyers || buyers.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a buyer" />
              </SelectTrigger>
              <SelectContent>
                {buyers.map((buyer) => (
                  <SelectItem key={buyer.id} value={buyer.id}>
                    {buyer.name} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(buyer.payout_amount)}
                  </SelectItem>
                ))}
                {buyers.length === 0 && (
                  <SelectItem value="none" disabled>
                    No eligible buyers
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            
            {buyers.length === 0 && !loadingBuyers && (
              <p className="text-sm text-muted-foreground mt-1">
                No eligible buyers available. Buyers must have tort coverage for this campaign before they can be added to the stack.
              </p>
            )}
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedBuyer || buyers.length === 0}
            >
              {loading ? "Adding..." : "Add to Stack"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
