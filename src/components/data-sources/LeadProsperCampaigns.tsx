
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, Link2, Unlink } from 'lucide-react';
import { toast } from 'sonner';
import { leadProsperApi } from "@/integrations/leadprosper/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCampaign } from "@/contexts/CampaignContext";
import LeadProsperMappingDialog from "../campaigns/LeadProsperMappingDialog";

interface Campaign {
  id: number;
  name: string;
  status: string;
}

interface CampaignMapping {
  id: string;
  lp_campaign_id: string;
  ts_campaign_id: string;
  active: boolean;
  linked_at: string;
  lp_campaign?: {
    name: string;
    lp_campaign_id: number;
  };
}

const LeadProsperCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [mappings, setMappings] = useState<Record<number, CampaignMapping>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<{ id: number; name: string } | null>(null);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const { campaigns: tsCampaigns } = useCampaign();

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Loading Lead Prosper campaigns...");
      const fetchedCampaigns = await leadProsperApi.fetchCampaigns();
      
      console.log("Campaigns loaded:", fetchedCampaigns);
      setCampaigns(fetchedCampaigns);
      
      if (fetchedCampaigns.length === 0) {
        setError("No campaigns found. Please check your Lead Prosper account.");
        return;
      }

      // Load existing mappings for these campaigns
      await loadMappings(fetchedCampaigns);
    } catch (err) {
      console.error("Error loading campaigns:", err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaigns';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMappings = async (campaignList: Campaign[]) => {
    try {
      const mappingPromises = campaignList.map(async (campaign) => {
        // Find mappings for this LP campaign
        const { data, error } = await supabase
          .from('lp_to_ts_map')
          .select(`
            id,
            lp_campaign_id,
            ts_campaign_id,
            active,
            linked_at,
            lp_campaign:external_lp_campaigns!inner(
              name,
              lp_campaign_id
            )
          `)
          .eq('lp_campaign.lp_campaign_id', campaign.id)
          .eq('active', true)
          .single();

        return { campaignId: campaign.id, mapping: data };
      });

      const results = await Promise.all(mappingPromises);
      const mappingMap: Record<number, CampaignMapping> = {};
      
      results.forEach(({ campaignId, mapping }) => {
        if (mapping) {
          mappingMap[campaignId] = mapping;
        }
      });

      setMappings(mappingMap);
    } catch (err) {
      console.error("Error loading mappings:", err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadCampaigns();
    setIsRefreshing(false);
    toast.success("Campaigns refreshed");
  };

  const handleMapCampaign = (campaign: Campaign) => {
    setSelectedCampaign({ id: campaign.id, name: campaign.name });
    setIsMappingDialogOpen(true);
  };

  const handleMappingUpdated = () => {
    // Reload mappings after a successful mapping
    loadMappings(campaigns);
  };

  const handleUnmapCampaign = async (campaignId: number) => {
    try {
      const mapping = mappings[campaignId];
      if (!mapping) return;

      // Deactivate the mapping
      const { error } = await supabase
        .from('lp_to_ts_map')
        .update({ active: false, unlinked_at: new Date().toISOString() })
        .eq('id', mapping.id);

      if (error) {
        throw error;
      }

      // Remove from local state
      const newMappings = { ...mappings };
      delete newMappings[campaignId];
      setMappings(newMappings);

      toast.success("Campaign mapping removed");
    } catch (err) {
      console.error("Error removing mapping:", err);
      toast.error("Failed to remove mapping");
    }
  };

  const getMappedCampaignName = (campaignId: number) => {
    const mapping = mappings[campaignId];
    if (!mapping) return null;

    const tsCampaign = tsCampaigns?.find(c => c.id === mapping.ts_campaign_id);
    return tsCampaign?.name || 'Unknown Campaign';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'default';
      case 'paused':
        return 'secondary';
      case 'inactive':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Prosper Campaigns</CardTitle>
          <CardDescription>Loading your campaigns...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Lead Prosper Campaigns</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Campaigns available in your Lead Prosper account. Map them to TortShark campaigns for data import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : campaigns.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mapping Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const isMapped = !!mappings[campaign.id];
                    const mappedCampaignName = getMappedCampaignName(campaign.id);
                    
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell className="font-mono">{campaign.id}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(campaign.status)}>
                            {campaign.status || 'Unknown'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isMapped ? (
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600">
                                Mapped to: {mappedCampaignName}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-orange-500" />
                              <span className="text-sm text-muted-foreground">Not mapped</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isMapped ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUnmapCampaign(campaign.id)}
                              >
                                <Unlink className="h-3 w-3 mr-1" />
                                Unmap
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMapCampaign(campaign)}
                              >
                                <Link2 className="h-3 w-3 mr-1" />
                                Map Campaign
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No campaigns found. Make sure you have active campaigns in your Lead Prosper account.
              </AlertDescription>
            </Alert>
          )}
          
          {campaigns.length > 0 && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Campaign Mapping</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Map Lead Prosper campaigns to TortShark campaigns to automatically import lead data. 
                    Mapped campaigns will sync lead data based on your configured settings.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Mapping Dialog */}
      {selectedCampaign && (
        <LeadProsperMappingDialog
          campaignId={selectedCampaign.id.toString()}
          campaignName={selectedCampaign.name}
          onMappingUpdated={handleMappingUpdated}
          open={isMappingDialogOpen}
          onOpenChange={setIsMappingDialogOpen}
        />
      )}
    </>
  );
};

export default LeadProsperCampaigns;
