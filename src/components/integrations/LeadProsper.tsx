
import React, { useEffect } from 'react';
import LeadProsperConnection from './LeadProsperConnection';
import LeadProsperCampaigns from './LeadProsperCampaigns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'react-router-dom';

export function LeadProsper() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get('tab') === 'campaigns' ? 'campaigns' : 'connection';
  
  // Handle tab navigation based on URL
  const handleTabChange = (value: string) => {
    const newParams = new URLSearchParams(location.search);
    if (value === 'connection') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', value);
    }
    
    // Update URL without reload
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}?${newParams.toString()}`
    );
  };
  
  return (
    <Tabs defaultValue={defaultTab} onValueChange={handleTabChange}>
      <TabsList className="mb-4">
        <TabsTrigger value="connection">Connection</TabsTrigger>
        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
      </TabsList>
      <TabsContent value="connection" className="space-y-4">
        <LeadProsperConnection />
      </TabsContent>
      <TabsContent value="campaigns" className="space-y-4">
        <LeadProsperCampaigns />
      </TabsContent>
    </Tabs>
  );
}

export default LeadProsper;
