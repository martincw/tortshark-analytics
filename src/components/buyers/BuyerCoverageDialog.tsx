
import { useState, useEffect } from "react";
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
import { 
  Card, 
  CardHeader, 
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CircleDollarSign, 
  Trash2,
  Plus
} from "lucide-react";
import { BuyerTortCoverage, CaseBuyer } from "@/types/campaign";
import { AddTortCoverageForm } from "./AddTortCoverageForm";
import { formatCurrency } from "@/utils/campaignUtils";

interface BuyerCoverageDialogProps {
  buyerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BuyerCoverageDialog({ buyerId, isOpen, onClose }: BuyerCoverageDialogProps) {
  const { buyers, getBuyerTortCoverage, removeBuyerTortCoverage } = useBuyers();
  const [coverages, setCoverages] = useState<BuyerTortCoverage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [buyer, setBuyer] = useState<CaseBuyer | null>(null);

  useEffect(() => {
    if (isOpen && buyerId) {
      fetchBuyerData();
    }
  }, [buyerId, isOpen]);

  useEffect(() => {
    // Find the buyer from the buyers list
    const currentBuyer = buyers.find(b => b.id === buyerId);
    if (currentBuyer) {
      setBuyer(currentBuyer);
    }
  }, [buyerId, buyers]);

  const fetchBuyerData = async () => {
    setLoading(true);
    try {
      const coverageData = await getBuyerTortCoverage(buyerId);
      const formattedCoverages: BuyerTortCoverage[] = coverageData.map(item => ({
        id: item.id,
        buyer_id: buyerId, // Use the buyerId prop
        campaign_id: item.campaigns?.id || '',
        payout_amount: item.payout_amount,
        campaigns: item.campaigns
      }));
      setCoverages(formattedCoverages);
    } catch (error) {
      console.error("Error fetching buyer tort coverage:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoverage = async (coverageId: string) => {
    if (confirm("Are you sure you want to remove this tort coverage?")) {
      const success = await removeBuyerTortCoverage(coverageId);
      if (success) {
        setCoverages(coverages.filter(c => c.id !== coverageId));
      }
    }
  };

  const handleAddCoverage = async () => {
    await fetchBuyerData();
    setShowAddForm(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tort Coverage for {buyer?.name}</DialogTitle>
          <DialogDescription>
            Manage which torts (campaigns) this buyer purchases and their payout amounts
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <>
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
                  <CardHeader>
                    <CardTitle className="text-lg">Add New Coverage</CardTitle>
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
                <div className="text-center py-8 text-muted-foreground">
                  <p>No tort coverages added yet.</p>
                  <p className="mt-1 text-sm">
                    Add a tort coverage to specify which cases this buyer purchases.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {coverages.map((coverage) => (
                    <Card key={coverage.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-base font-medium">
                            {coverage.campaigns?.name || "Unknown Campaign"}
                          </CardTitle>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveCoverage(coverage.id)}
                            className="h-8 w-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2">
                          <CircleDollarSign className="h-5 w-5 text-green-600" />
                          <span className="font-semibold">
                            {formatCurrency(coverage.payout_amount)}
                          </span>
                          <Badge variant="outline" className="ml-auto">
                            per case
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
