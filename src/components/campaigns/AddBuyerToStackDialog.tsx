
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
import { BuyerTortCoverage } from "@/types/buyer";
import { supabase } from "@/integrations/supabase/client";
import { BadgeDollarSign, CircleDollarSign, CheckCircle2 } from "lucide-react";

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
  onSuccess
}: AddBuyerToStackDialogProps) {
  const { addBuyerToStack } = useBuyers();
  const [coverages, setCoverages] = useState<{
    id: string;
    buyer_id: string;
    buyer_name: string;
    payout_amount: number;
    label?: string;
  }[]>([]);
  const [selectedCoverage, setSelectedCoverage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCoverages, setLoadingCoverages] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEligibleCoverages();
    }
  }, [isOpen, campaignId]);

  const fetchEligibleCoverages = async () => {
    setLoadingCoverages(true);
    try {
      // Query all tort coverages for this campaign
      const { data, error } = await supabase
        .from("buyer_tort_coverage")
        .select(`
          id,
          payout_amount,
          buyer_id,
          label,
          is_active,
          case_buyers (id, name)
        `)
        .eq("campaign_id", campaignId)
        .eq("is_active", true);

      if (error) throw error;

      // Map the data to a more convenient format
      const formattedCoverages = (data || []).map(item => ({
        id: item.id,
        buyer_id: item.buyer_id,
        buyer_name: item.case_buyers?.name || "Unknown",
        payout_amount: item.payout_amount,
        label: item.label
      }));

      setCoverages(formattedCoverages);
      
      // Pre-select the first coverage if available
      if (formattedCoverages.length > 0) {
        setSelectedCoverage(formattedCoverages[0].id);
      }
    } catch (error) {
      console.error("Error fetching eligible coverages:", error);
    } finally {
      setLoadingCoverages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCoverage || loading) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Get the next available stack_order
      const { data } = await supabase
        .from('campaign_buyer_stack')
        .select('stack_order')
        .eq('campaign_id', campaignId)
        .order('stack_order', { ascending: false })
        .limit(1);
      
      const nextOrder = data && data.length > 0 ? (data[0].stack_order + 1) : 0;
      
      const selectedCoverageData = coverages.find(c => c.id === selectedCoverage);
      if (!selectedCoverageData) {
        setLoading(false);
        return;
      }
      
      // Add the buyer to the stack
      const result = await addBuyerToStack(
        campaignId,
        selectedCoverageData.buyer_id,
        selectedCoverageData.payout_amount,
        nextOrder,
        selectedCoverageData.id
      );
      
      if (result) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error("Error adding buyer to stack:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Buyer to Stack</DialogTitle>
          <DialogDescription>
            Select a tort coverage to add to this campaign's waterfall
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm mb-4">
              Buyers must have tort coverage for this campaign before they can be added to the stack.
              You can now add multiple price points for the same buyer if needed.
            </p>
            
            <Select 
              value={selectedCoverage} 
              onValueChange={setSelectedCoverage}
              disabled={loadingCoverages || coverages.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a tort coverage" />
              </SelectTrigger>
              <SelectContent>
                {coverages.map((coverage) => (
                  <SelectItem key={coverage.id} value={coverage.id} className="py-2">
                    <div className="flex items-center gap-2">
                      <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {coverage.buyer_name} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(coverage.payout_amount)}
                        {coverage.label && <span className="text-muted-foreground ml-1">({coverage.label})</span>}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                {coverages.length === 0 && (
                  <SelectItem value="none" disabled>
                    No eligible tort coverages
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            
            {coverages.length === 0 && !loadingCoverages && (
              <p className="text-sm text-muted-foreground mt-1">
                No eligible tort coverages available. Buyers must have tort coverage for this campaign before they can be added to the stack.
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
              disabled={loading || !selectedCoverage || coverages.length === 0}
            >
              {loading ? "Adding..." : "Add to Stack"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
