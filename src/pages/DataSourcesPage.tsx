
import React, { useEffect, useState } from 'react';
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
  // Reference to prevent multiple navigation operations
  const isNavigatingRef = React.useRef(false);
  
  // Parse URL params on initial load and tab changes
  useEffect(() => {
    if (isLoading) return;
    if (isNavigatingRef.current) return; // Skip if navigation is already in progress
    
    const searchParams = new URLSearchParams(location.search);
    const sourceParam = searchParams.get('source');
    
    if (sourceParam && ['leadprosper', 'googleads', 'clickmagick'].includes(sourceParam.toLowerCase())) {
      if (activeTab !== sourceParam.toLowerCase()) {
        setActiveTab(sourceParam.toLowerCase());
      }
    } else if (!activeTab) {
      // Only set default if no tab is currently active
      isNavigatingRef.current = true;
      setActiveTab('leadprosper');
      
      // Update URL to reflect current source tab without reload
      const newParams = new URLSearchParams(location.search);
      newParams.set('source', 'leadprosper');
      navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
      
      // Reset navigation flag
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 100);
    }
  }, [location.search, navigate, isLoading, activeTab]);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    if (value === activeTab || isNavigatingRef.current) return; // Prevent unnecessary updates
    
    isNavigatingRef.current = true;
    setActiveTab(value);
    
    // Update URL to reflect current source tab
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('source', value);
    
    // Update URL without reload
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
    
    // Reset navigation flag
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
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
