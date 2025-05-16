
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, Search, LinkIcon, UnlinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import { LeadProsperConnection, LeadProsperMapping } from '@/integrations/leadprosper/types';

interface LeadProsperMappingDialogProps {
  campaignId: string;
  campaignName: string;
  onMappingUpdated: () => void;
}

export default function LeadProsperMappingDialog({
  campaignId,
  campaignName,
  onMappingUpdated
}: LeadProsperMappingDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<any[]>([]);
  const [connection, setConnection] = useState<LeadProsperConnection | null>(null);
  const [mappings, setMappings] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [backfillProgress, setBackfillProgress] = useState<number | null>(null);
  
  // Backfill date range
  const [backfillDateRange, setBackfillDateRange] = useState<{
    startDate: Date;
    endDate: Date;
  }>({
    startDate: subDays(new Date(), 90), // Default to 90 days ago
    endDate: new Date() // Today
  });
  
  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);
  
  useEffect(() => {
    if (searchTerm) {
      const filtered = campaigns.filter(campaign => 
        campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.id.toString().includes(searchTerm)
      );
      setFilteredCampaigns(filtered);
    } else {
      setFilteredCampaigns(campaigns);
    }
  }, [searchTerm, campaigns]);
  
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Get connection data
      const connectionData = await leadProsperApi.checkConnection();
      
      if (!connectionData.isConnected) {
        toast.error('No active Lead Prosper connection found');
        setOpen(false);
        return;
      }
      
      if (connectionData.credentials) {
        setConnection({
          id: connectionData.credentials.id,
          name: connectionData.credentials.name,
          platform: 'leadprosper',
          isConnected: connectionData.credentials.is_connected,
          lastSynced: connectionData.credentials.last_synced,
          apiKey: connectionData.apiKey || '',
          credentials: {
            apiKey: connectionData.apiKey || '',
          }
        });
      } else {
        setConnection({
          id: '',
          name: 'Lead Prosper',
          platform: 'leadprosper',
          isConnected: connectionData.isConnected,
          lastSynced: null,
          apiKey: connectionData.apiKey || '',
          credentials: {
            apiKey: connectionData.apiKey || '',
          }
        });
      }
      
      // Get campaign mappings for this TortShark campaign
      const mappingsData = await leadProsperApi.getCampaignMappings(campaignId);
      setMappings(mappingsData);
      
      // Get external campaigns from Lead Prosper
      const lp_campaigns = await leadProsperApi.fetchCampaigns();
      setCampaigns(lp_campaigns);
      setFilteredCampaigns(lp_campaigns);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load Lead Prosper data');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleMapCampaign = async () => {
    if (!selectedCampaign) {
      toast.error('Please select a Lead Prosper campaign to map');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Map the campaign
      await leadProsperApi.mapCampaign(campaignId, selectedCampaign);
      
      // Reload mappings
      const mappingsData = await leadProsperApi.getCampaignMappings(campaignId);
      setMappings(mappingsData);
      
      // Trigger backfill for the date range
      await handleBackfill(selectedCampaign);
      
      toast.success('Campaign mapped successfully');
      onMappingUpdated();
      setSelectedCampaign(null);
      
    } catch (error) {
      console.error('Error mapping campaign:', error);
      toast.error('Failed to map campaign');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleUnmapCampaign = async (mappingId: string) => {
    try {
      setIsSubmitting(true);
      
      // Unmap the campaign
      await leadProsperApi.unmapCampaign(mappingId);
      
      // Reload mappings
      const mappingsData = await leadProsperApi.getCampaignMappings(campaignId);
      setMappings(mappingsData);
      
      toast.success('Campaign unmapped successfully');
      onMappingUpdated();
      
    } catch (error) {
      console.error('Error unmapping campaign:', error);
      toast.error('Failed to unmap campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackfill = async (lpCampaignId: number) => {
    if (!connection?.credentials?.apiKey) {
      toast.error('Missing API credentials');
      return false;
    }

    try {
      setIsBackfilling(true);
      const formattedStartDate = format(backfillDateRange.startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(backfillDateRange.endDate, 'yyyy-MM-dd');
      
      // Show long-lived toast for backfill operation
      toast.loading(`Backfilling lead data from ${formattedStartDate} to ${formattedEndDate}...`, {
        id: 'backfill',
        duration: 0
      });
      
      // Start a fake progress update for better UX
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        if (progress > 95) {
          clearInterval(progressInterval);
        } else {
          setBackfillProgress(progress);
        }
      }, 1000);
      
      const result = await leadProsperApi.backfillLeads(
        connection.credentials.apiKey,
        lpCampaignId,
        campaignId,
        formattedStartDate,
        formattedEndDate
      );
      
      // Clear the fake progress updates
      clearInterval(progressInterval);
      setBackfillProgress(100);
      
      // Update toast with results
      if (result.success) {
        toast.success(`Lead data backfill completed successfully`, {
          id: 'backfill',
          description: `Processed ${result.processed_leads} leads for the selected date range.`
        });
        return true;
      } else {
        toast.error('Failed to backfill lead data', {
          id: 'backfill',
          description: result.message || 'An error occurred during the backfill process.'
        });
        return false;
      }
    } catch (error) {
      console.error('Error during backfill:', error);
      toast.error('Error during backfill process', {
        id: 'backfill',
        description: error.message || 'An unexpected error occurred'
      });
      return false;
    } finally {
      setIsBackfilling(false);
      setBackfillProgress(null);
    }
  };
  
  const getActiveMappings = () => {
    return mappings.filter(mapping => mapping.active);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LinkIcon className="h-4 w-4 mr-2" />
          Lead Prosper Mapping
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Map Lead Prosper Campaign</DialogTitle>
          <DialogDescription>
            Link a Lead Prosper campaign to "{campaignName}" to automatically import leads
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current mappings */}
            {getActiveMappings().length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium">Active Mappings</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead Prosper Campaign</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mapped On</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getActiveMappings().map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>
                          {mapping.lp_campaign?.name || 'Unknown Campaign'}
                          <div className="text-xs text-muted-foreground">
                            ID: {mapping.lp_campaign?.lp_campaign_id || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {mapping.lp_campaign?.status || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(mapping.linked_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnmapCampaign(mapping.id)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UnlinkIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-md flex items-center gap-3 text-sm">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p>No active mappings found for this campaign</p>
                  <p className="text-muted-foreground">
                    Map a Lead Prosper campaign below to start importing leads
                  </p>
                </div>
              </div>
            )}
            
            {/* Backfill date range */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-2">Backfill Settings</h3>
              <p className="text-sm text-muted-foreground mb-4">
                When mapping a campaign, historical lead data will be imported for the date range below
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Start Date</label>
                  <DatePicker
                    date={backfillDateRange.startDate}
                    setDate={(date) => date && setBackfillDateRange(prev => ({ ...prev, startDate: date }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">End Date</label>
                  <DatePicker
                    date={backfillDateRange.endDate}
                    setDate={(date) => date && setBackfillDateRange(prev => ({ ...prev, endDate: date }))}
                  />
                </div>
              </div>
              
              {backfillProgress !== null && (
                <div className="mt-4">
                  <div className="text-sm flex justify-between mb-1">
                    <span>Backfill Progress</span>
                    <span>{backfillProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300 ease-in-out"
                      style={{ width: `${backfillProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Search and selection */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center border rounded-md px-3 focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-5 w-5 mr-2 text-muted-foreground" />
                <input
                  placeholder="Search campaigns by name or ID..."
                  className="flex h-10 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <ScrollArea className="h-[300px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.length > 0 ? (
                      filteredCampaigns.map((campaign) => {
                        const isAlreadyMapped = getActiveMappings().some(
                          (mapping) => mapping.lp_campaign?.lp_campaign_id === campaign.id
                        );
                        
                        return (
                          <TableRow key={campaign.id}>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={selectedCampaign === campaign.id}
                                onCheckedChange={() => {
                                  if (!isAlreadyMapped) {
                                    setSelectedCampaign(
                                      selectedCampaign === campaign.id ? null : campaign.id
                                    );
                                  }
                                }}
                                disabled={isAlreadyMapped}
                              />
                            </TableCell>
                            <TableCell className={isAlreadyMapped ? "text-muted-foreground" : ""}>
                              {campaign.name}
                              {isAlreadyMapped && (
                                <div className="text-xs">(Already mapped)</div>
                              )}
                            </TableCell>
                            <TableCell className={isAlreadyMapped ? "text-muted-foreground" : ""}>
                              {campaign.id}
                            </TableCell>
                            <TableCell className={isAlreadyMapped ? "text-muted-foreground" : ""}>
                              <Badge variant="outline">
                                {campaign.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                          No campaigns found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleMapCampaign} 
            disabled={!selectedCampaign || isSubmitting || isBackfilling}
          >
            {isSubmitting || isBackfilling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isBackfilling ? "Backfilling Data..." : "Mapping..."}
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Map Campaign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
