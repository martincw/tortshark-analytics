
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import GoogleAdsIntegration from "@/components/integrations/GoogleAdsIntegration";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { handleOAuthCallback } from "@/services/googleAdsService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState<string>("google-ads");
  const [isProcessingOAuth, setIsProcessingOAuth] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to auth page if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth");
    }
  }, [user, isLoading, navigate]);
  
  // Check for OAuth callback when the page loads
  useEffect(() => {
    const processOAuthCallback = async () => {
      if (window.location.search.includes('code=')) {
        setIsProcessingOAuth(true);
        setAuthError(null);
        
        try {
          if (!user) {
            setAuthError("You must be logged in to connect Google Ads");
            return;
          }
          
          console.log("Processing OAuth callback with code from URL");
          const urlParams = new URLSearchParams(window.location.search);
          console.log("State param:", urlParams.get('state'));
          console.log("Error param:", urlParams.get('error'));
          
          const success = await handleOAuthCallback();
          
          if (success) {
            toast.success("Successfully connected to Google Ads");
            // Clear URL parameters without refreshing the page
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setAuthError("Failed to process authentication. Please try again.");
            console.error("OAuth callback processing failed");
          }
        } catch (error) {
          console.error("Error processing OAuth callback:", error);
          setAuthError(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          
          // Save debug info
          if (error instanceof Error) {
            setDebugInfo({
              message: error.message,
              stack: error.stack,
              time: new Date().toISOString()
            });
          }
        } finally {
          setIsProcessingOAuth(false);
        }
      }
    };
    
    if (user) {
      processOAuthCallback();
    }
  }, [user]);
  
  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
        <span>Loading...</span>
      </div>
    );
  }
  
  // If not logged in, redirect happens in useEffect
  if (!user) {
    return null;
  }
  
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
      
      {authError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
          {debugInfo && (
            <div className="mt-2 text-xs overflow-auto max-h-32 bg-destructive/10 p-2 rounded">
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </Alert>
      )}
      
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-800">
          Make sure you've set up the Google Cloud OAuth client properly. The authorized redirect URI should be: 
          <code className="mx-1 px-1 bg-amber-100 rounded">https://117ae32f-ec7a-4417-80c1-cf1522c2ad9c.lovableproject.com/integrations</code>
        </AlertDescription>
      </Alert>
      
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
