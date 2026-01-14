
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LinkIcon, Unlink, Search, Check, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  budget?: string;
  clicks?: number;
  impressions?: number;
  cost?: number;
  accountId: string;
  accountName?: string;
}

interface CampaignMapping {
  google_campaign_id: string;
  tortshark_campaign_id: string;
  tortshark_campaign_name?: string;
}

const GoogleAdsCampaigns = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [tortsharkCampaigns, setTortsharkCampaigns] = useState<{id: string, name: string}[]>([]);
  const [mappings, setMappings] = useState<CampaignMapping[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [linkingCampaign, setLinkingCampaign] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setError(null);
      
      // Fetch Google Ads accounts first
      const { data: accounts, error: accountsError } = await supabase
        .from('account_connections')
        .select('*')
        .eq('platform', 'google_ads')
        .eq('is_connected', true);

      if (accountsError) throw accountsError;

      if (!accounts || accounts.length === 0) {
        setCampaigns([]);
        setIsLoading(false);
        return;
      }

      // Fetch campaigns for each account
      const allCampaigns: GoogleAdsCampaign[] = [];
      
      for (const account of accounts) {
        try {
          const { data, error: funcError } = await supabase.functions.invoke('google-ads-sync', {
            body: { 
              action: 'get-campaigns',
              customerId: account.customer_id 
            }
          });

          if (funcError) {
            console.error(`Error fetching campaigns for account ${account.customer_id}:`, funcError);
            continue;
          }

          if (data?.campaigns) {
            const accountCampaigns = data.campaigns.map((c: any) => ({
              id: c.id || c.campaign_id,
              name: c.name || c.campaign_name,
              status: c.status || 'UNKNOWN',
              budget: c.budget ? `$${(c.budget / 1000000).toFixed(2)}/day` : undefined,
              clicks: c.clicks || 0,
              impressions: c.impressions || 0,
              cost: c.cost_micros ? c.cost_micros / 1000000 : 0,
              accountId: account.customer_id || '',
              accountName: account.name
            }));
            allCampaigns.push(...accountCampaigns);
          }
        } catch (err) {
          console.error(`Error processing account ${account.customer_id}:`, err);
        }
      }

      setCampaigns(allCampaigns);

      // Fetch existing mappings
      const { data: mappingsData } = await supabase
        .from('campaign_ad_mappings')
        .select('google_campaign_id, tortshark_campaign_id');
      
      if (mappingsData) {
        setMappings(mappingsData);
      }

      // Fetch TortShark campaigns for linking
      const { data: tsCampaigns } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('is_active', true);
      
      if (tsCampaigns) {
        setTortsharkCampaigns(tsCampaigns);
      }

    } catch (err: any) {
      console.error('Error fetching Google Ads campaigns:', err);
      setError(err.message || 'Failed to fetch campaigns');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCampaigns();
    toast.success('Campaigns refreshed');
  };

  const getLinkedCampaign = (googleCampaignId: string) => {
    const mapping = mappings.find(m => m.google_campaign_id === googleCampaignId);
    if (!mapping) return null;
    const tsCampaign = tortsharkCampaigns.find(c => c.id === mapping.tortshark_campaign_id);
    return tsCampaign?.name || 'Linked';
  };

  const handleLinkCampaign = async (googleCampaignId: string, tortsharkCampaignId: string) => {
    setLinkingCampaign(googleCampaignId);
    
    try {
      const campaign = campaigns.find(c => c.id === googleCampaignId);
      if (!campaign) throw new Error('Campaign not found');

      const { error } = await supabase
        .from('campaign_ad_mappings')
        .insert({
          google_campaign_id: googleCampaignId,
          google_campaign_name: campaign.name,
          google_account_id: campaign.accountId,
          tortshark_campaign_id: tortsharkCampaignId,
          is_active: true
        });

      if (error) throw error;

      setMappings(prev => [...prev, { 
        google_campaign_id: googleCampaignId, 
        tortshark_campaign_id: tortsharkCampaignId 
      }]);
      
      toast.success('Campaign linked successfully');
    } catch (err: any) {
      console.error('Error linking campaign:', err);
      toast.error(err.message || 'Failed to link campaign');
    } finally {
      setLinkingCampaign(null);
      setSelectedCampaign(null);
    }
  };

  const handleUnlinkCampaign = async (googleCampaignId: string) => {
    setLinkingCampaign(googleCampaignId);
    
    try {
      const { error } = await supabase
        .from('campaign_ad_mappings')
        .delete()
        .eq('google_campaign_id', googleCampaignId);

      if (error) throw error;

      setMappings(prev => prev.filter(m => m.google_campaign_id !== googleCampaignId));
      toast.success('Campaign unlinked successfully');
    } catch (err: any) {
      console.error('Error unlinking campaign:', err);
      toast.error(err.message || 'Failed to unlink campaign');
    } finally {
      setLinkingCampaign(null);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No Google Ads campaigns found</p>
        <p className="text-sm text-muted-foreground">
          Make sure you have connected a Google Ads account with active campaigns.
        </p>
        <Button onClick={handleRefresh} variant="outline" className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Campaign Name</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Impressions</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Linked To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No campaigns match your search
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => {
                const linkedTo = getLinkedCampaign(campaign.id);
                const isLinked = !!linkedTo;
                
                return (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {campaign.accountName || campaign.accountId}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={campaign.status === 'ENABLED' ? 'default' : 
                                campaign.status === 'PAUSED' ? 'outline' : 'secondary'}
                      >
                        {campaign.status.toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{(campaign.clicks || 0).toLocaleString()}</TableCell>
                    <TableCell>{(campaign.impressions || 0).toLocaleString()}</TableCell>
                    <TableCell>${(campaign.cost || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      {isLinked ? (
                        <span className="flex items-center text-green-600">
                          <Check className="mr-1 h-4 w-4" />
                          {linkedTo}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isLinked ? (
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
                        <>
                          {selectedCampaign === campaign.id ? (
                            <div className="flex items-center justify-end space-x-2">
                              <Select
                                onValueChange={(value) => handleLinkCampaign(campaign.id, value)}
                                disabled={linkingCampaign === campaign.id}
                              >
                                <SelectTrigger className="w-[180px]">
                                  <SelectValue placeholder="Select campaign" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tortsharkCampaigns.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedCampaign(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedCampaign(campaign.id)}
                              disabled={linkingCampaign === campaign.id}
                            >
                              <LinkIcon className="mr-1 h-4 w-4" />
                              {linkingCampaign === campaign.id ? 'Linking...' : 'Link'}
                            </Button>
                          )}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GoogleAdsCampaigns;
