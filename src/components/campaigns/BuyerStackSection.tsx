
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Campaign, BuyerStackItem, CaseBuyer } from "@/types/campaign";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useBuyers } from "@/hooks/useBuyers";
import { formatCurrency } from "@/utils/campaignUtils";
import { supabase } from "@/integrations/supabase/client";
import {
  GripVertical, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Mail, 
  Globe,
  BadgeDollarSign,
  EyeOff,
  Eye
} from "lucide-react";
import { AddBuyerToStackDialog } from "./AddBuyerToStackDialog";
import { toast } from "sonner";

interface BuyerStackSectionProps {
  campaign: Campaign;
}

export function BuyerStackSection({ campaign }: BuyerStackSectionProps) {
  const { getCampaignBuyerStack, updateBuyerStackOrder, removeBuyerFromStack, toggleStackItemActive } = useBuyers();
  const [stackItems, setStackItems] = useState<BuyerStackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    if (campaign?.id) {
      loadBuyerStack();
    }
  }, [campaign?.id]);

  const loadBuyerStack = async () => {
    if (!campaign?.id) return;
    
    setLoading(true);
    try {
      // Fetch all buyers that have tort coverage for this campaign
      const { data: coverageData, error: coverageError } = await supabase
        .from('buyer_tort_coverage')
        .select(`
          id,
          buyer_id,
          campaign_id,
          payout_amount,
          is_active,
          buyers:buyer_id (
            id,
            name,
            email,
            url,
            user_id
          )
        `)
        .eq('campaign_id', campaign.id);

      if (coverageError) throw coverageError;

      // Also fetch the campaign_buyer_stack to get stack_order
      const stack = await getCampaignBuyerStack(campaign.id);
      
      // Create a map of buyer_id to stack_order
      const stackOrderMap = new Map(
        stack.map(item => [item.buyers?.id, item.stack_order])
      );

      // Format all buyers with tort coverage
      const formattedStack: BuyerStackItem[] = (coverageData || []).map((item, index) => ({
        id: item.id,
        campaign_id: campaign.id,
        buyer_id: item.buyer_id,
        stack_order: stackOrderMap.get(item.buyer_id) ?? index,
        payout_amount: item.payout_amount,
        is_active: item.is_active,
        buyers: item.buyers as CaseBuyer,
        coverage_id: item.id
      }));

      // Sort by stack_order
      formattedStack.sort((a, b) => (a.stack_order || 0) - (b.stack_order || 0));
      
      setStackItems(formattedStack);
    } catch (error) {
      console.error("Error loading buyer stack:", error);
      toast.error("Failed to load buyer stack");
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    const { destination, source } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // No change in position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Reorder the list
    const newItems = Array.from(stackItems);
    const [removed] = newItems.splice(source.index, 1);
    newItems.splice(destination.index, 0, removed);

    // Update the order values
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      stack_order: index
    }));

    setStackItems(updatedItems);

    // Persist the changes
    try {
      const updateResult = await updateBuyerStackOrder(
        updatedItems.map(item => ({
          id: item.id,
          stack_order: item.stack_order || 0
        }))
      );
      
      if (updateResult) {
        toast.success("Stack order updated successfully");
      }
    } catch (error) {
      console.error("Error updating stack order:", error);
      toast.error("Failed to update stack order");
      // Revert to the original order if there's an error
      loadBuyerStack();
    }
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleRemoveFromStack = async (itemId: string) => {
    if (confirm("Are you sure you want to remove this buyer from the stack?")) {
      const success = await removeBuyerFromStack(itemId);
      if (success) {
        setStackItems(stackItems.filter(item => item.id !== itemId));
      }
    }
  };

  const handleToggleActive = async (itemId: string, currentStatus: boolean) => {
    setTogglingId(itemId);
    try {
      await toggleStackItemActive(itemId, !currentStatus);
      setStackItems(items => 
        items.map(item => 
          item.id === itemId ? { ...item, is_active: !currentStatus } : item
        )
      );
    } catch (error) {
      console.error("Error toggling item status:", error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleAddToStack = () => {
    loadBuyerStack();
    setShowAddDialog(false);
  };

  const openWebsite = (url: string | undefined) => {
    if (!url) {
      toast.error("No website URL available");
      return;
    }

    let fullUrl = url;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }
    window.open(fullUrl, '_blank');
  };

  // Filter items based on active status
  const displayItems = showInactive 
    ? stackItems 
    : stackItems.filter(item => item.is_active);

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Buyer Stack</CardTitle>
            <CardDescription>
              Arrange buyers in priority order for this campaign
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? <Eye className="mr-1 h-4 w-4" /> : <EyeOff className="mr-1 h-4 w-4" />}
              {showInactive ? "Hide inactive" : "Show inactive"}
            </Button>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Buyer
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            <p>No buyers in the stack yet</p>
            <p className="text-sm mt-1">Add buyers to create a waterfall for this campaign</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <Droppable droppableId="buyer-stack">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {displayItems.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`border rounded-md p-3 bg-white flex flex-col gap-2 ${
                            snapshot.isDragging ? "shadow-lg" : ""
                          } ${!item.is_active ? "opacity-50" : ""}`}
                        >
                          {/* Buyer Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div 
                                {...provided.dragHandleProps} 
                                className="cursor-grab p-1 rounded-md hover:bg-gray-100"
                              >
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {item.buyers?.name || "Unknown Buyer"}
                                  <Badge className="ml-2">{`Priority ${index + 1}`}</Badge>
                                  {!item.is_active && (
                                    <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                size="sm"
                                checked={!!item.is_active}
                                disabled={togglingId === item.id}
                                onCheckedChange={() => handleToggleActive(item.id, !!item.is_active)}
                                className="scale-75 origin-right"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => {
                                  handleRemoveFromStack(item.id);
                                }}
                                type="button"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Buyer Details */}
                          <div className="flex items-center justify-between px-4">
                            <div className="flex flex-col text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                <BadgeDollarSign className="h-3.5 w-3.5" />
                                <span>{formatCurrency(item.payout_amount || 0)} per case</span>
                              </div>
                              
                              {item.buyers?.email && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  <span>{item.buyers.email}</span>
                                </div>
                              )}
                            </div>
                            
                            {item.buyers?.url && (
                              <Button
                                variant="outline" 
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  openWebsite(item.buyers?.url);
                                }}
                                type="button"
                              >
                                <Globe className="h-3 w-3 mr-1" />
                                Website
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {showAddDialog && (
          <AddBuyerToStackDialog
            campaignId={campaign.id}
            isOpen={showAddDialog}
            onClose={() => setShowAddDialog(false)}
            onSuccess={handleAddToStack}
            currentStackIds={stackItems.map(item => item.buyer_id || '')}
          />
        )}
      </CardContent>
    </Card>
  );
}
