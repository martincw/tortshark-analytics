
import React, { useEffect, useState } from 'react';
import LeadProsperConnection from './LeadProsperConnection';
import LeadProsperCampaigns from './LeadProsperCampaigns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import { supabase } from "@/integrations/supabase/client";

// List of supported timezones for reference
const SUPPORTED_TIMEZONES = [
  'America/Denver', // Default
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'UTC',
];

export function LeadProsper() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const defaultTab = searchParams.get('tab') === 'campaigns' ? 'campaigns' : 'connection';
  
  // Current timezone to use for API requests
  const [currentTimezone] = useState('America/Denver'); // Default timezone
  
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
    
    // If navigating to campaigns tab, call the update function
    if (value === 'campaigns') {
      updateExistingCampaigns();
    }
  };
  
  // Check connection on initial load
  useEffect(() => {
    // If initial tab is campaigns, verify connection first
    if (defaultTab === 'campaigns') {
      leadProsperApi.checkConnection()
        .then(connectionData => {
          if (!connectionData.isConnected) {
            toast.warning('No active Lead Prosper connection found. Please connect your account first.');
          } else {
            // Also update campaign user IDs when loading campaigns tab
            updateExistingCampaigns();
          }
        })
        .catch(err => {
          console.error('Connection check failed:', err);
          toast.error('Connection check failed. Please try again or reconnect your account.');
        });
    }
  }, [defaultTab]);
  
  // Function to update existing campaigns with the current user's ID
  const updateExistingCampaigns = async () => {
    try {
      await supabase.functions.invoke('update-lp-campaigns-users', {
        body: {},
      });
      // No need for user notification, this happens silently in the background
    } catch (error) {
      // Just log errors, don't notify the user as this is a background task
      console.error('Error updating campaign user IDs:', error);
    }
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
