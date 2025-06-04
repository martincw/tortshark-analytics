
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
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useNavigationWarning } from "@/hooks/useNavigationWarning";
import { DraftRecoveryBanner } from "@/components/ui/draft-recovery-banner";

interface CaseAttributionFormProps {
  campaignId: string;
  onAttributionAdded?: () => void;
}

interface AttributionFormData {
  selectedBuyerId: string;
  caseCount: string;
  pricePerCase: string;
  date: Date;
}

export const CaseAttributionForm = ({ campaignId, onAttributionAdded }: CaseAttributionFormProps) => {
  const { buyers, addBuyer } = useCaseBuyers();
  const [newBuyerName, setNewBuyerName] = useState("");
  const [isAddingBuyer, setIsAddingBuyer] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);

  const defaultValues: AttributionFormData = {
    selectedBuyerId: "",
    caseCount: "",
    pricePerCase: "",
    date: new Date()
  };

  const {
    formData,
    updateField,
    resetForm,
    isDirty,
    lastSaved,
    hasSavedData
  } = useFormPersistence<AttributionFormData>({
    storageKey: `caseAttribution-${campaignId}`,
    defaultValues,
    autoSaveDelay: 2000
  });

  useNavigationWarning({ 
    isDirty, 
    message: "You have unsaved case attribution data. Are you sure you want to leave?" 
  });

  // Check for saved data on mount
  React.useEffect(() => {
    if (hasSavedData()) {
      setShowDraftRecovery(true);
    }
  }, [hasSavedData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.selectedBuyerId || !formData.caseCount || !formData.pricePerCase || !formData.date) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from('case_attributions')
        .insert([{
          campaign_id: campaignId,
          buyer_id: formData.selectedBuyerId,
          case_count: parseInt(formData.caseCount),
          price_per_case: parseFloat(formData.pricePerCase),
          date: formData.date.toISOString().split('T')[0],
        }]);

      if (error) throw error;
      
      toast.success("Cases attributed successfully");
      resetForm();
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
      updateField('selectedBuyerId', buyer.id);
    }
  };

  const handleRestoreDraft = () => {
    setShowDraftRecovery(false);
  };

  const handleDiscardDraft = () => {
    resetForm();
    setShowDraftRecovery(false);
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

      <DraftRecoveryBanner
        show={showDraftRecovery}
        lastSaved={lastSaved}
        onRestore={handleRestoreDraft}
        onDiscard={handleDiscardDraft}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="buyer">Buyer</Label>
            <Select value={formData.selectedBuyerId} onValueChange={(value) => updateField('selectedBuyerId', value)}>
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
                value={formData.caseCount}
                onChange={(e) => updateField('caseCount', e.target.value)}
                placeholder="Enter number of cases"
              />
            </div>
            <div>
              <Label htmlFor="pricePerCase">Price per Case</Label>
              <Input
                id="pricePerCase"
                type="number"
                step="0.01"
                value={formData.pricePerCase}
                onChange={(e) => updateField('pricePerCase', e.target.value)}
                placeholder="Enter price per case"
              />
            </div>
          </div>

          <div>
            <Label>Date</Label>
            <DatePicker 
              date={formData.date}
              setDate={(date) => updateField('date', date)}
            />
          </div>
        </div>

        <Button type="submit" className="w-full">
          Attribute Cases
        </Button>
        
        {isDirty && (
          <div className="text-xs text-muted-foreground mt-2">
            {lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : "Auto-saving..."}
          </div>
        )}
      </form>
    </div>
  );
};
