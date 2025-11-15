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

const BuyerDashboard = () => {
  const { buyers, loading, addBuyer, getBuyerTortCoverage, addBuyerTortCoverage, toggleTortCoverageActive, removeBuyerTortCoverage } = useBuyers();
  const { campaigns } = useCampaign();
  const [buyerCoverages, setBuyerCoverages] = useState<Record<string, any[]>>({});
  const [loadingCoverages, setLoadingCoverages] = useState<Record<string, boolean>>({});
  const [newBuyerName, setNewBuyerName] = useState("");
  const [addBuyerOpen, setAddBuyerOpen] = useState(false);
  const [addCampaignDialogs, setAddCampaignDialogs] = useState<Record<string, boolean>>({});
  const [selectedCampaigns, setSelectedCampaigns] = useState<Record<string, string>>({});
  const [payoutAmounts, setPayoutAmounts] = useState<Record<string, string>>({});

  const activeBuyers = buyers.filter(b => 
    buyerCoverages[b.id]?.some(c => c.is_active) || !buyerCoverages[b.id]
  );

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
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {activeBuyers.map(buyer => {
              const coverage = buyerCoverages[buyer.id] || [];
              const activeCampaigns = coverage.filter(c => c.is_active);
              const isLoadingCoverage = loadingCoverages[buyer.id];

              return (
                <Card key={buyer.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">{buyer.name}</CardTitle>
                        {buyer.email && (
                          <p className="text-sm text-muted-foreground">{buyer.email}</p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {activeCampaigns.length} Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    <div className="space-y-2">
                      {isLoadingCoverage ? (
                        <div className="space-y-2">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : coverage.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No campaigns added yet
                        </p>
                      ) : (
                        coverage.map(cov => (
                          <div
                            key={cov.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
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
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveCampaign(cov.id, buyer.id)}
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
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default BuyerDashboard;
