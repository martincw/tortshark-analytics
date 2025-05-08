
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { CampaignMappingDialog } from "@/components/accounts/CampaignMappingDialog";
import LeadProsperMappingDialog from "./LeadProsperMappingDialog";
import { CardHeader, CardTitle, CardDescription, CardContent, Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, Link2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { leadProsperApi } from "@/integrations/leadprosper/client";
import { useCampaign } from "@/contexts/CampaignContext";

interface CampaignMappingSectionProps {
  campaignId: string;
  availableAccounts: any[];
}

export default function CampaignMappingSection({ campaignId, availableAccounts }: CampaignMappingSectionProps) {
  const { user } = useAuth();
  const { campaigns } = useCampaign();
  const [googleMappings, setGoogleMappings] = useState<any[]>([]);
  const [leadProsperMappings, setLeadProsperMappings] = useState<any[]>([]);
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(true);
  const [isLoadingLP, setIsLoadingLP] = useState(true);
  const [campaignName, setCampaignName] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Find the current campaign object for use in the mapping dialog
  const currentCampaign = campaigns?.find(c => c.id === campaignId);
  const campaignsForMapping = currentCampaign ? [currentCampaign] : [];
  
  // Get the selected account ID based on the current campaign
  const selectedAccountId = currentCampaign?.accountId || "";

  useEffect(() => {
    // Find campaign name from campaigns context or availableAccounts
    if (campaignId) {
      const campaign = campaigns?.find(c => c.id === campaignId) || 
                       availableAccounts?.find(a => a.id === campaignId);
      if (campaign) {
        setCampaignName(campaign.name || "Campaign");
      }
    }
  }, [campaignId, campaigns, availableAccounts]);

  useEffect(() => {
    if (campaignId) {
      fetchGoogleMappings();
      fetchLeadProsperMappings();
    }
  }, [campaignId]);

  const fetchGoogleMappings = async () => {
    setIsLoadingGoogle(true);
    try {
      const { data, error } = await supabase
        .from('campaign_ad_mappings')
        .select('*')
        .eq('tortshark_campaign_id', campaignId);
        
      if (error) {
        throw error;
      }
      
      setGoogleMappings(data || []);
    } catch (error) {
      console.error('Error fetching Google ad mappings:', error);
      toast.error('Failed to load campaign mappings');
    } finally {
      setIsLoadingGoogle(false);
    }
  };
  
  const fetchLeadProsperMappings = async () => {
    setIsLoadingLP(true);
    try {
      const mappings = await leadProsperApi.getMappedCampaigns(campaignId);
      setLeadProsperMappings(mappings || []);
    } catch (error) {
      console.error('Error fetching Lead Prosper mappings:', error);
      // Don't show error toast to avoid confusion if Lead Prosper is not set up
    } finally {
      setIsLoadingLP(false);
    }
  };
  
  const handleMappingUpdated = () => {
    fetchGoogleMappings();
    fetchLeadProsperMappings();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>External Integrations</CardTitle>
        <CardDescription>
          Map this campaign to external platforms for automatic data import
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Google Ads Mappings */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Google Ads Campaigns</h3>
            <Button 
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
            >
              <Link2 className="h-4 w-4 mr-2" />
              Map Google Campaign
            </Button>
          </div>
          
          {/* Google Ads Mapping Dialog */}
          <CampaignMappingDialog 
            isOpen={isDialogOpen} 
            onClose={() => {
              setIsDialogOpen(false);
              fetchGoogleMappings(); // Refresh mappings when dialog closes
            }} 
            accountId={selectedAccountId}
            campaigns={campaignsForMapping} 
          />
          
          {isLoadingGoogle ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : googleMappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Google Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Google Campaign ID</TableHead>
                  <TableHead>Google Account ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {googleMappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell>{mapping.google_campaign_name}</TableCell>
                    <TableCell>
                      {mapping.is_active ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{mapping.google_campaign_id}</TableCell>
                    <TableCell className="font-mono text-xs">{mapping.google_account_id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No Google Ads campaigns mapped yet
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* Lead Prosper Mappings */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Lead Prosper Campaigns</h3>
            <LeadProsperMappingDialog 
              campaignId={campaignId}
              campaignName={campaignName}
              onMappingUpdated={fetchLeadProsperMappings}
            />
          </div>
          
          {isLoadingLP ? (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leadProsperMappings.filter(m => m.active).length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead Prosper Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Mapped On</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadProsperMappings
                  .filter(mapping => mapping.active)
                  .map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>{mapping.lp_campaign?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">Active</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{mapping.lp_campaign?.lp_campaign_id || 'Unknown'}</TableCell>
                      <TableCell>{new Date(mapping.linked_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No Lead Prosper campaigns mapped yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
