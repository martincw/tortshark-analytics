
import React, { useState } from "react";
import GoogleAdsIntegration from "@/components/integrations/GoogleAdsIntegration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState<string>("google-ads");
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect external platforms and services to enhance your campaigns
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full mb-6">
          <TabsTrigger value="google-ads" className="flex-1">Google Ads</TabsTrigger>
          <TabsTrigger value="facebook" className="flex-1" disabled>Facebook Ads</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1" disabled>Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="google-ads">
          <GoogleAdsIntegration />
        </TabsContent>
        
        <TabsContent value="facebook">
          <div className="text-center py-12 text-muted-foreground">
            Facebook Ads integration coming soon
          </div>
        </TabsContent>
        
        <TabsContent value="analytics">
          <div className="text-center py-12 text-muted-foreground">
            Analytics integration coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IntegrationsPage;
