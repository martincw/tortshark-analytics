import { useState, useEffect } from "react";
import { useBuyers } from "@/hooks/useBuyers";
import { useCampaign } from "@/contexts/CampaignContext";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { EditTortCoverageForm } from "@/components/buyers/EditTortCoverageForm";

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

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(activeBuyers);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update display_order for all items
    const updates = items.map((buyer, index) => ({
      id: buyer.id,
      display_order: index
    }));

    await updateBuyerOrder(updates);
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
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="buyers">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
                >
                  {activeBuyers.map((buyer, index) => {
                    const coverage = buyerCoverages[buyer.id] || [];
                    const activeCampaigns = coverage.filter(c => c.is_active);
                    const isLoadingCoverage = loadingCoverages[buyer.id];

                    return (
                      <Draggable key={buyer.id} draggableId={buyer.id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}>
                            <Card 
                              className={`flex flex-col transition-shadow ${
                                snapshot.isDragging ? 'shadow-lg' : ''
                              }`}
                            >
                            <CardHeader className="pb-3">
                              <div className="flex items-start gap-2">
                                <div 
                                  {...provided.dragHandleProps}
                                  className="mt-1 cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
                                  title="Drag to reorder"
                                >
                                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <CardTitle className="text-xl mb-1">{buyer.name}</CardTitle>
                                  {buyer.email && (
                                    <p className="text-sm text-muted-foreground truncate">{buyer.email}</p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  <Badge variant="secondary">
                                    {activeCampaigns.length} Active
                                  </Badge>
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor={`buyer-toggle-${buyer.id}`} className="text-xs text-muted-foreground">
                                      Active
                                    </Label>
                                    <Switch
                                      id={`buyer-toggle-${buyer.id}`}
                                      checked={buyer.is_active !== false}
                                      onCheckedChange={(checked) => handleToggleBuyer(buyer.id, checked)}
                                    />
                                  </div>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="flex-1 space-y-4">
                              <div className="space-y-2">
                                {isLoadingCoverage ? (
                                  <div className="space-y-2">
                                    <Skeleton className="h-12 w-full" />
                                    <Skeleton className="h-12 w-full" />
                                  </div>
                                ) : activeCampaigns.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-4 text-center">
                                    No active campaigns
                                  </p>
                                ) : (
                                  activeCampaigns.map(cov => (
                                    <div
                                      key={cov.id}
                                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 hover:border-primary/50 transition-all cursor-pointer"
                                      onClick={() => handleEditCoverage(cov, buyer.id)}
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">
                                          {cov.campaigns?.name || 'Unknown Campaign'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          ${cov.payout_amount} payout
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2 ml-2">
                                        <Switch
                                          checked={cov.is_active}
                                          onCheckedChange={(checked) => 
                                            handleToggleCampaign(cov.id, buyer.id, checked)
                                          }
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-destructive hover:text-destructive"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleRemoveCampaign(cov.id, buyer.id);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>

                              <Dialog
                                open={addCampaignDialogs[buyer.id]}
                                onOpenChange={(open) => 
                                  setAddCampaignDialogs(prev => ({ ...prev, [buyer.id]: open }))
                                }
                              >
                                <DialogTrigger asChild>
                                  <Button variant="outline" className="w-full" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Campaign
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Add Campaign to {buyer.name}</DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label htmlFor={`campaign-${buyer.id}`}>Campaign</Label>
                                      <Select
                                        value={selectedCampaigns[buyer.id] || ""}
                                        onValueChange={(value) =>
                                          setSelectedCampaigns(prev => ({ ...prev, [buyer.id]: value }))
                                        }
                                      >
                                        <SelectTrigger id={`campaign-${buyer.id}`}>
                                          <SelectValue placeholder="Select a campaign" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {campaigns
                                            .filter(c => !coverage.some(cov => cov.campaign_id === c.id))
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(campaign => (
                                              <SelectItem key={campaign.id} value={campaign.id}>
                                                {campaign.name}
                                              </SelectItem>
                                            ))
                                          }
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label htmlFor={`payout-${buyer.id}`}>Payout Amount</Label>
                                      <Input
                                        id={`payout-${buyer.id}`}
                                        type="number"
                                        step="0.01"
                                        value={payoutAmounts[buyer.id] || ""}
                                        onChange={(e) =>
                                          setPayoutAmounts(prev => ({ ...prev, [buyer.id]: e.target.value }))
                                        }
                                        placeholder="0.00"
                                      />
                                    </div>
                                    <Button onClick={() => handleAddCampaign(buyer.id)} className="w-full">
                                      Add Campaign
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </CardContent>
                          </Card>
                        </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
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
      </div>
    </MainLayout>
  );
};

export default BuyerDashboard;
