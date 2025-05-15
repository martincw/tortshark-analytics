
import React, { useEffect } from 'react';
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
  
  // Handle tab navigation based on URL
  const handleTabChange = (value: string) => {
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
    
    // Update URL without reload
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
    
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
            
            // Automatically redirect to connection tab if not connected
            const newParams = new URLSearchParams(location.search);
            if (newParams.has('integration')) {
              newParams.delete('tab');
              navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
            }
          } else {
            // Also update campaign user IDs when loading campaigns tab
            updateExistingCampaigns();
            
            // Try a test refresh if connected
            trySyncToday(connectionData.apiKey);
          }
        })
        .catch(err => {
          console.error('Connection check failed:', err);
          toast.error('Connection check failed. Please try again or reconnect your account.');
        });
    }
  }, [defaultTab, location.pathname]);
  
  // Function to test syncing today's leads when connection is established
  const trySyncToday = async (apiKey: string | undefined) => {
    if (!apiKey) return;
    
    try {
      toast.info('Testing Lead Prosper connection by syncing today\'s data...', {
        duration: 10000, // Longer duration to show loading status
      });
      const result: LeadProsperSyncResult = await leadProsperApi.fetchTodayLeads();
      
      if (result.success) {
        if (result.total_leads > 0) {
          toast.success('Successfully retrieved leads from Lead Prosper', {
            description: `Retrieved ${result.total_leads} leads from ${result.campaigns_processed} campaign${result.campaigns_processed !== 1 ? 's' : ''}`,
          });
        } else if (result.used_stats_fallback) {
          toast.success('Connected to Lead Prosper', {
            description: `Retrieved campaign stats data successfully. No new leads found for today.`,
          });
        } else {
          toast.info('Connected to Lead Prosper', {
            description: `Connection successful, but no new leads found for today.`,
          });
        }
      } else if (result.timezone_error) {
        toast.warning('Connected, but timezone issues were detected', {
          description: 'The connection works, but there may be timezone compatibility issues. Visit the Leads page to see detailed status.',
        });
      } else {
        toast.warning('Connection test completed with issues', {
          description: result.error || 'Unknown issue occurred during synchronization',
        });
      }
    } catch (error) {
      console.error('Error testing Lead Prosper sync:', error);
      // Only show error for explicit connection test, not background test
      toast.error('Error testing Lead Prosper connection', {
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  };
  
  // Function to update existing campaigns with the current user's ID
  const updateExistingCampaigns = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('update-lp-campaigns-users');
      
      if (error) {
        // Just log errors, don't notify the user as this is a background task
        console.error('Error updating campaign user IDs:', error);
      } else if (data && data.updated > 0) {
        console.log(`Updated ${data.updated} campaigns with current user ID`);
      }
    } catch (error) {
      // Just log errors, don't notify the user as this is a background task
      console.error('Error updating campaign user IDs:', error);
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
