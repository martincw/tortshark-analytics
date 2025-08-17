import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Campaign } from "@/types/campaign-base";

interface AddBackendCaseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: Campaign[];
  onCaseAdded: () => void;
}

export const AddBackendCaseDialog: React.FC<AddBackendCaseDialogProps> = ({
  isOpen,
  onClose,
  campaigns,
  onCaseAdded
}) => {
  const [clientName, setClientName] = useState("");
  const [caseType, setCaseType] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [dateOpened, setDateOpened] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientName || !caseType || !campaignId || !dateOpened || !estimatedValue) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to add a case.",
          variant: "destructive",
        });
        return;
      }

      // Get user's workspace
      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (workspaceError || !workspaceData) {
        toast({
          title: "Error",
          description: "Could not find workspace.",
          variant: "destructive",
        });
        return;
      }

      // Generate case number
      const year = new Date().getFullYear();
      const caseNumber = `BC-${year}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      const { error } = await supabase
        .from('backend_cases')
        .insert([{
          case_number: caseNumber,
          client_name: clientName,
          case_type: caseType,
          campaign_id: campaignId,
          estimated_value: parseFloat(estimatedValue),
          date_opened: dateOpened.toISOString().split('T')[0],
          notes,
          user_id: user.id,
          workspace_id: workspaceData.workspace_id,
        }]);

      if (error) {
        console.error('Error adding case:', error);
        toast({
          title: "Error",
          description: "Failed to add case. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Backend case added successfully!",
      });

      // Reset form
      setClientName("");
      setCaseType("");
      setCampaignId("");
      setEstimatedValue("");
      setDateOpened(new Date());
      setNotes("");
      
      onCaseAdded();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Backend Case</DialogTitle>
          <DialogDescription>
            Add a new backend case to your portfolio.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="client-name">Client Name *</Label>
            <Input
              id="client-name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Johnson vs. MedCorp"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="case-type">Case Type *</Label>
            <Input
              id="case-type"
              value={caseType}
              onChange={(e) => setCaseType(e.target.value)}
              placeholder="Medical Malpractice"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="campaign">Campaign *</Label>
            <Select value={campaignId} onValueChange={setCampaignId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="estimated-value">Estimated Value ($) *</Label>
            <Input
              id="estimated-value"
              type="number"
              step="0.01"
              min="0"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="250000"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Date Opened *</Label>
            <DatePicker
              date={dateOpened}
              setDate={setDateOpened}
              className="w-full"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional case details..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Case"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};