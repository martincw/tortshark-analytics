
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
import { Loader2, LinkIcon, RefreshCw, AlertCircle, Info, ExternalLink, Calendar } from 'lucide-react';
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
  const [debugInfo, setDebugInfo] = useState<any | null>(null);
  const [apiEndpoint, setApiEndpoint] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{from: string, to: string} | null>(null);
  
  const loadData = async (forceSync = false) => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);
      
      if (forceSync) {
        setSyncing(true);
        setSyncMessage("Synchronizing campaigns from HYROS...");
      }
      
      // Fetch HYROS campaigns with optional force sync
      const result = await hyrosApi.fetchHyrosCampaigns(forceSync);
      
      if (result.campaigns && result.campaigns.length > 0) {
        setHyrosCampaigns(result.campaigns);
        
        // Save the API endpoint that worked
        if (result.apiEndpoint) {
          setApiEndpoint(result.apiEndpoint);
        }
        
        // Save the date range if available
        if (result.dateRange) {
          setDateRange(result.dateRange);
        }
        
        // If we got campaigns, show success message for sync
        if (forceSync) {
          setSyncMessage(`Successfully synced ${result.campaigns.length} campaigns from HYROS${result.apiEndpoint ? ` using endpoint ${result.apiEndpoint}` : ''}`);
          setTimeout(() => setSyncMessage(null), 8000); // Clear message after 8 seconds
        }
      } else {
        // If no campaigns, show appropriate message
        setError(forceSync ? 
          "No campaigns found in your HYROS account. Please check your HYROS account and try again." : 
          "No campaigns found. Try syncing with the HYROS API using the refresh button."
        );
      }
      
      // Save any debug info
      if (result.debugInfo) {
        setDebugInfo(result.debugInfo);
      }
      
      // Fetch existing mappings
      const mappings = await hyrosApi.getCampaignMappings();
      setMappings(mappings);
    } catch (error) {
      console.error("Error loading HYROS campaigns and mappings:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load HYROS campaigns and mappings";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
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
          {dateRange && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Calendar className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Date Range</AlertTitle>
              <AlertDescription className="text-blue-700">
                Showing campaigns from {dateRange.from} to {dateRange.to}
              </AlertDescription>
            </Alert>
          )}
          
          {apiEndpoint && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">API Information</AlertTitle>
              <AlertDescription className="text-blue-700">
                Using HYROS API endpoint: <code className="bg-blue-100 px-1 py-0.5 rounded">{apiEndpoint}</code>
              </AlertDescription>
            </Alert>
          )}
          
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
              <AlertDescription className="space-y-2">
                <p>{error}</p>
                
                {/* Display troubleshooting suggestions */}
                <div className="mt-2 text-sm">
                  <p className="font-semibold">Troubleshooting suggestions:</p>
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Verify your HYROS API key has permission to access the /ads endpoint</li>
                    <li>Check that there are ads/campaigns in your HYROS account in the last 90 days</li>
                    <li>Check for any restrictions in your HYROS account settings</li>
                    <li>Try logging into the HYROS dashboard to verify your account status</li>
                  </ul>
                </div>
                
                <div className="mt-2 flex items-center justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-xs" 
                    onClick={() => window.open('https://hyros.com/support', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Contact HYROS Support
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {debugInfo && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Debug Information</AlertTitle>
              <AlertDescription className="text-blue-700 text-sm">
                <pre className="overflow-auto max-h-40 p-2 bg-blue-100 rounded">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Platform</TableHead>
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
                      <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-9 w-[80px] ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : hyrosCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      {syncing ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span>Synchronizing with HYROS...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <p>No HYROS campaigns found.</p>
                          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-2">
                            HYROS campaigns are derived from ads in your HYROS account. To view campaigns here, make sure you have ads set up in your HYROS account within the last 90 days.
                          </p>
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
                          <Badge variant="outline">
                            {campaign.platform || 'Unknown'}
                          </Badge>
                        </TableCell>
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
