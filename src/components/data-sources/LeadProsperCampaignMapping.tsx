import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Link2, AlertTriangle, CheckCircle, Search, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExternalLPCampaign {
  id: string;
  lp_campaign_id: number;
  name: string;
  status: string;
}

interface TortSharkCampaign {
  id: string;
  name: string;
  is_active: boolean;
}

interface LPMapping {
  id: string;
  lp_campaign_id: string;
  ts_campaign_id: string;
  active: boolean;
}

export default function LeadProsperCampaignMapping() {
  const [lpCampaigns, setLpCampaigns] = useState<ExternalLPCampaign[]>([]);
  const [tsCampaigns, setTsCampaigns] = useState<TortSharkCampaign[]>([]);
  const [mappings, setMappings] = useState<LPMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch LeadProsper campaigns
      const { data: lpData, error: lpError } = await supabase
        .from("external_lp_campaigns")
        .select("*")
        .order("name");

      if (lpError) throw lpError;

      // Fetch TortShark campaigns
      const { data: tsData, error: tsError } = await supabase
        .from("campaigns")
        .select("id, name, is_active")
        .order("name");

      if (tsError) throw tsError;

      // Fetch existing mappings
      const { data: mappingData, error: mappingError } = await supabase
        .from("lp_to_ts_map")
        .select("*");

      if (mappingError) throw mappingError;

      setLpCampaigns(lpData || []);
      setTsCampaigns(tsData || []);
      setMappings(mappingData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load campaign data");
    } finally {
      setIsLoading(false);
    }
  };

  const getMappingForLP = (lpCampaignUuid: string) => {
    return mappings.find(m => m.lp_campaign_id === lpCampaignUuid && m.active);
  };

  const handleMappingChange = async (lpCampaignUuid: string, tsCampaignId: string | null) => {
    setSavingId(lpCampaignUuid);
    try {
      // First, deactivate any existing mapping for this LP campaign
      const existingMapping = mappings.find(m => m.lp_campaign_id === lpCampaignUuid);
      
      if (existingMapping) {
        // Update existing mapping
        if (tsCampaignId) {
          const { error } = await supabase
            .from("lp_to_ts_map")
            .update({ 
              ts_campaign_id: tsCampaignId, 
              active: true,
              linked_at: new Date().toISOString(),
              unlinked_at: null
            })
            .eq("id", existingMapping.id);

          if (error) throw error;
        } else {
          // Deactivate mapping
          const { error } = await supabase
            .from("lp_to_ts_map")
            .update({ 
              active: false,
              unlinked_at: new Date().toISOString()
            })
            .eq("id", existingMapping.id);

          if (error) throw error;
        }
      } else if (tsCampaignId) {
        // Create new mapping
        const { error } = await supabase
          .from("lp_to_ts_map")
          .insert({
            lp_campaign_id: lpCampaignUuid,
            ts_campaign_id: tsCampaignId,
            active: true,
            linked_at: new Date().toISOString()
          });

        if (error) throw error;
      }

      toast.success("Mapping updated");
      await fetchData(); // Refresh data
    } catch (error) {
      console.error("Error updating mapping:", error);
      toast.error("Failed to update mapping");
    } finally {
      setSavingId(null);
    }
  };

  const handleSyncCampaigns = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("leadprosper-sync", {
        body: { action: "sync_campaigns" }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Synced ${data.synced} campaigns from LeadProsper`);
        await fetchData();
      } else {
        throw new Error(data.error || "Sync failed");
      }
    } catch (error) {
      console.error("Error syncing campaigns:", error);
      toast.error("Failed to sync campaigns from LeadProsper");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredCampaigns = lpCampaigns.filter(lp => {
    const matchesSearch = lp.name.toLowerCase().includes(searchQuery.toLowerCase());
    const mapping = getMappingForLP(lp.id);
    const matchesFilter = !showUnmappedOnly || !mapping;
    return matchesSearch && matchesFilter;
  });

  const unmappedCount = lpCampaigns.filter(lp => !getMappingForLP(lp.id)).length;
  const mappedCount = lpCampaigns.length - unmappedCount;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          LeadProsper Campaign Mapping
        </CardTitle>
        <CardDescription>
          Map your LeadProsper campaigns to TortShark campaigns for automatic data sync
        </CardDescription>
        
        <div className="flex items-center gap-4 pt-4">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            {mappedCount} Mapped
          </Badge>
          <Badge variant="outline" className="bg-amber-50 text-amber-700">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {unmappedCount} Unmapped
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <Button 
            onClick={handleSyncCampaigns} 
            disabled={isSyncing}
            variant="outline"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync Campaigns from LeadProsper
              </>
            )}
          </Button>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search LeadProsper campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showUnmappedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnmappedOnly(!showUnmappedOnly)}
          >
            {showUnmappedOnly ? "Showing Unmapped" : "Show Unmapped Only"}
          </Button>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || showUnmappedOnly 
              ? "No campaigns match your filters" 
              : "No LeadProsper campaigns found. Sync your campaigns first."}
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>LeadProsper Campaign</TableHead>
                  <TableHead>LP ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[300px]">TortShark Campaign</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((lp) => {
                  const mapping = getMappingForLP(lp.id);
                  const isSaving = savingId === lp.id;

                  return (
                    <TableRow key={lp.id}>
                      <TableCell className="font-medium">{lp.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {lp.lp_campaign_id}
                      </TableCell>
                      <TableCell>
                        {mapping ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            Mapped
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700">
                            Unmapped
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping?.ts_campaign_id || "none"}
                          onValueChange={(value) => 
                            handleMappingChange(lp.id, value === "none" ? null : value)
                          }
                          disabled={isSaving}
                        >
                          <SelectTrigger className="w-full">
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <SelectValue placeholder="Select campaign..." />
                            )}
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50 max-h-[300px]">
                            <SelectItem value="none">-- No mapping --</SelectItem>
                            {tsCampaigns.map((ts) => (
                              <SelectItem key={ts.id} value={ts.id}>
                                {ts.name} {!ts.is_active && "(Inactive)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
