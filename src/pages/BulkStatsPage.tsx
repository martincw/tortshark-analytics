
import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BulkStatsForm } from "@/components/campaigns/BulkStatsForm";
import { BulkAdsStatsForm } from "@/components/campaigns/BulkAdsStatsForm";
import { createDateAtUTCNoon, formatDateForStorage, format, addDays, getWeekStartDate } from "@/lib/utils/ManualDateUtils";

const BulkStatsPage = () => {
  // Use the current date to get the start date for the current week (Monday)
  const initialDate = getWeekStartDate(createDateAtUTCNoon(new Date()));
  const [startDate, setStartDate] = useState<Date>(initialDate);

  const moveWeek = (direction: 'previous' | 'next') => {
    setStartDate(prevDate => {
      const newDate = new Date(prevDate);
      const offset = direction === 'previous' ? -7 : 7;
      newDate.setUTCDate(prevDate.getUTCDate() + offset);
      return getWeekStartDate(newDate); // Ensure we always snap to Monday
    });
  };
  
  // Handle date selection from the DatePicker
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Always ensure the selected date starts on a Monday
      const weekStart = getWeekStartDate(date);
      console.log(`Selected date: ${date.toISOString()}, Week start: ${weekStart.toISOString()}`);
      setStartDate(weekStart);
    }
  };

  // Create an array of 7 days (Monday to Sunday) for display in the UI
  const weekDates = React.useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(startDate, i));
    }
    return dates;
  }, [startDate]);

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
          
          <DatePicker 
            date={startDate} 
            onSelect={handleDateSelect} 
          />
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
    </div>
  );
};

export default BulkStatsPage;
