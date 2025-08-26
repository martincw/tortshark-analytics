import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/campaignUtils";
import { DollarSign, Edit2 } from "lucide-react";

interface CampaignReturn {
  id: string;
  campaign_id: string;
  return_amount: number;
  notes?: string;
  created_at: string;
}

interface CampaignReturnsProps {
  campaignId: string;
  workspaceId?: string;
}

export function WeeklyReturnsSection({ campaignId, workspaceId }: CampaignReturnsProps) {
  const [campaignReturn, setCampaignReturn] = useState<CampaignReturn | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    returnAmount: "",
    notes: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchReturns();
  }, [campaignId]);

  const fetchReturns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaign_returns')
        .select('*')
        .eq('campaign_id', campaignId)
        .maybeSingle();

      if (error) throw error;
      setCampaignReturn(data);
      
      if (data) {
        setFormData({
          returnAmount: data.return_amount.toString(),
          notes: data.notes || ""
        });
      }
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch returns data",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const returnData = {
        campaign_id: campaignId,
        workspace_id: workspaceId,
        return_amount: parseFloat(formData.returnAmount) || 0,
        notes: formData.notes || null
      };

      if (campaignReturn) {
        const { error } = await supabase
          .from('campaign_returns')
          .update(returnData)
          .eq('id', campaignReturn.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Returns updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('campaign_returns')
          .insert([returnData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Returns added successfully"
        });
      }

      setIsDialogOpen(false);
      fetchReturns();
    } catch (error) {
      console.error('Error saving returns:', error);
      toast({
        title: "Error",
        description: "Failed to save returns",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    if (campaignReturn) {
      setFormData({
        returnAmount: campaignReturn.return_amount.toString(),
        notes: campaignReturn.notes || ""
      });
    } else {
      setFormData({
        returnAmount: "",
        notes: ""
      });
    }
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Campaign Returns & Markdowns
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={handleEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                {campaignReturn ? "Edit Returns" : "Add Returns"}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {campaignReturn ? "Edit Campaign Returns" : "Add Campaign Returns"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="returnAmount">Total Returns Amount ($)</Label>
                  <Input
                    id="returnAmount"
                    type="number"
                    step="0.01"
                    value={formData.returnAmount}
                    onChange={(e) => setFormData({...formData, returnAmount: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    placeholder="Add any notes about these returns..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : (campaignReturn ? "Update" : "Add Returns")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {campaignReturn ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
              <span className="font-medium">Total Campaign Returns:</span>
              <span className="font-bold text-lg">{formatCurrency(campaignReturn.return_amount)}</span>
            </div>
            {campaignReturn.notes && (
              <div className="p-3 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Notes:</p>
                <p className="text-sm">{campaignReturn.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No returns recorded yet</p>
            <p className="text-sm">Add your campaign returns above</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}