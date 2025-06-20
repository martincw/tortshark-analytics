
import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Trash2, Info, AlertCircle } from "lucide-react";
import { BulkStatsForm } from "@/components/campaigns/BulkStatsForm";
import { BulkAdsStatsForm } from "@/components/campaigns/BulkAdsStatsForm";
import { SingleDayBulkStatsForm } from "@/components/campaigns/SingleDayBulkStatsForm";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createDateAtUTCNoon, formatDateForStorage, format, addDays, getWeekStartDate, subDays } from "@/lib/utils/ManualDateUtils";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BulkStatsPage = () => {
  const initialDate = getWeekStartDate(createDateAtUTCNoon(new Date()));
  const [startDate, setStartDate] = useState<Date>(initialDate);
  const [singleDayDate, setSingleDayDate] = useState<Date>(subDays(createDateAtUTCNoon(new Date()), 1));
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

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

  const handleDateCheckboxChange = (date: Date) => {
    const dateStr = formatDateForStorage(date);
    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr);
      } else {
        return [...prev, dateStr];
      }
    });
  };

  const weekDates = React.useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  }, [startDate]);

  const handleBulkDelete = async () => {
    if (selectedDates.length === 0) {
      toast.error("Please select at least one date to delete");
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('campaign_stats_history')
        .delete()
        .in('date', selectedDates);
        
      if (error) {
        throw error;
      }
      
      toast.success("Selected stats deleted successfully");
      setShowDeleteConfirm(false);
      setSelectedDates([]);
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
            Add stats for multiple campaigns at once
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
              setDate={handleDateSelect} 
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={selectedDates.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected ({selectedDates.length})
            </Button>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-4 mt-2 p-2 bg-muted/30 rounded-md border border-border">
            {weekDates.map((date) => (
              <div key={date.toISOString()} className="flex items-center space-x-2 bg-background p-2 rounded-md shadow-sm">
                <Checkbox
                  id={`date-${date.toISOString()}`}
                  checked={selectedDates.includes(formatDateForStorage(date))}
                  onCheckedChange={() => handleDateCheckboxChange(date)}
                  className="h-5 w-5 border-2"
                />
                <label htmlFor={`date-${date.toISOString()}`} className="text-sm font-medium">
                  {format(date, "EEE dd")}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contractor Guidance Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>For Contractors:</strong> Use the "Single Day Stats" tab below for the most efficient daily workflow. 
          Select multiple campaigns, enter data using bulk paste features, and save all at once.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="single-day" className="w-full">
        <TabsList>
          <TabsTrigger value="single-day">Single Day Stats</TabsTrigger>
          <TabsTrigger value="manual">Weekly Stats</TabsTrigger>
          <TabsTrigger value="ads">Weekly Ad Stats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="single-day" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Single Day Bulk Stats
                <AlertCircle className="h-4 w-4 text-blue-500" />
              </CardTitle>
              <CardDescription>
                <strong>Recommended for contractors:</strong> Add stats for multiple campaigns for a specific day. 
                Perfect for entering yesterday's data across all your campaigns. Use bulk paste for efficiency.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select Date</label>
                <DatePicker 
                  date={singleDayDate} 
                  setDate={(date) => date && setSingleDayDate(date)} 
                />
              </div>
              <SingleDayBulkStatsForm selectedDate={singleDayDate} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Manual Stats</CardTitle>
              <CardDescription>
                Add leads, cases, retainers, and revenue for one campaign for the week of {format(startDate, "MMMM d")} to {format(addDays(startDate, 6), "MMMM d, yyyy")}.
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
                Add ad spend, impressions, clicks, and CPC for one campaign for the week of {format(startDate, "MMMM d")} to {format(addDays(startDate, 6), "MMMM d, yyyy")}.
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
            <DialogTitle>Confirm Delete Selected Days</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete stats for the selected {selectedDates.length} day(s)? This action cannot be undone.
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
