import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { BulkStatsForm } from "@/components/campaigns/BulkStatsForm";
import { BulkAdsStatsForm } from "@/components/campaigns/BulkAdsStatsForm";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createDateAtUTCNoon, formatDateForStorage, format, addDays, getWeekStartDate } from "@/lib/utils/ManualDateUtils";
import { supabase } from "@/integrations/supabase/client";

const BulkStatsPage = () => {
  const initialDate = getWeekStartDate(createDateAtUTCNoon(new Date()));
  const [startDate, setStartDate] = useState<Date>(initialDate);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const moveWeek = (direction: 'previous' | 'next') => {
    setStartDate(prevDate => {
      const newDate = new Date(prevDate);
      const offset = direction === 'previous' ? -7 : 7;
      newDate.setUTCDate(prevDate.getUTCDate() + offset);
      return getWeekStartDate(newDate);
    });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const weekStart = getWeekStartDate(date);
      console.log(`Selected date: ${date.toISOString()}, Week start: ${weekStart.toISOString()}`);
      setStartDate(weekStart);
    }
  };

  const weekDates = React.useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  }, [startDate]);

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      const startDateStr = formatDateForStorage(startDate);
      const endDate = addDays(startDate, 6);
      const endDateStr = formatDateForStorage(endDate);
      
      const { error } = await supabase
        .from('campaign_stats_history')
        .delete()
        .gte('date', startDateStr)
        .lte('date', endDateStr);
        
      if (error) {
        throw error;
      }
      
      toast.success("Stats deleted successfully");
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting stats:", error);
      toast.error("Failed to delete stats");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Campaign Stats</h1>
          <p className="text-muted-foreground mt-1">
            Add daily stats for multiple campaigns for the week
          </p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => moveWeek('previous')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <p className="font-medium">Week of {format(startDate, "MMM d")}</p>
              <p className="text-sm text-muted-foreground">
                {format(startDate, "MMM d")} - {format(addDays(startDate, 6), "MMM d, yyyy")}
              </p>
            </div>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => moveWeek('next')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <DatePicker 
              date={startDate} 
              onSelect={handleDateSelect} 
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Week
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="manual" className="w-full">
        <TabsList>
          <TabsTrigger value="manual">Manual Stats</TabsTrigger>
          <TabsTrigger value="ads">Ad Spend Stats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Manual Stats</CardTitle>
              <CardDescription>
                Add leads, cases, retainers, and revenue for multiple campaigns for the week of {format(startDate, "MMMM d")} to {format(addDays(startDate, 6), "MMMM d, yyyy")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkStatsForm startDate={startDate} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ads" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Ad Stats</CardTitle>
              <CardDescription>
                Add ad spend, impressions, clicks, and CPC for multiple campaigns for the week of {format(startDate, "MMMM d")} to {format(addDays(startDate, 6), "MMMM d, yyyy")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkAdsStatsForm startDate={startDate} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all stats for the week of {format(startDate, "MMMM d")} to {format(addDays(startDate, 6), "MMMM d, yyyy")}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Stats"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkStatsPage;
