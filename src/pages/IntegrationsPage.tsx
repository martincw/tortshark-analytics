
import React, { useState, useEffect } from "react";
import GoogleAdsIntegration from "@/components/integrations/GoogleAdsIntegration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { handleOAuthCallback } from "@/services/googleAdsService";

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState<string>("google-ads");
  const [isProcessingOAuth, setIsProcessingOAuth] = useState<boolean>(false);
  
  // Check for OAuth callback when the page loads
  useEffect(() => {
    const processOAuthCallback = async () => {
      if (window.location.search.includes('code=')) {
        setIsProcessingOAuth(true);
        
        // handleOAuthCallback is implemented in GoogleSignIn component
        // This is just an additional check to ensure we process the callback
        
        setIsProcessingOAuth(false);
      }
    };
    
    processOAuthCallback();
  }, []);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect external platforms and services to enhance your campaigns
        </p>
      </div>
      
      {isProcessingOAuth && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-800">
            Processing authentication callback...
          </AlertDescription>
        </Alert>
      )}
      
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
