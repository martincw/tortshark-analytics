
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link, LinkIcon, Unlink, Search, Check, AlertCircle, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { leadProsperApi } from "@/integrations/leadprosper/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaign } from "@/contexts/CampaignContext";
import { LeadProsperCampaign, LeadProsperMapping } from "@/integrations/leadprosper/types";

const LeadProsperCampaigns = () => {
  const { user } = useAuth();
  const { campaigns } = useCampaign();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lpCampaigns, setLpCampaigns] = useState<LeadProsperCampaign[]>([]);
  const [mappings, setMappings] = useState<Map<number, LeadProsperMapping>>(new Map());
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [linkingCampaign, setLinkingCampaign] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [selectedTsCampaignId, setSelectedTsCampaignId] = useState<string>('');
  const [selectedLpCampaignName, setSelectedLpCampaignName] = useState<string>('');
  
  // Load campaigns on component mount
  useEffect(() => {
    loadCampaigns();
  }, []);

  // Fetch Lead Prosper campaigns and mappings
  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Check if user is connected to Lead Prosper
      const connectionData = await leadProsperApi.checkConnection();
      
      if (!connectionData.isConnected) {
        setErrorMessage('No active Lead Prosper connection found. Please connect your account first.');
        setIsLoading(false);
        return;
      }
      
      // Get campaigns
      const campaignsData = await leadProsperApi.fetchCampaigns();
      
      if (Array.isArray(campaignsData)) {
        setLpCampaigns(campaignsData);
        
        // Get existing mappings for all TS campaigns
        if (campaigns && campaigns.length > 0) {
          const allMappings = new Map<number, LeadProsperMapping>();
          
          for (const campaign of campaigns) {
            try {
              const campaignMappings = await leadProsperApi.getCampaignMappings(campaign.id);
              
              // Add mappings to the map
              for (const mapping of campaignMappings) {
                if (mapping.lp_campaign?.lp_campaign_id) {
                  allMappings.set(mapping.lp_campaign.lp_campaign_id, mapping);
                }
              }
            } catch (error) {
              console.error(`Error fetching mappings for campaign ${campaign.id}:`, error);
            }
          }
          
          setMappings(allMappings);
        }
      } else {
        setErrorMessage('Unexpected API response format. Please try again later.');
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setErrorMessage(`Failed to load campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    toast.info('Refreshing campaigns...');
    await loadCampaigns();
  };

  const handleOpenMappingDialog = (campaignId: number, campaignName: string) => {
    setSelectedCampaign(campaignId);
    setSelectedLpCampaignName(campaignName || `Campaign ${campaignId}`);
    setIsMappingDialogOpen(true);
  };

  const handleLinkCampaign = async () => {
    if (!selectedCampaign || !selectedTsCampaignId) {
      toast.error('Please select both campaigns to link');
      return;
    }
    
    setLinkingCampaign(selectedCampaign);
    
    try {
      // Call the API to link campaign
      const mapping = await leadProsperApi.mapCampaign(selectedTsCampaignId, selectedCampaign);
      
      // Update the mappings in state
      setMappings(prevMappings => {
        const newMappings = new Map(prevMappings);
        
        if (mapping && mapping.lp_campaign_id) {
          // Find the lp_campaign_id in external_lp_campaigns table
          newMappings.set(selectedCampaign, mapping);
        }
        
        return newMappings;
      });
      
      toast.success('Campaign linked successfully');
      
      // Close dialog and reset states
      setIsMappingDialogOpen(false);
      setSelectedCampaign(null);
      setSelectedTsCampaignId('');
    } catch (error) {
      console.error('Error linking campaign:', error);
      toast.error(`Failed to link campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLinkingCampaign(null);
    }
  };

  const handleUnlinkCampaign = async (lpCampaignId: number) => {
    // Find the mapping for this LP campaign
    const mapping = mappings.get(lpCampaignId);
    
    if (!mapping || !mapping.id) {
      toast.error('Mapping not found');
      return;
    }
    
    setLinkingCampaign(lpCampaignId);
    
    try {
      // Call the API to unlink campaign
      const success = await leadProsperApi.unmapCampaign(mapping.id);
      
      if (success) {
        // Remove the mapping from state
        setMappings(prevMappings => {
          const newMappings = new Map(prevMappings);
          newMappings.delete(lpCampaignId);
          return newMappings;
        });
        
        toast.success('Campaign unlinked successfully');
      } else {
        toast.error('Failed to unlink campaign');
      }
    } catch (error) {
      console.error('Error unlinking campaign:', error);
      toast.error(`Failed to unlink campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLinkingCampaign(null);
    }
  };

  // Filter campaigns based on search query
  const filteredCampaigns = lpCampaigns.filter(campaign => 
    campaign.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.id?.toString().includes(searchQuery)
  );

  // Get the linked Tortshark campaign name for a given LP campaign
  const getLinkedCampaignName = (lpCampaignId: number): string | null => {
    const mapping = mappings.get(lpCampaignId);
    
    if (!mapping) return null;
    
    // Find the Tortshark campaign with the matching ID
    const tsCampaign = campaigns?.find(c => c.id === mapping.ts_campaign_id);
    return tsCampaign?.name || 'Unknown Campaign';
  };

  // Check if a campaign is linked
  const isCampaignLinked = (lpCampaignId: number): boolean => {
    return mappings.has(lpCampaignId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>
          
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[350px]">Campaign Name</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Linked To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No campaigns found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>{campaign.id}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={campaign.status === 'active' ? 'default' : 
                                  campaign.status === 'paused' ? 'outline' : 'secondary'}
                        >
                          {campaign.status || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isCampaignLinked(campaign.id) ? (
                          <span className="flex items-center text-green-600">
                            <Check className="mr-1 h-4 w-4" />
                            {getLinkedCampaignName(campaign.id)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not linked</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isCampaignLinked(campaign.id) ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnlinkCampaign(campaign.id)}
                            disabled={linkingCampaign === campaign.id}
                          >
                            <Unlink className="mr-1 h-4 w-4" />
                            {linkingCampaign === campaign.id ? 'Unlinking...' : 'Unlink'}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenMappingDialog(campaign.id, campaign.name)}
                            disabled={linkingCampaign === campaign.id}
                          >
                            <LinkIcon className="mr-1 h-4 w-4" />
                            {linkingCampaign === campaign.id ? 'Linking...' : 'Link'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      
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
                onClick={handleLinkCampaign}
                disabled={!selectedTsCampaignId || linkingCampaign !== null}
              >
                {linkingCampaign !== null && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Map Campaign
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeadProsperCampaigns;
