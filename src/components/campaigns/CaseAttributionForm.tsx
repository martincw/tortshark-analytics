
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useCaseBuyers } from "@/hooks/useCaseBuyers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CaseAttributionFormProps {
  campaignId: string;
  onAttributionAdded?: () => void;
}

export const CaseAttributionForm = ({ campaignId, onAttributionAdded }: CaseAttributionFormProps) => {
  const { buyers, addBuyer } = useCaseBuyers();
  const [selectedBuyerId, setSelectedBuyerId] = useState<string>("");
  const [caseCount, setCaseCount] = useState("");
  const [pricePerCase, setPricePerCase] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [newBuyerName, setNewBuyerName] = useState("");
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBuyerId || !caseCount || !pricePerCase || !date) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from('case_attributions')
        .insert([{
          campaign_id: campaignId,
          buyer_id: selectedBuyerId,
          case_count: parseInt(caseCount),
          price_per_case: parseFloat(pricePerCase),
          date: date.toISOString().split('T')[0],
        }]);

      if (error) throw error;
      
      toast.success("Cases attributed successfully");
      setCaseCount("");
      setPricePerCase("");
      if (onAttributionAdded) {
        onAttributionAdded();
      }
    } catch (error) {
      console.error('Error attributing cases:', error);
      toast.error('Failed to attribute cases');
    }
  };

  const handleAddBuyer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBuyerName.trim()) {
      toast.error("Please enter a buyer name");
      return;
    }

    const buyer = await addBuyer(newBuyerName);
    if (buyer) {
      setNewBuyerName("");
      setIsAddingBuyer(false);
      setSelectedBuyerId(buyer.id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Attribute Cases</h3>
        <Dialog open={isAddingBuyer} onOpenChange={setIsAddingBuyer}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <PlusCircle className="w-4 h-4 mr-2" />
              Add Buyer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Buyer</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddBuyer} className="space-y-4">
              <div>
                <Label htmlFor="buyerName">Buyer Name</Label>
                <Input
                  id="buyerName"
                  value={newBuyerName}
                  onChange={(e) => setNewBuyerName(e.target.value)}
                  placeholder="Enter buyer name"
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Add Buyer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="buyer">Buyer</Label>
            <Select value={selectedBuyerId} onValueChange={setSelectedBuyerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a buyer" />
              </SelectTrigger>
              <SelectContent>
                {buyers.map((buyer) => (
                  <SelectItem key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="caseCount">Number of Cases</Label>
              <Input
                id="caseCount"
                type="number"
                value={caseCount}
                onChange={(e) => setCaseCount(e.target.value)}
                placeholder="Enter number of cases"
              />
            </div>
            <div>
              <Label htmlFor="pricePerCase">Price per Case</Label>
              <Input
                id="pricePerCase"
                type="number"
                step="0.01"
                value={pricePerCase}
                onChange={(e) => setPricePerCase(e.target.value)}
                placeholder="Enter price per case"
              />
            </div>
          </div>

          <div>
            <Label>Date</Label>
            <DatePicker 
              date={date}
              setDate={setDate}
            />
          </div>
        </div>

        <Button type="submit" className="w-full">
          Attribute Cases
        </Button>
      </form>
    </div>
  );
};
