import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Google from "@/components/integrations/Google";
import LeadProsper from "@/components/integrations/LeadProsper";
import Hyros from "@/components/integrations/Hyros";
import { useLocation, useNavigate } from "react-router-dom";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState("hyros");
  const location = useLocation();
  const navigate = useNavigate();
  
  // Parse URL params on initial load and tab changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('integration');
    
    if (tabParam && ['hyros', 'google', 'leadprosper'].includes(tabParam.toLowerCase())) {
      setActiveTab(tabParam.toLowerCase());
    }
  }, [location.search]);
  
  // Update URL when tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    // Update URL to reflect current integration tab
    const searchParams = new URLSearchParams(location.search);
    
    // Keep any existing parameters (like inner tab selections)
    // But update or add the integration parameter
    searchParams.set('integration', value);
    
    // Update URL without reload
    navigate(`${location.pathname}?${searchParams.toString()}`, { replace: true });
  };
  
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
