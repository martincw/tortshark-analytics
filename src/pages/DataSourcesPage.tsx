
import React, { useEffect, useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import LeadProsperIntegration from "@/components/data-sources/LeadProsperIntegration";
import GoogleAdsIntegration from "@/components/data-sources/GoogleAdsIntegration";
import ClickMagickIntegration from "@/components/data-sources/ClickMagickIntegration";

export default function DataSourcesPage() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  
  // Use refs to track initialization state and prevent navigation loops
  const isInitializedRef = useRef(false);
  const isNavigatingRef = useRef(false);
  
  // Process URL parameters ONLY on initial mount
  useEffect(() => {
    // Skip if auth is still loading
    if (isLoading) return;
    
    // Skip if we've already initialized
    if (isInitializedRef.current) return;
    
    // Mark as initialized immediately to prevent re-runs
    isInitializedRef.current = true;
    
    // Parse source from URL params
    const sourceParam = new URLSearchParams(location.search).get('source');
    
    // Set the tab based on URL or default
    if (sourceParam && ['leadprosper', 'googleads', 'clickmagick'].includes(sourceParam.toLowerCase())) {
      setActiveTab(sourceParam.toLowerCase());
    } else {
      setActiveTab('leadprosper');
      
      // Only update URL if needed and not currently navigating
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        
        // Use replace to avoid navigation history build-up
        navigate({
          pathname: location.pathname,
          search: '?source=leadprosper'
        }, { replace: true });
        
        // Reset navigation flag after a delay
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      }
    }
  }, [isLoading]); // Only depend on isLoading - no URL or location deps
  
  // Handle tab changes from user interaction
  const handleTabChange = (value: string) => {
    // Don't proceed if we're already on this tab or if we're in the middle of a navigation
    if (value === activeTab || isNavigatingRef.current) return;
    
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
    }, 500);
  };
  
  // Show loading until tab state is determined
  if (!activeTab) {
    return (
      <div className="container mx-auto py-6 space-y-8 max-w-5xl">
        <header>
          <h1 className="text-3xl font-bold">Data Sources</h1>
          <p className="text-muted-foreground">Loading...</p>
        </header>
        <div className="animate-pulse h-8 w-64 bg-muted rounded"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold">Data Sources</h1>
        <p className="text-muted-foreground">Connect and manage your external data sources</p>
      </header>

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
