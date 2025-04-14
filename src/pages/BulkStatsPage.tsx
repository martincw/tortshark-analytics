
import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import { format } from "date-fns";
import { BulkStatsForm } from "@/components/campaigns/BulkStatsForm";
import { BulkAdsStatsForm } from "@/components/campaigns/BulkAdsStatsForm";

const BulkStatsPage = () => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Campaign Stats</h1>
          <p className="text-muted-foreground mt-1">
            Add daily stats for multiple campaigns at once
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker date={selectedDate} onSelect={setSelectedDate} />
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
                Add leads, cases, retainers, and revenue for multiple campaigns at once.
                The date selected is {format(selectedDate, "MMMM d, yyyy")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkStatsForm selectedDate={selectedDate} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="ads" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Ad Stats</CardTitle>
              <CardDescription>
                Add ad spend, impressions, clicks, and CPC for multiple campaigns at once.
                The date selected is {format(selectedDate, "MMMM d, yyyy")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BulkAdsStatsForm selectedDate={selectedDate} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BulkStatsPage;
