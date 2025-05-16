
import React, { useEffect, useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation, useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import LeadProsper from "@/components/integrations/LeadProsper";
import GoogleAdsIntegration from "@/components/data-sources/GoogleAdsIntegration";
import ClickMagickIntegration from "@/components/data-sources/ClickMagickIntegration";

export default function DataSourcesPage() {
  const [activeTab, setActiveTab] = useState<string>("leadprosper"); // Set default directly
  const location = useLocation();
  const navigate = useNavigate();
  // Reference to prevent multiple navigation operations
  const isNavigatingRef = useRef(false);
  
  // Process URL parameters on mount and when location changes
  useEffect(() => {
    if (isNavigatingRef.current) return; // Skip if navigation is already in progress
    
    // Parse source from URL params
    const sourceParam = new URLSearchParams(location.search).get('source');
    
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
    }, 100);
  };
  
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
          <LeadProsper />
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
