import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import { useCampaign } from '@/contexts/CampaignContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Link as LinkIcon,
  ExternalLink,
  RotateCcw,
  MapPin
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function LeadProsperCampaigns() {
  const { user } = useAuth();
  const { campaigns } = useCampaign();
  const [lpCampaigns, setLpCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMappingLoading, setIsMappingLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<{ isConnected: boolean, error?: string }>({
    isConnected: false
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [apiResponseDetails, setApiResponseDetails] = useState<string | null>(null);
  
  // Campaign mapping dialog states
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [selectedLpCampaignId, setSelectedLpCampaignId] = useState<number | null>(null);
  const [selectedLpCampaignName, setSelectedLpCampaignName] = useState<string>('');
  const [selectedTsCampaignId, setSelectedTsCampaignId] = useState<string>('');
  
  // Quick retry logic for transient errors
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1500;

  useEffect(() => {
    loadCampaigns();
  }, []);
  
  const resetAndRetry = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('Resetting connection state...');
      
      // Clear all caches
      leadProsperApi.resetState();
      
      // Reset retry counter
      setRetryCount(0);
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try loading again
      await loadCampaigns();
      toast.success('Connection reset and campaigns reloaded');
      
    } catch (error) {
      console.error('Reset and retry failed:', error);
      setErrorMessage('Reset and retry failed. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setApiResponseDetails(null);
      
      // Check if the user is connected to Lead Prosper
      console.log('Checking Lead Prosper connection status...');
      const connectionData = await leadProsperApi.checkConnection();
      
      if (connectionData.error) {
        setConnectionStatus({ isConnected: false, error: connectionData.error });
        setErrorMessage(`Connection error: ${connectionData.error}`);
        return;
      }
      
      if (!connectionData.isConnected) {
        console.log('No active Lead Prosper connection found');
        setConnectionStatus({ isConnected: false });
        setErrorMessage('No active Lead Prosper connection found. Please connect your account first.');
        return;
      }
      
      setConnectionStatus({ isConnected: true });
      console.log('Connection confirmed, fetching campaigns...');
      
      // Get campaigns
      try {
        const campaignsData = await leadProsperApi.fetchCampaigns();
        
        // Debug: Inspect the campaigns data structure
        if (campaignsData) {
          console.log(`Campaigns data type: ${typeof campaignsData}`);
          console.log(`Is array: ${Array.isArray(campaignsData)}`);
          console.log(`Length: ${Array.isArray(campaignsData) ? campaignsData.length : 'N/A'}`);
          
          if (Array.isArray(campaignsData) && campaignsData.length > 0) {
            console.log('First campaign sample:', campaignsData[0]);
          } else if (!Array.isArray(campaignsData)) {
            console.log('Campaigns keys:', Object.keys(campaignsData));
            setApiResponseDetails(`Response format: ${JSON.stringify(campaignsData).substring(0, 100)}...`);
          }
        }
        
        if (Array.isArray(campaignsData)) {
          setLpCampaigns(campaignsData);
        } else {
          // Handle non-array response
          setLpCampaigns([]);
          setErrorMessage('Unexpected API response format. Expected an array of campaigns.');
          setApiResponseDetails(`Got: ${typeof campaignsData}. Raw data: ${JSON.stringify(campaignsData).substring(0, 100)}...`);
        }
      } catch (error) {
        console.error('Error fetching campaigns:', error);
        
        // If we have retries left, try again after delay
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          setErrorMessage(`Campaign fetch failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          
          setTimeout(() => {
            loadCampaigns();
          }, RETRY_DELAY);
          return;
        }
        
        setErrorMessage(`Failed to load campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error in loadCampaigns:', error);
      setErrorMessage(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setRetryCount(0); // Reset retry counter
      
      // Force refresh connection status
      const connectionData = await leadProsperApi.checkConnection(true);
      
      if (!connectionData.isConnected) {
        toast.error('No active Lead Prosper connection found');
        setErrorMessage('No active Lead Prosper connection found. Please connect your account first.');
        return;
      }
      
      // Get campaigns with fresh data
      const campaignsData = await leadProsperApi.fetchCampaigns();
      
      if (Array.isArray(campaignsData)) {
        setLpCampaigns(campaignsData);
        toast.success(`Successfully fetched ${campaignsData.length} campaigns`);
      } else {
        setLpCampaigns([]);
        toast.error('Unexpected API response format');
        setApiResponseDetails(`Got: ${typeof campaignsData}. Raw data: ${JSON.stringify(campaignsData).substring(0, 100)}...`);
      }
    } catch (error) {
      console.error('Error refreshing campaigns:', error);
      toast.error(`Failed to refresh campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setErrorMessage(`Failed to refresh campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenMappingDialog = (campaignId: number, campaignName: string) => {
    setSelectedLpCampaignId(campaignId);
    setSelectedLpCampaignName(campaignName || `Campaign ${campaignId}`);
    setIsMappingDialogOpen(true);
  };

  const handleMapCampaign = async () => {
    if (!selectedLpCampaignId || !selectedTsCampaignId) {
      toast.error("Please select both a Lead Prosper campaign and a Tortshark campaign");
      return;
    }
    
    try {
      setIsMappingLoading(true);
      
      // Call the API to map the campaign
      await leadProsperApi.mapCampaign(selectedTsCampaignId, selectedLpCampaignId);
      
      // Show success message
      toast.success(`Campaign ${selectedLpCampaignName} mapped successfully`);
      
      // Close the dialog
      setIsMappingDialogOpen(false);
      
      // Reset states
      setSelectedLpCampaignId(null);
      setSelectedLpCampaignName('');
      setSelectedTsCampaignId('');
      
    } catch (error) {
      console.error('Error mapping campaign:', error);
      
      // Display a more informative error message
      let errorMessage = 'Failed to map campaign';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsMappingLoading(false);
    }
  };

  const filteredCampaigns = lpCampaigns.filter(campaign => 
    campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.id?.toString().includes(searchTerm)
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          Lead Prosper Campaigns
        </CardTitle>
        <CardDescription>
          View and manage your Lead Prosper campaigns
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            {errorMessage && (
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            )}
          </div>
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>{errorMessage}</p>
              
              {apiResponseDetails && (
                <div className="p-2 bg-muted/50 rounded text-xs font-mono overflow-auto">
                  {apiResponseDetails}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="secondary"
                  size="sm"
                  onClick={() => resetAndRetry()}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset and Retry
                </Button>
                <Button 
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.href = "/integrations?tab=leadprosper"}
                >
                  Go to Lead Prosper Connection
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
              <div className="flex items-center border rounded-md px-3 w-full sm:w-auto focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing || !connectionStatus.isConnected}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <span>Refresh Campaigns</span>
                )}
              </Button>
            </div>
            
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <span>Actions</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              View or map campaign to Tortshark
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length > 0 ? (
                    filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>{campaign.name || 'Unnamed Campaign'}</TableCell>
                        <TableCell>{campaign.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.status || 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://app.leadprosper.io/campaigns/${campaign.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-blue-500 hover:text-blue-700"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              View
                            </a>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleOpenMappingDialog(campaign.id, campaign.name)}
                            >
                              <MapPin className="h-3 w-3 mr-1" />
                              Map
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? (
                          <>No campaigns match your search</>
                        ) : lpCampaigns.length === 0 ? (
                          <>No campaigns found in your Lead Prosper account</>
                        ) : (
                          <>No campaigns found</>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          {lpCampaigns.length} campaigns found
        </p>
      </CardFooter>
      
      {/* Campaign mapping dialog */}
      <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Map Lead Prosper Campaign</DialogTitle>
            <DialogDescription>
              Map Lead Prosper campaign "{selectedLpCampaignName}" to a Tortshark campaign for data import.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="ts-campaign">
                Select Tortshark Campaign
              </label>
              <Select
                value={selectedTsCampaignId}
                onValueChange={setSelectedTsCampaignId}
              >
                <SelectTrigger id="ts-campaign">
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns && campaigns.length > 0 ? (
                    campaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem disabled value="none">
                      No campaigns available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {(!campaigns || campaigns.length === 0) && (
                <p className="text-xs text-muted-foreground mt-1">
                  No campaigns available. Please create a campaign first.
                </p>
              )}
            </div>
            
            <div className="flex justify-between mt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsMappingDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleMapCampaign}
                disabled={!selectedTsCampaignId || isMappingLoading}
              >
                {isMappingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Map Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
