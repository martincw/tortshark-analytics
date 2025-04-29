
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
import { useBuyers } from "@/hooks/useBuyers";
import { formatCurrency } from "@/utils/campaignUtils";
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Mail, 
  Globe,
  BadgeDollarSign
} from "lucide-react";
import { AddBuyerToStackDialog } from "./AddBuyerToStackDialog";
import { toast } from "sonner";

interface BuyerStackSectionProps {
  campaign: Campaign;
}

export function BuyerStackSection({ campaign }: BuyerStackSectionProps) {
  const { getCampaignBuyerStack, updateBuyerStackOrder, removeBuyerFromStack } = useBuyers();
  const [stackItems, setStackItems] = useState<BuyerStackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    if (campaign.id) {
      loadBuyerStack();
    }
  }, [campaign.id]);

  const loadBuyerStack = async () => {
    setLoading(true);
    try {
      const stack = await getCampaignBuyerStack(campaign.id);
      const formattedStack: BuyerStackItem[] = stack.map(item => ({
        id: item.id,
        campaign_id: campaign.id,
        buyer_id: item.buyers?.id || '',
        stack_order: item.stack_order,
        payout_amount: item.payout_amount,
        buyers: item.buyers as CaseBuyer
      }));
      setStackItems(formattedStack);
    } catch (error) {
      console.error("Error loading buyer stack:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
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
    await updateBuyerStackOrder(
      updatedItems.map(item => ({
        id: item.id,
        stack_order: item.stack_order
      }))
    );
  };

  const handleRemoveFromStack = async (itemId: string) => {
    if (confirm("Are you sure you want to remove this buyer from the stack?")) {
      const success = await removeBuyerFromStack(itemId);
      if (success) {
        setStackItems(stackItems.filter(item => item.id !== itemId));
      }
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
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Buyer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : stackItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed rounded-md">
            <p>No buyers in the stack yet</p>
            <p className="text-sm mt-1">Add buyers to create a waterfall for this campaign</p>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="buyer-stack">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {stackItems.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="border rounded-md p-3 bg-white flex flex-col gap-2"
                        >
                          {/* Buyer Header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div {...provided.dragHandleProps} className="cursor-grab">
                                <GripVertical className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <div>
                                <div className="font-medium flex items-center gap-2">
                                  {item.buyers?.name || "Unknown Buyer"}
                                  <Badge className="ml-2">{`Priority ${index + 1}`}</Badge>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleRemoveFromStack(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {/* Buyer Details */}
                          <div className="flex items-center justify-between px-8">
                            <div className="flex flex-col text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                                <BadgeDollarSign className="h-3.5 w-3.5" />
                                <span>{formatCurrency(item.payout_amount)} per case</span>
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
                                onClick={() => openWebsite(item.buyers?.url)}
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
            currentStackIds={stackItems.map(item => item.buyer_id)}
          />
        )}
      </CardContent>
    </Card>
  );
}
