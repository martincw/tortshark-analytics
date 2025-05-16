
import React, { useEffect, useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import LeadProsperIntegration from "@/components/data-sources/LeadProsperIntegration";
import GoogleAdsIntegration from "@/components/data-sources/GoogleAdsIntegration";
import ClickMagickIntegration from "@/components/data-sources/ClickMagickIntegration";
import { toast } from "sonner";
import { processOAuthCallback } from "@/services/googleAdsConnection";

export default function DataSourcesPage() {
  const [activeTab, setActiveTab] = useState<string>("leadprosper");
  const [isProcessingOAuth, setIsProcessingOAuth] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Reference to prevent multiple navigation operations
  const isNavigatingRef = useRef(false);
  
  // Process URL parameters on mount and when location changes
  useEffect(() => {
    if (isNavigatingRef.current) return; // Skip if navigation is already in progress
    
    // Parse source from URL params
    const searchParams = new URLSearchParams(location.search);
    const sourceParam = searchParams.get('source');
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    
    // Handle OAuth callback if code is present
    if (code) {
      handleOAuthCallback(code);
      return;
    }
    
    // Handle OAuth errors
    if (error) {
      toast.error(`Authentication error: ${error}`);
      // Clear the error from URL
      navigate({ pathname: location.pathname, search: sourceParam ? `?source=${sourceParam}` : '' }, { replace: true });
      return;
    }
    
    if (sourceParam && ['leadprosper', 'googleads', 'clickmagick'].includes(sourceParam.toLowerCase())) {
      if (activeTab !== sourceParam.toLowerCase()) {
        setActiveTab(sourceParam.toLowerCase());
      }
    } else if (activeTab === 'leadprosper' && !sourceParam) {
      // Update URL to match default tab without reload, but only if needed
      isNavigatingRef.current = true;
      navigate({
        pathname: location.pathname,
        search: '?source=leadprosper'
      }, { replace: true });
      
      // Reset navigation flag after a delay
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
    }
  }, [location.search, navigate, activeTab, location.pathname]);
  
  // Handle OAuth callback from Google
  const handleOAuthCallback = async (code: string) => {
    setIsProcessingOAuth(true);
    try {
      await processOAuthCallback(code);
      toast.success("Successfully connected to Google Ads");
      
      // Redirect to Google Ads tab after authentication
      isNavigatingRef.current = true;
      navigate({
        pathname: location.pathname,
        search: '?source=googleads'
      }, { replace: true });
      
      // Reset navigation flag after a delay
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
    } catch (error) {
      console.error("Error processing OAuth callback:", error);
      toast.error("Failed to complete Google Ads connection");
    } finally {
      setIsProcessingOAuth(false);
    }
  };
  
  // Handle tab changes from user interaction
  const handleTabChange = (value: string) => {
    // Don't proceed if we're already on this tab or if we're in the middle of a navigation
    if (value === activeTab || isNavigatingRef.current || isProcessingOAuth) return;
    
    // Set navigation flag to prevent double-updates
    isNavigatingRef.current = true;
    
    // Update local state immediately
    setActiveTab(value);
    
    // Update URL params with replace to avoid building up navigation history
    navigate({
      pathname: location.pathname,
      search: `?source=${value}`
    }, { replace: true });
    
    // Reset navigation flag after a reasonable delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold">Data Sources</h1>
        <p className="text-muted-foreground">Connect and manage your external data sources</p>
      </header>

      {isProcessingOAuth && (
        <div className="mb-6 p-4 bg-muted rounded-md flex items-center justify-center">
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p>Processing authentication, please wait...</p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="leadprosper">Lead Prosper</TabsTrigger>
          <TabsTrigger value="googleads">Google Ads</TabsTrigger>
          <TabsTrigger value="clickmagick">ClickMagick</TabsTrigger>
        </TabsList>
        <TabsContent value="leadprosper">
          <LeadProsperIntegration />
        </TabsContent>
        <TabsContent value="googleads">
          <GoogleAdsIntegration />
        </TabsContent>
        <TabsContent value="clickmagick">
          <ClickMagickIntegration />
        </TabsContent>
      </Tabs>
    </div>
  );
}
