
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
import { createDateAtUTCNoon, formatDateForStorage } from "@/lib/utils/ManualDateUtils";

const BulkStatsPage = () => {
  // Initialize with UTC noon date
  const initialDate = createDateAtUTCNoon(new Date());
  const [startDate, setStartDate] = useState<Date>(initialDate);

  console.log("BulkStatsPage - Initial startDate:", startDate);
  console.log("BulkStatsPage - Initial startDate as string:", formatDateForStorage(startDate));

  const moveWeek = (direction: 'previous' | 'next') => {
    setStartDate(prevDate => {
      const newDate = new Date(prevDate);
      const offset = direction === 'previous' ? -7 : 7;
      newDate.setUTCDate(prevDate.getUTCDate() + offset);
      console.log(`BulkStatsPage - Moving week ${direction}:`, newDate);
      return newDate;
    });
  };
  
  // Handle date selection from the DatePicker
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const utcNoonDate = createDateAtUTCNoon(date);
      console.log("BulkStatsPage - New date selected:", date);
      console.log("BulkStatsPage - UTC noon date:", utcNoonDate);
      console.log("BulkStatsPage - Selected date as string:", formatDateForStorage(utcNoonDate));
      setStartDate(utcNoonDate);
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
