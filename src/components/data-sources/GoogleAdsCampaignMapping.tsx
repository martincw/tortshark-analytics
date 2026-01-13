import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link2, Unlink, Search, Check, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useCampaign } from "@/contexts/CampaignContext";

interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  accountId: string;
  accountName: string;
  isMapped: boolean;
  tortsharkCampaignId: string | null;
  mappingActive: boolean;
}

const GoogleAdsCampaignMapping = () => {
  const { user } = useAuth();
  const { campaigns } = useCampaign();
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [googleCampaigns, setGoogleCampaigns] = useState<GoogleAdsCampaign[]>([]);
  const [linkingCampaign, setLinkingCampaign] = useState<string | null>(null);
  const [selectedMapping, setSelectedMapping] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string | null>(null);

  // Sort TortShark campaigns alphabetically
  const sortedTortsharkCampaigns = useMemo(() => 
    [...campaigns].sort((a, b) => a.name.localeCompare(b.name)),
    [campaigns]
  );

  const fetchGoogleCampaigns = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "list-google-campaigns",
            userId: user.id,
          }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setGoogleCampaigns(data.campaigns || []);
        if (data.campaigns?.length === 0) {
          setError("No Google Ads campaigns found. Make sure you've connected at least one Google Ads account.");
        }
      } else {
        setError(data.error || "Failed to fetch Google Ads campaigns");
      }
    } catch (err) {
      console.error("Error fetching Google Ads campaigns:", err);
      setError("Failed to connect to Google Ads. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoogleCampaigns();
  }, [user?.id]);

  const filteredCampaigns = googleCampaigns.filter(campaign => 
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.accountName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate mapped and unmapped campaigns
  const unmappedCampaigns = filteredCampaigns.filter(c => !c.isMapped);
  const mappedCampaigns = filteredCampaigns.filter(c => c.isMapped);

  const handleMapCampaign = async (googleCampaign: GoogleAdsCampaign) => {
    const tortsharkId = selectedMapping[googleCampaign.id];
    if (!tortsharkId) {
      toast.error("Please select a campaign to map to");
      return;
    }

    setLinkingCampaign(googleCampaign.id);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "map-campaign",
            googleCampaignId: googleCampaign.id,
            googleCampaignName: googleCampaign.name,
            googleAccountId: googleCampaign.accountId,
            tortsharkCampaignId: tortsharkId,
          }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Mapped "${googleCampaign.name}" successfully`);
        // Update local state
        setGoogleCampaigns(prev => prev.map(c => 
          c.id === googleCampaign.id 
            ? { ...c, isMapped: true, tortsharkCampaignId: tortsharkId, mappingActive: true }
            : c
        ));
        setSelectedMapping(prev => {
          const next = { ...prev };
          delete next[googleCampaign.id];
          return next;
        });
      } else {
        toast.error(data.error || "Failed to map campaign");
      }
    } catch (err) {
      console.error("Error mapping campaign:", err);
      toast.error("Failed to map campaign");
    } finally {
      setLinkingCampaign(null);
    }
  };

  const handleUnmapCampaign = async (googleCampaign: GoogleAdsCampaign) => {
    setLinkingCampaign(googleCampaign.id);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "unmap-campaign",
            googleCampaignId: googleCampaign.id,
            googleAccountId: googleCampaign.accountId,
          }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Unmapped "${googleCampaign.name}"`);
        setGoogleCampaigns(prev => prev.map(c => 
          c.id === googleCampaign.id 
            ? { ...c, isMapped: false, tortsharkCampaignId: null, mappingActive: false }
            : c
        ));
      } else {
        toast.error(data.error || "Failed to unmap campaign");
      }
    } catch (err) {
      console.error("Error unmapping campaign:", err);
      toast.error("Failed to unmap campaign");
    } finally {
      setLinkingCampaign(null);
    }
  };

  const handleSyncSpend = async () => {
    if (!user?.id) return;
    
    setIsSyncing(true);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "sync-realtime-spend",
            userId: user.id,
          }),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success(`Synced ad spend for ${data.synced || 0} campaigns`);
      } else {
        toast.error(data.error || "Failed to sync ad spend");
      }
    } catch (err) {
      console.error("Error syncing spend:", err);
      toast.error("Failed to sync ad spend");
    } finally {
      setIsSyncing(false);
    }
  };

  const getTortsharkCampaignName = (id: string | null) => {
    if (!id) return null;
    return campaigns.find(c => c.id === id)?.name || "Unknown";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaign Mapping</CardTitle>
          <CardDescription>Connect Google Ads campaigns to TortShark campaigns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Campaign Mapping</CardTitle>
            <CardDescription>
              Connect Google Ads campaigns to TortShark campaigns for automatic ad spend sync
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleSyncSpend}
              disabled={isSyncing || mappedCampaigns.length === 0}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? "Syncing..." : "Sync Ad Spend Now"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchGoogleCampaigns}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Unmapped Campaigns Section */}
        {unmappedCampaigns.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Badge variant="destructive" className="text-xs">
                {unmappedCampaigns.length} Unmapped
              </Badge>
              <span className="text-muted-foreground">Need to be connected</span>
            </h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Google Ads Campaign</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Map To</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unmappedCampaigns.map((campaign) => (
                    <TableRow key={`${campaign.accountId}-${campaign.id}`} className="bg-amber-50/50">
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{campaign.accountName}</TableCell>
                      <TableCell>
                        <Badge variant={campaign.status === 'ENABLED' ? 'default' : 'secondary'}>
                          {campaign.status?.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectedMapping[campaign.id] || ""}
                          onValueChange={(value) => setSelectedMapping(prev => ({ ...prev, [campaign.id]: value }))}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select campaign..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sortedTortsharkCampaigns.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleMapCampaign(campaign)}
                          disabled={linkingCampaign === campaign.id || !selectedMapping[campaign.id]}
                        >
                          {linkingCampaign === campaign.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Link2 className="mr-1 h-4 w-4" />
                              Map
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Mapped Campaigns Section */}
        {mappedCampaigns.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Badge variant="default" className="bg-green-600 text-xs">
                {mappedCampaigns.length} Mapped
              </Badge>
              <span className="text-muted-foreground">Syncing ad spend automatically</span>
            </h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Google Ads Campaign</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Mapped To</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedCampaigns.map((campaign) => (
                    <TableRow key={`${campaign.accountId}-${campaign.id}`}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{campaign.accountName}</TableCell>
                      <TableCell>
                        <span className="flex items-center text-green-600">
                          <Check className="mr-1 h-4 w-4" />
                          {getTortsharkCampaignName(campaign.tortsharkCampaignId)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnmapCampaign(campaign)}
                          disabled={linkingCampaign === campaign.id}
                        >
                          {linkingCampaign === campaign.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Unlink className="mr-1 h-4 w-4" />
                              Unmap
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {filteredCampaigns.length === 0 && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No Google Ads campaigns found</p>
            <p className="text-sm mt-1">Connect a Google Ads account first</p>
          </div>
        )}

        {/* Info about auto-sync */}
        <Alert>
          <AlertDescription className="text-sm">
            <strong>Auto-sync:</strong> Ad spend is automatically synced every 15 minutes for mapped campaigns. 
            Yesterday's final spend is saved after midnight.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};

export default GoogleAdsCampaignMapping;
