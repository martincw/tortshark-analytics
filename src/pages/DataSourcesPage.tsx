
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
  
  // Process URL parameters on initial mount only
  useEffect(() => {
    // Skip if auth is still loading
    if (isLoading) return;
    
    // Skip if we've already set up the page
    if (isInitializedRef.current) return;
    
    // Parse source from URL params
    const searchParams = new URLSearchParams(location.search);
    const sourceParam = searchParams.get('source');
    
    // Determine initial active tab based on URL or default to 'leadprosper'
    if (sourceParam && ['leadprosper', 'googleads', 'clickmagick'].includes(sourceParam.toLowerCase())) {
      setActiveTab(sourceParam.toLowerCase());
    } else {
      setActiveTab('leadprosper');
      
      // Only update URL if we need to (no source param or invalid source)
      if (!isNavigatingRef.current) {
        isNavigatingRef.current = true;
        const newParams = new URLSearchParams(location.search);
        newParams.set('source', 'leadprosper');
        
        // Use replace to avoid navigation history build-up
        navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
        
        // Reset navigation flag after a reasonable delay
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      }
    }
    
    // Mark initialization as complete
    isInitializedRef.current = true;
  }, [location.pathname, isLoading]); // Remove activeTab and location.search from dependencies
  
  // Handle tab changes from user interaction
  const handleTabChange = (value: string) => {
    // Don't proceed if we're already on this tab or if we're in the middle of a navigation
    if (value === activeTab || isNavigatingRef.current) return;
    
    // Set navigation flag to prevent double-updates
    isNavigatingRef.current = true;
    
    // Update local state immediately
    setActiveTab(value);
    
    // Update URL params (only if needed)
    const currentParams = new URLSearchParams(location.search);
    if (currentParams.get('source') !== value) {
      const newParams = new URLSearchParams(location.search);
      newParams.set('source', value);
      
      // Use replace to avoid navigation stack buildup
      navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    }
    
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
