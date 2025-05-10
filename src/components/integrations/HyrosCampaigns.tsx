
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, LinkIcon, RefreshCw, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { hyrosApi } from '@/integrations/hyros/client';
import { useCampaign } from '@/contexts/CampaignContext';
import HyrosMappingDialog from './HyrosMappingDialog';
import { HyrosCampaign, HyrosMapping } from '@/integrations/hyros/types';

export default function HyrosCampaigns() {
  const { toast } = useToast();
  const { campaigns } = useCampaign();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hyrosCampaigns, setHyrosCampaigns] = useState<HyrosCampaign[]>([]);
  const [mappings, setMappings] = useState<HyrosMapping[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<HyrosCampaign | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  const loadData = async (forceSync = false) => {
    try {
      setLoading(true);
      setError(null);
      
      if (forceSync) {
        setSyncing(true);
        setSyncMessage("Synchronizing campaigns from HYROS...");
      }
      
      // Fetch HYROS campaigns with optional force sync
      const campaigns = await hyrosApi.fetchHyrosCampaigns(forceSync);
      setHyrosCampaigns(campaigns);
      
      if (campaigns.length > 0) {
        // If we got campaigns, show success message for sync
        if (forceSync) {
          setSyncMessage(`Successfully synced ${campaigns.length} campaigns from HYROS`);
          setTimeout(() => setSyncMessage(null), 5000); // Clear message after 5 seconds
        }
      } else {
        // If no campaigns, show appropriate message
        setError(forceSync ? 
          "No campaigns found in your HYROS account. Please check your HYROS account and try again." : 
          "No campaigns found. Try syncing with the HYROS API using the refresh button."
        );
      }
      
      // Fetch existing mappings
      const mappings = await hyrosApi.getCampaignMappings();
      setMappings(mappings);
    } catch (error) {
      console.error("Error loading HYROS campaigns and mappings:", error);
      setError(error instanceof Error ? error.message : "Failed to load HYROS campaigns and mappings");
      toast({
        title: "Error",
        description: "Failed to load HYROS campaigns and mappings.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setSyncing(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadData();
  }, []);
  
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData(false); // Regular refresh without forcing sync
      toast({
        title: "Refreshed",
        description: "HYROS campaigns have been refreshed.",
      });
    } catch (error) {
      console.error("Error refreshing campaigns:", error);
      toast({
        title: "Error",
        description: "Failed to refresh HYROS campaigns.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleForceSync = async () => {
    try {
      setSyncing(true);
      await loadData(true); // Force sync with HYROS API
      toast({
        title: "Sync Complete",
        description: "HYROS campaigns have been synchronized.",
      });
    } catch (error) {
      console.error("Error syncing campaigns:", error);
      toast({
        title: "Sync Error",
        description: "Failed to synchronize campaigns from HYROS.",
        variant: "destructive",
      });
    }
  };
  
  const handleMapCampaign = (campaign: HyrosCampaign) => {
    setSelectedCampaign(campaign);
    setDialogOpen(true);
  };
  
  const handleMappingCreated = (mapping: HyrosMapping) => {
    setMappings(prev => [...prev, mapping]);
    setDialogOpen(false);
    toast({
      title: "Campaign Mapped",
      description: "HYROS campaign has been mapped successfully.",
    });
  };
  
  const handleMappingCancelled = () => {
    setDialogOpen(false);
    setSelectedCampaign(null);
  };
  
  const getMappedCampaignName = (hyrosCampaignId: string) => {
    const mapping = mappings.find(m => m.hyrosCampaignId === hyrosCampaignId && m.active);
    if (!mapping) return null;
    
    const campaign = campaigns?.find(c => c.id === mapping.tsCampaignId);
    return campaign?.name || 'Unknown Campaign';
  };
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>HYROS Campaigns</CardTitle>
            <CardDescription>
              Map HYROS campaigns to TortShark campaigns
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              onClick={handleForceSync}
              disabled={syncing || refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync with HYROS'}
            </Button>
            <Button 
              variant="outline" 
              size="icon"
              onClick={handleRefresh}
              disabled={syncing || refreshing}
              title="Refresh campaign list"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {syncMessage && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <RefreshCw className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Sync Status</AlertTitle>
              <AlertDescription className="text-green-700">
                {syncMessage}
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert className="mb-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mapped To</TableHead>
                  <TableHead className="w-[100px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-9 w-[80px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : hyrosCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                      {syncing ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Synchronizing with HYROS...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <p>No HYROS campaigns found.</p>
                          <Button variant="outline" size="sm" onClick={handleForceSync}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Sync with HYROS API
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  hyrosCampaigns.map((campaign) => {
                    const mappedCampaignName = getMappedCampaignName(campaign.hyrosCampaignId);
                    const isAlreadyMapped = !!mappedCampaignName;
                    
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>{campaign.name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={campaign.status === 'active' ? 'default' : 'secondary'}
                          >
                            {campaign.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isAlreadyMapped ? (
                            <span className="text-green-600 font-medium">
                              {mappedCampaignName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Not mapped</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMapCampaign(campaign)}
                            disabled={loading || syncing}
                          >
                            <LinkIcon className="h-4 w-4 mr-1" />
                            {isAlreadyMapped ? 'Remap' : 'Map'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {selectedCampaign && (
        <HyrosMappingDialog
          open={dialogOpen}
          hyrosCampaign={selectedCampaign}
          onMappingCreated={handleMappingCreated}
          onCancel={handleMappingCancelled}
        />
      )}
    </>
  );
}
