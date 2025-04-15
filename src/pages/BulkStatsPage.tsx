
import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { BulkStatsForm } from "@/components/campaigns/BulkStatsForm";
import { BulkAdsStatsForm } from "@/components/campaigns/BulkAdsStatsForm";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BulkStatsPage = () => {
  // Initialize the start date with noon time to avoid timezone issues
  const initialDate = new Date();
  initialDate.setHours(12, 0, 0, 0);
  
  const [startDate, setStartDate] = useState<Date>(initialDate);
  const endDate = addDays(startDate, 6); // 7 days total (start date + 6 more days)

  const moveWeek = (direction: 'previous' | 'next') => {
    setStartDate(prevDate => {
      const offset = direction === 'previous' ? -7 : 7;
      const newDate = addDays(prevDate, offset);
      // Ensure the time is set to noon
      newDate.setHours(12, 0, 0, 0);
      return newDate;
    });
  };
  
  // Handle date selection from the DatePicker
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // The DatePicker component already normalizes to noon
      setStartDate(date);
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
                {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
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
                Add leads, cases, retainers, and revenue for multiple campaigns for the week of {format(startDate, "MMMM d")} to {format(endDate, "MMMM d, yyyy")}.
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
                Add ad spend, impressions, clicks, and CPC for multiple campaigns for the week of {format(startDate, "MMMM d")} to {format(endDate, "MMMM d, yyyy")}.
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
