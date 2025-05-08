
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<any[]>([]);
  const [connection, setConnection] = useState<LeadProsperConnection | null>(null);
  const [mappings, setMappings] = useState<LeadProsperMapping[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  
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
      const mappingsData = await leadProsperApi.getMappedCampaigns(campaignId);
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
      const mappingsData = await leadProsperApi.getMappedCampaigns(campaignId);
      setMappings(mappingsData);
      
      // Trigger backfill for the last 90 days
      const today = new Date();
      const ninetyDaysAgo = subDays(today, 90);
      
      if (connection?.credentials?.apiKey) {
        await leadProsperApi.backfillLeads(
          connection.credentials.apiKey,
          selectedCampaign,
          campaignId,
          format(ninetyDaysAgo, 'yyyy-MM-dd'),
          format(today, 'yyyy-MM-dd')
        );
      }
      
      toast.success('Campaign mapped and data backfill initiated');
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
      const mappingsData = await leadProsperApi.getMappedCampaigns(campaignId);
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
            
            {/* Search and selection */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center border rounded-md px-3 focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-5 w-5 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns by name or ID..."
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
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
            disabled={!selectedCampaign || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mapping...
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
