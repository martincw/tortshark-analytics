import { useState, useEffect } from "react";
import { useBuyers } from "@/hooks/useBuyers";
import { useCampaign } from "@/contexts/CampaignContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { EditTortCoverageForm } from "@/components/buyers/EditTortCoverageForm";
import { BuyerCard } from "@/components/buyers/BuyerCard";
import { BuyerDetailDialog } from "@/components/buyers/BuyerDetailDialog";

const BuyerDashboard = () => {
  const { 
    buyers, 
    loading, 
    addBuyer, 
    toggleBuyerActive,
    updateBuyerOrder,
    getBuyerTortCoverage, 
    addBuyerTortCoverage, 
    toggleTortCoverageActive, 
    removeBuyerTortCoverage 
  } = useBuyers();
  const { campaigns } = useCampaign();
  const [buyerCoverages, setBuyerCoverages] = useState<Record<string, any[]>>({});
  const [loadingCoverages, setLoadingCoverages] = useState<Record<string, boolean>>({});
  const [newBuyerName, setNewBuyerName] = useState("");
  const [addBuyerOpen, setAddBuyerOpen] = useState(false);
  const [addCampaignDialogs, setAddCampaignDialogs] = useState<Record<string, boolean>>({});
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, string>>({});
  const [payoutAmounts, setPayoutAmounts] = useState<Record<string, string>>({});
  const [editingCoverage, setEditingCoverage] = useState<{ coverage: any; buyerId: string } | null>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [buyerDetailOpen, setBuyerDetailOpen] = useState(false);

  // Filter to only show active buyers and sort by display_order
  const activeBuyers = buyers
    .filter(b => b.is_active !== false)
    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const loadBuyerCoverage = async (buyerId: string) => {
    if (buyerCoverages[buyerId]) return;
    
    setLoadingCoverages(prev => ({ ...prev, [buyerId]: true }));
    const coverage = await getBuyerTortCoverage(buyerId);
    setBuyerCoverages(prev => ({ ...prev, [buyerId]: coverage }));
    setLoadingCoverages(prev => ({ ...prev, [buyerId]: false }));
  };

  const handleAddBuyer = async () => {
    if (!newBuyerName.trim()) {
      toast.error("Please enter a buyer name");
      return;
    }
    const buyer = await addBuyer(newBuyerName.trim());
    if (buyer) {
      setNewBuyerName("");
      setAddBuyerOpen(false);
    }
  };

  const handleAddCampaign = async (buyerId: string) => {
    const campaignId = selectedCampaigns[buyerId];
    const payoutAmount = parseFloat(payoutAmounts[buyerId] || "0");

    if (!campaignId) {
      toast.error("Please select a campaign");
      return;
    }

    const success = await addBuyerTortCoverage(buyerId, campaignId, payoutAmount);
    if (success) {
      setAddCampaignDialogs(prev => ({ ...prev, [buyerId]: false }));
      setSelectedCampaigns(prev => ({ ...prev, [buyerId]: "" }));
      setPayoutAmounts(prev => ({ ...prev, [buyerId]: "" }));
      // Reload coverage
      const coverage = await getBuyerTortCoverage(buyerId);
      setBuyerCoverages(prev => ({ ...prev, [buyerId]: coverage }));
    }
  };

  const handleToggleCampaign = async (coverageId: string, buyerId: string, isActive: boolean) => {
    const success = await toggleTortCoverageActive(coverageId, isActive);
    if (success) {
      // Update local state
      setBuyerCoverages(prev => ({
        ...prev,
        [buyerId]: prev[buyerId]?.map(c => 
          c.id === coverageId ? { ...c, is_active: isActive } : c
        )
      }));
    }
  };

  const handleToggleBuyer = async (buyerId: string, isActive: boolean) => {
    await toggleBuyerActive(buyerId, isActive);
  };

  const handleRemoveCampaign = async (coverageId: string, buyerId: string) => {
    const success = await removeBuyerTortCoverage(coverageId);
    if (success) {
      // Update local state
      setBuyerCoverages(prev => ({
        ...prev,
        [buyerId]: prev[buyerId]?.filter(c => c.id !== coverageId)
      }));
    }
  };

  const handleEditCoverage = (coverage: any, buyerId: string) => {
    setEditingCoverage({ coverage, buyerId });
  };

  const handleSaveCoverage = (updatedCoverage: any) => {
    // Update local state
    if (editingCoverage) {
      setBuyerCoverages(prev => ({
        ...prev,
        [editingCoverage.buyerId]: prev[editingCoverage.buyerId]?.map(c => 
          c.id === updatedCoverage.id ? updatedCoverage : c
        )
      }));
    }
    setEditingCoverage(null);
  };

  const handleMoveUp = async (buyerId: string) => {
    const currentIndex = activeBuyers.findIndex(b => b.id === buyerId);
    if (currentIndex <= 0) return;

    const newBuyers = [...activeBuyers];
    const [movedBuyer] = newBuyers.splice(currentIndex, 1);
    newBuyers.splice(currentIndex - 1, 0, movedBuyer);

    const buyerOrders = newBuyers.map((buyer, index) => ({
      id: buyer.id,
      display_order: index
    }));

    await updateBuyerOrder(buyerOrders);
  };

  const handleMoveDown = async (buyerId: string) => {
    const currentIndex = activeBuyers.findIndex(b => b.id === buyerId);
    if (currentIndex === -1 || currentIndex >= activeBuyers.length - 1) return;

    const newBuyers = [...activeBuyers];
    const [movedBuyer] = newBuyers.splice(currentIndex, 1);
    newBuyers.splice(currentIndex + 1, 0, movedBuyer);

    const buyerOrders = newBuyers.map((buyer, index) => ({
      id: buyer.id,
      display_order: index
    }));

    await updateBuyerOrder(buyerOrders);
  };

  const openBuyerDetail = (buyerId: string) => {
    setSelectedBuyerId(buyerId);
    setBuyerDetailOpen(true);
  };

  const closeBuyerDetail = () => {
    setSelectedBuyerId(null);
    setBuyerDetailOpen(false);
  };

  const handleDelete = async (buyerId: string) => {
    // Deletion is handled in the BuyerDetailDialog
    toast.info("Delete buyer from the buyer detail dialog");
  };

  // Load all buyer coverages on mount
  useEffect(() => {
    buyers.forEach(buyer => loadBuyerCoverage(buyer.id));
  }, [buyers.length]);

  if (loading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
            <p className="text-muted-foreground">Manage active buyers and their campaigns</p>
          </div>
          <Dialog open={addBuyerOpen} onOpenChange={setAddBuyerOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Buyer
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Buyer</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="buyer-name">Buyer Name</Label>
                  <Input
                    id="buyer-name"
                    value={newBuyerName}
                    onChange={(e) => setNewBuyerName(e.target.value)}
                    placeholder="Enter buyer name"
                  />
                </div>
                <Button onClick={handleAddBuyer} className="w-full">
                  Add Buyer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {activeBuyers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No active buyers yet. Add your first buyer to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {activeBuyers.map((buyer, index) => (
              <BuyerCard
                key={buyer.id}
                buyer={buyer}
                onViewDetail={openBuyerDetail}
                onDelete={handleDelete}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isFirst={index === 0}
                isLast={index === activeBuyers.length - 1}
              />
            ))}
          </div>
        )}

        {/* Edit Coverage Dialog */}
        {editingCoverage && (
          <Dialog open={!!editingCoverage} onOpenChange={() => setEditingCoverage(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Campaign Coverage</DialogTitle>
              </DialogHeader>
              <EditTortCoverageForm
                coverage={editingCoverage.coverage}
                onSave={handleSaveCoverage}
                onCancel={() => setEditingCoverage(null)}
                existingCoverages={buyerCoverages[editingCoverage.buyerId] || []}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Buyer Detail Dialog */}
        {selectedBuyerId && (
          <BuyerDetailDialog
            buyerId={selectedBuyerId}
            isOpen={buyerDetailOpen}
            onClose={closeBuyerDetail}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default BuyerDashboard;
