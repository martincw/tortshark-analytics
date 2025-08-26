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
import { Plus, Calendar, DollarSign, Edit2, Trash2 } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface WeeklyReturn {
  id: string;
  campaign_id: string;
  week_start_date: string;
  return_amount: number;
  notes?: string;
  created_at: string;
}

interface WeeklyReturnsSectionProps {
  campaignId: string;
  workspaceId?: string;
}

export function WeeklyReturnsSection({ campaignId, workspaceId }: WeeklyReturnsSectionProps) {
  const [returns, setReturns] = useState<WeeklyReturn[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingReturn, setEditingReturn] = useState<WeeklyReturn | null>(null);
  const [formData, setFormData] = useState({
    weekStartDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
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
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      setReturns(data || []);
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
        week_start_date: formData.weekStartDate,
        return_amount: parseFloat(formData.returnAmount) || 0,
        notes: formData.notes || null
      };

      if (editingReturn) {
        const { error } = await supabase
          .from('campaign_returns')
          .update(returnData)
          .eq('id', editingReturn.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Return updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('campaign_returns')
          .insert([returnData]);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Return added successfully"
        });
      }

      setIsDialogOpen(false);
      setEditingReturn(null);
      setFormData({
        weekStartDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
        returnAmount: "",
        notes: ""
      });
      fetchReturns();
    } catch (error) {
      console.error('Error saving return:', error);
      toast({
        title: "Error",
        description: "Failed to save return",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (returnItem: WeeklyReturn) => {
    setEditingReturn(returnItem);
    setFormData({
      weekStartDate: returnItem.week_start_date,
      returnAmount: returnItem.return_amount.toString(),
      notes: returnItem.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (returnId: string) => {
    if (!confirm("Are you sure you want to delete this return entry?")) return;

    try {
      const { error } = await supabase
        .from('campaign_returns')
        .delete()
        .eq('id', returnId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Return deleted successfully"
      });
      fetchReturns();
    } catch (error) {
      console.error('Error deleting return:', error);
      toast({
        title: "Error",
        description: "Failed to delete return",
        variant: "destructive"
      });
    }
  };

  const getTotalReturns = () => {
    return returns.reduce((total, returnItem) => total + returnItem.return_amount, 0);
  };

  const getWeekEndDate = (weekStartDate: string) => {
    return format(endOfWeek(new Date(weekStartDate)), 'MMM dd, yyyy');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Weekly Returns & Markdowns
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setEditingReturn(null);
                setFormData({
                  weekStartDate: format(startOfWeek(new Date()), 'yyyy-MM-dd'),
                  returnAmount: "",
                  notes: ""
                });
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Return
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingReturn ? "Edit Weekly Return" : "Add Weekly Return"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="weekStartDate">Week Starting Date</Label>
                  <Input
                    id="weekStartDate"
                    type="date"
                    value={formData.weekStartDate}
                    onChange={(e) => setFormData({...formData, weekStartDate: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="returnAmount">Return Amount ($)</Label>
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
                    placeholder="Add any notes about this return..."
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
                    {isLoading ? "Saving..." : (editingReturn ? "Update" : "Add Return")}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {returns.length > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
              <span className="font-medium">Total Returns:</span>
              <span className="font-bold text-lg">{formatCurrency(getTotalReturns())}</span>
            </div>
            
            <div className="space-y-3">
              {returns.map((returnItem) => (
                <div key={returnItem.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {format(new Date(returnItem.week_start_date), 'MMM dd')} - {getWeekEndDate(returnItem.week_start_date)}
                      </span>
                    </div>
                    {returnItem.notes && (
                      <p className="text-sm text-muted-foreground">{returnItem.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-lg">
                      {formatCurrency(returnItem.return_amount)}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(returnItem)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(returnItem.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No returns recorded yet</p>
            <p className="text-sm">Add your first weekly return above</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}