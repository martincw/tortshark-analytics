
import React, { useEffect, useRef, useState } from 'react';
import LeadProsperConnection from './LeadProsperConnection';
import LeadProsperCampaigns from './LeadProsperCampaigns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import { supabase } from "@/integrations/supabase/client";
import { LeadProsperSyncResult } from '@/integrations/leadprosper/types';

export function LeadProsper() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  
  // Get the 'tab' parameter from URL, defaulting to 'connection' if not present
  const defaultTab = searchParams.get('tab') === 'campaigns' ? 'campaigns' : 'connection';
  
  // State to track if campaigns have already been updated to prevent redundant calls
  const [campaignsUpdated, setCampaignsUpdated] = useState(false);
  // State to track connection status check to prevent infinite loops
  const [connectionChecked, setConnectionChecked] = useState(false);
  // Track if a sync operation is in progress
  const [isSyncing, setIsSyncing] = useState(false);
  // Max retries for API calls
  const MAX_RETRIES = 3;
  // Track retry count
  const retryCountRef = useRef(0);
  // Track if navigation is in progress to prevent multiple navigations
  const isNavigatingRef = useRef(false);
  
  // Handle tab navigation based on URL with debouncing
  const handleTabChange = (value: string) => {
    // Prevent redundant navigation
    if (isNavigatingRef.current) return;
    
    isNavigatingRef.current = true;
    
    const newParams = new URLSearchParams(location.search);
    
    // Update integration param if needed (preserve it from parent)
    if (!newParams.has('integration')) {
      newParams.set('integration', 'leadprosper');
    }
    
    // Update the tab param
    if (value === 'connection') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', value);
    }
    
    // Update URL without reload and without adding to history
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    
    // Reset navigation flag after short delay
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 100);
  };
  
  // Safely check connection without causing navigation loops
  useEffect(() => {
    // Skip if we've already checked the connection or if a navigation is in progress
    if (connectionChecked || isNavigatingRef.current) return;
    
    const checkConnection = async () => {
      // Skip campaigns check if not on campaigns tab
      if (defaultTab !== 'campaigns') {
        setConnectionChecked(true);
        return;
      }
      
      try {
        const connectionData = await leadProsperApi.checkConnection();
        
        if (!connectionData.isConnected) {
          toast.warning('No active Lead Prosper connection found. Please connect your account first.');
          
          // Only navigate if we're not already navigating
          if (!isNavigatingRef.current) {
            isNavigatingRef.current = true;
            // Navigate to connection tab without adding browser history entries
            const newParams = new URLSearchParams(location.search);
            if (newParams.has('integration')) {
              newParams.delete('tab');
              navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
            }
            setTimeout(() => {
              isNavigatingRef.current = false;
            }, 100);
          }
        } else if (!campaignsUpdated) {
          // Only update campaigns once when first loading the campaigns tab
          updateExistingCampaigns();
        }
      } catch (err) {
        console.error('Connection check failed:', err);
        // Don't show error toast - this prevents error loops
      } finally {
        // Mark connection as checked to prevent further checks
        setConnectionChecked(true);
      }
    };
    
    checkConnection();
  }, [defaultTab, campaignsUpdated, connectionChecked]);
  
  // Debounced function to update existing campaigns with current user ID
  const updateExistingCampaigns = async () => {
    // Prevent multiple simultaneous calls
    if (campaignsUpdated) return;
    
    try {
      setCampaignsUpdated(true);
      
      const { data, error } = await supabase.functions.invoke('update-lp-campaigns-users');
      
      if (error) {
        console.error('Error updating campaign user IDs:', error);
        // Silently handle error - don't show toast to prevent loops
      } else if (data && data.updated > 0) {
        console.log(`Updated ${data.updated} campaigns with current user ID`);
      }
      
      // Only attempt sync if connection was successful
      if (!isSyncing && retryCountRef.current < MAX_RETRIES) {
        tryConnectAndSync();
      }
    } catch (error) {
      console.error('Error updating campaign user IDs:', error);
      // Just log errors, don't notify user as this is a background task
    }
  };
  
  // Function to test syncing today's leads when connection is established
  const tryConnectAndSync = async () => {
    if (isSyncing) return;
    
    try {
      setIsSyncing(true);
      const connectionData = await leadProsperApi.checkConnection();
      
      if (!connectionData || !connectionData.isConnected || !connectionData.apiKey) {
        // Silently exit if not connected - don't show error to prevent loops
        return;
      }
      
      // Only show toast for explicit sync requests, not background ones
      const result: LeadProsperSyncResult = await leadProsperApi.fetchTodayLeads();
      
      // Silently handle result - don't show toast messages for background syncs
      console.log('Lead Prosper sync result:', result);
    } catch (error) {
      console.error('Error testing Lead Prosper sync:', error);
      // Only increment retry count for specific errors that might be temporary
      if (error instanceof Error && 
          (error.message.includes('timeout') || 
           error.message.includes('network') || 
           error.message.includes('429'))) {
        retryCountRef.current++;
      }
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <Tabs value={defaultTab} onValueChange={handleTabChange}>
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
