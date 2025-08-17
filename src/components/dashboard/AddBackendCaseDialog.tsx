import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
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
  const [campaignId, setCampaignId] = useState("");
  const [caseCount, setCaseCount] = useState("");
  const [pricePerCase, setPricePerCase] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignId || !date || !caseCount || !pricePerCase) {
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
          description: "You must be logged in to add case stats.",
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

      const { error } = await supabase
        .from('backend_case_stats')
        .upsert([{
          date: date.toISOString().split('T')[0],
          campaign_id: campaignId,
          case_count: parseInt(caseCount),
          price_per_case: parseFloat(pricePerCase),
          user_id: user.id,
          workspace_id: workspaceData.workspace_id,
        }], {
          onConflict: 'date,campaign_id,workspace_id'
        });

      if (error) {
        console.error('Error adding case stats:', error);
        toast({
          title: "Error",
          description: "Failed to add case stats. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Backend case stats added successfully!",
      });

      // Reset form
      setCampaignId("");
      setCaseCount("");
      setPricePerCase("");
      setDate(new Date());
      
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
          <DialogTitle>Add Backend Case Stats</DialogTitle>
          <DialogDescription>
            Add daily backend case statistics for a campaign.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Date *</Label>
            <DatePicker
              date={date}
              setDate={setDate}
              className="w-full"
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
            <Label htmlFor="case-count"># of Cases *</Label>
            <Input
              id="case-count"
              type="number"
              min="0"
              value={caseCount}
              onChange={(e) => setCaseCount(e.target.value)}
              placeholder="3"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="price-per-case">$ per Case *</Label>
            <Input
              id="price-per-case"
              type="number"
              step="0.01"
              min="0"
              value={pricePerCase}
              onChange={(e) => setPricePerCase(e.target.value)}
              placeholder="5000.00"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Stats"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};