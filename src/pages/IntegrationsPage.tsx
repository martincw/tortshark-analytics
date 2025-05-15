
import React, { useEffect, useState, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Google from "@/components/integrations/Google";
import LeadProsper from "@/components/integrations/LeadProsper";
import Hyros from "@/components/integrations/Hyros";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoading } = useAuth();
  // Reference to prevent multiple navigation operations
  const isNavigatingRef = useRef(false);
  
  // Parse URL params on initial load and tab changes
  useEffect(() => {
    if (isLoading) return;
    if (isNavigatingRef.current) return; // Skip if navigation is already in progress
    
    const searchParams = new URLSearchParams(location.search);
    const integrationParam = searchParams.get('integration');
    
    if (integrationParam && ['hyros', 'google', 'leadprosper'].includes(integrationParam.toLowerCase())) {
      if (activeTab !== integrationParam.toLowerCase()) {
        setActiveTab(integrationParam.toLowerCase());
      }
    } else if (!activeTab) {
      // Only set default if no tab is currently active
      isNavigatingRef.current = true;
      setActiveTab('hyros');
      
      // Update URL to reflect current integration tab without reload
      const newParams = new URLSearchParams(location.search);
      newParams.set('integration', 'hyros');
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
    
    // Update URL to reflect current integration tab
    const searchParams = new URLSearchParams(location.search);
    
    // Keep any existing parameters (like inner tab selections)
    // But update or add the integration parameter
    searchParams.set('integration', value);
    
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
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Loading...</p>
        </header>
        <div className="animate-pulse h-8 w-64 bg-muted rounded"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect your external platforms</p>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="hyros">HYROS</TabsTrigger>
          <TabsTrigger value="google">Google Ads</TabsTrigger>
          <TabsTrigger value="leadprosper">Lead Prosper</TabsTrigger>
        </TabsList>
        <TabsContent value="hyros">
          <Hyros />
        </TabsContent>
        <TabsContent value="google">
          <Google />
        </TabsContent>
        <TabsContent value="leadprosper">
          <LeadProsper />
        </TabsContent>
      </Tabs>
    </div>
  );
}
