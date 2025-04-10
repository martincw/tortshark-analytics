
import React, { useState, useEffect } from "react";
import GoogleAdsIntegration from "@/components/integrations/GoogleAdsIntegration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { handleOAuthCallback } from "@/services/googleAdsService";
import { supabase } from "@/integrations/supabase/client";

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState<string>("google-ads");
  const [isProcessingOAuth, setIsProcessingOAuth] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  // Check if user is logged in with Supabase
  useEffect(() => {
    const checkLoginStatus = async () => {
      const { data } = await supabase.auth.getSession();
      setIsLoggedIn(!!data.session);
    };
    
    checkLoginStatus();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Check for OAuth callback when the page loads
  useEffect(() => {
    const processOAuthCallback = async () => {
      if (window.location.search.includes('code=')) {
        setIsProcessingOAuth(true);
        setAuthError(null);
        
        try {
          if (!isLoggedIn) {
            setAuthError("You must be logged in to connect Google Ads");
            return;
          }
          
          const success = await handleOAuthCallback();
          if (!success) {
            setAuthError("Failed to process authentication. Please try again.");
          }
        } catch (error) {
          console.error("Error processing OAuth callback:", error);
          setAuthError("Failed to process authentication. Please try again.");
        } finally {
          setIsProcessingOAuth(false);
        }
      }
    };
    
    processOAuthCallback();
  }, [isLoggedIn]);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect external platforms and services to enhance your campaigns
        </p>
      </div>
      
      {!isLoggedIn && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-800">
            You must be logged in to manage integrations. Please sign in to your account first.
          </AlertDescription>
        </Alert>
      )}
      
      {isProcessingOAuth && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertDescription className="text-blue-800">
            Processing authentication callback...
          </AlertDescription>
        </Alert>
      )}
      
      {authError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{authError}</AlertDescription>
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
