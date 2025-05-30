
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardHeader, 
  CardTitle,
  CardContent
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { StatCard } from "@/components/ui/stat-card";
import { 
  CircleDollarSign, 
  Trash2,
  Plus,
  BadgeDollarSign,
  Shield,
  DollarSign,
  PencilLine,
  Phone,
  Key,
  FileText,
  Tag,
  Building,
  ToggleLeft,
  ToggleRight,
  Link,
  ExternalLink,
  Hash,
  Check,
  X
} from "lucide-react";
import { BuyerTortCoverage, CaseBuyer } from "@/types/buyer";
import { AddTortCoverageForm } from "./AddTortCoverageForm";
import { formatCurrency } from "@/utils/campaignUtils";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { EditTortCoverageForm } from "./EditTortCoverageForm";

interface BuyerCoverageDialogProps {
  buyerId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function BuyerCoverageDialog({ buyerId, isOpen, onClose }: BuyerCoverageDialogProps) {
  const { buyers, getBuyerTortCoverage, removeBuyerTortCoverage, updateBuyerTortCoverage, toggleTortCoverageActive } = useBuyers();
  const [coverages, setCoverages] = useState<BuyerTortCoverage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [buyer, setBuyer] = useState<CaseBuyer | null>(null);
  const [activeTab, setActiveTab] = useState<string>("coverages");
  const [editingCoverageId, setEditingCoverageId] = useState<string | null>(null);
  const [editingCoverage, setEditingCoverage] = useState<BuyerTortCoverage | null>(null);

  // Fetch data when the dialog opens or buyerId changes
  useEffect(() => {
    if (isOpen && buyerId) {
      fetchBuyerData();
    }
  }, [buyerId, isOpen]);

  // Find the buyer from the buyers list
  useEffect(() => {
    const currentBuyer = buyers.find(b => b.id === buyerId);
    if (currentBuyer) {
      setBuyer(currentBuyer);
    }
  }, [buyerId, buyers]);

  const fetchBuyerData = async () => {
    setLoading(true);
    try {
      const coverageData = await getBuyerTortCoverage(buyerId);
      console.log('Raw coverage data:', coverageData);
      
      // Map the data to ensure it matches our expected format
      const formattedCoverages: BuyerTortCoverage[] = coverageData.map(item => ({
        id: item.id,
        buyer_id: item.buyer_id,
        campaign_id: item.campaign_id,
        payout_amount: item.payout_amount,
        did: item.did || '',
        inbound_did: item.inbound_did || '',
        transfer_did: item.transfer_did || '',
        intake_center: item.intake_center || '',
        campaign_key: item.campaign_key || '',
        notes: item.notes || '',
        spec_sheet_url: item.spec_sheet_url || '',
        campaign_url: item.campaign_url || '',
        label: item.label || '',
        is_active: item.is_active !== undefined ? item.is_active : true,
        // Handle nested campaigns object structure
        campaigns: item.campaigns ? {
          id: item.campaigns.id,
          name: item.campaigns.name
        } : undefined
      }));
      
      console.log('Formatted coverages:', formattedCoverages);
      setCoverages(formattedCoverages);
    } catch (error) {
      console.error("Error fetching buyer tort coverage:", error);
      toast.error("Failed to load tort coverage data");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoverage = async (coverageId: string) => {
    if (confirm("Are you sure you want to remove this tort coverage?")) {
      try {
        const success = await removeBuyerTortCoverage(coverageId);
        if (success) {
          // Update the local state
          setCoverages(coverages.filter(coverage => coverage.id !== coverageId));
          toast.success("Coverage removed successfully");
        }
      } catch (error) {
        console.error("Error removing coverage:", error);
        toast.error("Failed to remove coverage");
      }
    }
  };

  const handleAddCoverage = async (newCoverage: BuyerTortCoverage) => {
    // Add the new coverage to the local state
    setCoverages([...coverages, newCoverage]);
    setShowAddForm(false);
    toast.success("Coverage added successfully");
  };

  const startEditCoverage = (coverage: BuyerTortCoverage) => {
    setEditingCoverageId(coverage.id);
    setEditingCoverage(coverage);
  };

  const handleUpdateCoverage = async (updatedCoverage: BuyerTortCoverage) => {
    try {
      // Update the UI optimistically
      const updatedCoverages = coverages.map(c => 
        c.id === updatedCoverage.id ? updatedCoverage : c
      );
      setCoverages(updatedCoverages);
      setEditingCoverageId(null);
      setEditingCoverage(null);
      
      toast.success("Tort coverage updated successfully");
    } catch (error) {
      console.error("Error updating coverage:", error);
      toast.error("Failed to update coverage");
      // Revert the optimistic update on failure
      await fetchBuyerData();
    }
  };

  const handleToggleActive = async (coverageId: string, currentActive: boolean) => {
    try {
      await toggleTortCoverageActive(coverageId, !currentActive);
      
      // Update the local state optimistically
      const updatedCoverages = coverages.map(coverage =>
        coverage.id === coverageId 
          ? { ...coverage, is_active: !currentActive } 
          : coverage
      );
      
      setCoverages(updatedCoverages);
      toast.success(`Tort coverage ${!currentActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error) {
      console.error("Error toggling coverage status:", error);
      toast.error("Failed to update coverage status");
      // Revert the optimistic update on failure
      await fetchBuyerData();
    }
  };

  const cancelEdit = () => {
    setEditingCoverageId(null);
    setEditingCoverage(null);
  };

  // Calculate coverage statistics
  const totalPayoutAmount = coverages.reduce((sum, coverage) => sum + coverage.payout_amount, 0);
  const averagePayoutAmount = coverages.length > 0 ? totalPayoutAmount / coverages.length : 0;
  const highestPayout = coverages.length > 0 ? 
    Math.max(...coverages.map(coverage => coverage.payout_amount)) : 0;

  const handleDialogClose = () => {
    // Reset state when dialog closes
    setShowAddForm(false);
    setEditingCoverageId(null);
    setEditingCoverage(null);
    onClose();
  };

  const openSpecSheet = (url?: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const openCampaignUrl = (url?: string) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Tort Coverage for {buyer?.name}
          </DialogTitle>
          <DialogDescription>
            Manage which torts (campaigns) this buyer purchases and their payout amounts
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="coverages" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="coverages">Tort Coverages</TabsTrigger>
            <TabsTrigger value="stats">Coverage Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="coverages" className="space-y-4 py-4">
            {!showAddForm && !editingCoverageId && (
              <div className="mb-4">
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tort Coverage
                </Button>
              </div>
            )}

            {showAddForm && (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add New Coverage</CardTitle>
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

            {editingCoverageId && editingCoverage && (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Edit Coverage</CardTitle>
                </CardHeader>
                <CardContent>
                  <EditTortCoverageForm 
                    coverage={editingCoverage}
                    onSave={handleUpdateCoverage}
                    onCancel={cancelEdit}
                    existingCoverages={coverages.filter(c => c.id !== editingCoverageId)}
                  />
                </CardContent>
              </Card>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : coverages.length === 0 && !showAddForm ? (
              <div className="text-center py-8 bg-muted/30 rounded-md">
                <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="font-medium">No tort coverages added yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a tort coverage to specify which cases this buyer purchases.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setShowAddForm(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Coverage
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {!editingCoverageId && !showAddForm && coverages.map((coverage) => (
                  <Card 
                    key={coverage.id} 
                    className={`overflow-hidden ${!coverage.is_active ? 'border-muted bg-muted/20' : ''}`}
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <h3 className={`font-medium ${!coverage.is_active ? 'text-muted-foreground' : ''}`}>
                                {coverage.campaigns?.name || "Unknown Campaign"}
                              </h3>
                              {coverage.label && (
                                <Badge variant="outline" className="text-xs">
                                  {coverage.label}
                                </Badge>
                              )}
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={coverage.is_active}
                                  onCheckedChange={() => handleToggleActive(coverage.id, coverage.is_active)}
                                  className="data-[state=checked]:bg-green-500"
                                />
                                <span className="text-xs text-muted-foreground">
                                  {coverage.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1 text-xs mt-1">
                              <div className="flex items-center text-muted-foreground">
                                <Hash className="h-3.5 w-3.5 mr-1" />
                                Campaign ID: {coverage.campaign_id}
                              </div>
                              
                              {coverage.campaign_url && (
                                <div className="flex items-center">
                                  <Link className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                                  <Button
                                    variant="link"
                                    className="h-auto p-0 text-xs"
                                    onClick={() => openCampaignUrl(coverage.campaign_url)}
                                  >
                                    {coverage.campaign_url}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center mt-1.5">
                            <BadgeDollarSign className="h-4 w-4 text-green-600 mr-1" />
                            <span className="font-semibold">
                              {formatCurrency(coverage.payout_amount)}
                            </span>
                            <Badge variant="outline" className="ml-2">
                              per case
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => startEditCoverage(coverage)}
                          >
                            <PencilLine className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveCoverage(coverage.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Display additional fields regardless of whether they're populated */}
                      <div className="mt-4 space-y-3 text-sm">
                        <Separator className="my-3" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="font-medium mr-2">Inbound DID:</span>
                            <span>{coverage.inbound_did || "Not specified"}</span>
                          </div>
                          
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span className="font-medium mr-2">Transfer DID:</span>
                            <span>{coverage.transfer_did || "Not specified"}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center">
                          <Building className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium mr-2">Intake Center:</span>
                          <span>{coverage.intake_center || "Not specified"}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <Key className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium mr-2">Campaign Key:</span>
                          <span>{coverage.campaign_key || "Not specified"}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium mr-2">Spec Sheet:</span>
                          {coverage.spec_sheet_url ? (
                            <Button 
                              variant="link" 
                              className="h-auto p-0 text-primary"
                              onClick={() => openSpecSheet(coverage.spec_sheet_url)}
                            >
                              View Spec Sheet
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">None provided</span>
                          )}
                        </div>
                        
                        <div className="flex">
                          <span className="font-medium mr-2 mt-0.5">Notes:</span>
                          <p className="text-muted-foreground">
                            {coverage.notes || "No notes added"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="stats" className="py-4">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Torts Covered"
                  value={coverages.length}
                  icon={<Shield className="h-4 w-4" />}
                  description="Number of campaigns covered"
                />
                
                <StatCard
                  title="Average Payout"
                  value={formatCurrency(averagePayoutAmount)}
                  icon={<DollarSign className="h-4 w-4" />}
                  description="Per case average"
                />
                
                <StatCard
                  title="Highest Payout"
                  value={formatCurrency(highestPayout)}
                  icon={<BadgeDollarSign className="h-4 w-4" />}
                  description="Maximum per case"
                  isHighlighted={true}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payout Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {coverages.length > 0 ? (
                    <div className="space-y-3">
                      {coverages.map((coverage) => (
                        <div 
                          key={coverage.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm">
                              {coverage.campaigns?.name || "Unknown"}
                            </span>
                            {coverage.label && (
                              <span className="text-xs text-muted-foreground">
                                ({coverage.label})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <div 
                              className="h-2 bg-primary rounded-full mr-3"
                              style={{ 
                                width: `${Math.max((coverage.payout_amount / highestPayout) * 100, 15)}px` 
                              }}
                            />
                            <span className="font-medium text-sm">
                              {formatCurrency(coverage.payout_amount)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-6 text-muted-foreground">
                      No tort coverage data available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleDialogClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
