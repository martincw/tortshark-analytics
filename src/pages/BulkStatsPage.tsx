
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BulkStatsForm } from "@/components/campaigns/BulkStatsForm";
import { BulkAdsStatsForm } from "@/components/campaigns/BulkAdsStatsForm";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const BulkStatsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("manual");
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Stats Entry</h1>
          <p className="text-muted-foreground mt-1">
            Add or update stats for multiple campaigns at once
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>About Bulk Stats</CardTitle>
            <CardDescription>How to use this page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Manual Stats Entry</h3>
              <p className="text-sm text-muted-foreground">
                Add lead, case, and revenue data for multiple campaigns at once. 
                The values you enter will be added to the existing totals.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">Ad Stats Entry</h3>
              <p className="text-sm text-muted-foreground">
                Update impressions, clicks, and ad spend for multiple campaigns. 
                The values you enter will be added to the existing totals.
              </p>
            </div>
            
            <div>
              <h3 className="font-medium mb-1">Filtering Campaigns</h3>
              <p className="text-sm text-muted-foreground">
                Use the campaign filter to quickly select all campaigns of a specific type. 
                You can also select or deselect campaigns individually.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Manual Stats</TabsTrigger>
              <TabsTrigger value="ads">Ad Stats</TabsTrigger>
            </TabsList>
            <TabsContent value="manual" className="space-y-4 mt-4">
              <BulkStatsForm 
                onSubmitComplete={() => {
                  // Optional: Add any completion logic here
                }}
              />
            </TabsContent>
            <TabsContent value="ads" className="space-y-4 mt-4">
              <BulkAdsStatsForm 
                onSubmitComplete={() => {
                  // Optional: Add any completion logic here
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default BulkStatsPage;
