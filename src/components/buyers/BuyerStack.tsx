
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Grip, Trash2, PlusCircle } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CaseBuyer } from "@/types/campaign";
import { useCampaignBuyers, BuyerStackItem } from "@/hooks/useCampaignBuyers";
import { toast } from "sonner";

interface BuyerStackProps {
  campaignId: string;
  editable?: boolean;
}

export function BuyerStack({ campaignId, editable = true }: BuyerStackProps) {
  const { 
    buyers, 
    buyerStack, 
    loading, 
    addBuyerToStack, 
    removeBuyerFromStack, 
    updateBuyerStackOrder 
  } = useCampaignBuyers(campaignId);
  
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("");
  const [draggedItem, setDraggedItem] = useState<BuyerStackItem | null>(null);

  const handleAddBuyer = async () => {
    if (!selectedBuyerId) {
      toast.warning("Please select a buyer first");
      return;
    }
    await addBuyerToStack(selectedBuyerId);
    setSelectedBuyerId("");
  };

  const handleDragStart = (item: BuyerStackItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLIElement>, targetItem: BuyerStackItem) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;
    
    const sourceIndex = buyerStack.findIndex(item => item.id === draggedItem.id);
    const targetIndex = buyerStack.findIndex(item => item.id === targetItem.id);
    
    if (sourceIndex === targetIndex) return;
    
    // Create new stack with reordered items
    const newStack = [...buyerStack];
    const [movedItem] = newStack.splice(sourceIndex, 1);
    newStack.splice(targetIndex, 0, movedItem);
    
    // Update the stackOrder property
    const reorderedStack = newStack.map((item, index) => ({
      ...item,
      stackOrder: index
    }));

    // Save the new order to database
    updateBuyerStackOrder(reorderedStack);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const getAvailableBuyers = () => {
    // Filter out buyers that are already in the stack
    const stackBuyerIds = buyerStack.map(item => item.buyerId);
    return buyers.filter(buyer => !stackBuyerIds.includes(buyer.id));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Buyer Stack</h3>
      <p className="text-sm text-muted-foreground">
        The order of buyers determines which buyer gets leads first.
      </p>
      
      {editable && (
        <div className="flex gap-2">
          <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a buyer" />
            </SelectTrigger>
            <SelectContent>
              {getAvailableBuyers().map(buyer => (
                <SelectItem key={buyer.id} value={buyer.id}>
                  {buyer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddBuyer} disabled={!selectedBuyerId}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Buyer
          </Button>
        </div>
      )}
      
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading buyer stack...</p>
      ) : buyerStack.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              No buyers in stack. Add buyers to define the lead flow.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {buyerStack.map((item, index) => (
            <li 
              key={item.id}
              draggable={editable}
              onDragStart={() => handleDragStart(item)}
              onDragOver={(e) => handleDragOver(e, item)}
              onDragEnd={handleDragEnd}
              className={`
                flex items-center justify-between p-3 rounded border
                ${editable ? 'cursor-grab active:cursor-grabbing' : ''}
                ${draggedItem?.id === item.id ? 'opacity-50' : 'opacity-100'}
                transition-opacity
              `}
            >
              <div className="flex items-center gap-3">
                {editable && <Grip className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="font-medium">{item.buyer.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Priority: {index + 1}
                  </p>
                </div>
              </div>
              {editable && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeBuyerFromStack(item.id)}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
