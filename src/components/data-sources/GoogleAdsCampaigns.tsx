
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Link, LinkIcon, Unlink, Search, Check } from "lucide-react";
import { toast } from 'sonner';
import { Skeleton } from "@/components/ui/skeleton";

interface Campaign {
  id: string;
  name: string;
  isLinked: boolean;
  linkedToName?: string;
  status: 'ENABLED' | 'PAUSED' | 'REMOVED';
  budget: string;
  clicks: number;
  impressions: number;
  cost: string;
}

const GoogleAdsCampaigns = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tortsharkCampaigns, setTortsharkCampaigns] = useState<{id: string, name: string}[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [linkingCampaign, setLinkingCampaign] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading campaign data
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock data for frontend implementation
      const mockCampaigns: Campaign[] = [
        { id: 'ga-1', name: 'Spring Product Launch', isLinked: true, linkedToName: 'Camp-001', status: 'ENABLED', budget: '$50.00/day', clicks: 342, impressions: 9876, cost: '$450.65' },
        { id: 'ga-2', name: 'Brand Awareness', isLinked: false, status: 'ENABLED', budget: '$30.00/day', clicks: 123, impressions: 5432, cost: '$220.45' },
        { id: 'ga-3', name: 'Retargeting Campaign', isLinked: false, status: 'PAUSED', budget: '$20.00/day', clicks: 56, impressions: 2345, cost: '$110.24' },
        { id: 'ga-4', name: 'Holiday Special', isLinked: true, linkedToName: 'Camp-003', status: 'REMOVED', budget: '$100.00/day', clicks: 892, impressions: 25678, cost: '$950.78' },
        { id: 'ga-5', name: 'Product Showcase', isLinked: false, status: 'ENABLED', budget: '$40.00/day', clicks: 234, impressions: 7654, cost: '$350.25' },
      ];
      
      const mockTortsharkCampaigns = [
        { id: 'ts-1', name: 'Camp-001' },
        { id: 'ts-2', name: 'Camp-002' },
        { id: 'ts-3', name: 'Camp-003' },
        { id: 'ts-4', name: 'Camp-004' },
      ];
      
      setCampaigns(mockCampaigns);
      setTortsharkCampaigns(mockTortsharkCampaigns);
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLinkCampaign = (campaignId: string, tortsharkCampaignId: string) => {
    setLinkingCampaign(campaignId);
    
    // Simulate API call to link campaign
    setTimeout(() => {
      setCampaigns(prevCampaigns => prevCampaigns.map(campaign => {
        if (campaign.id === campaignId) {
          const linkedCampaign = tortsharkCampaigns.find(c => c.id === tortsharkCampaignId);
          return {
            ...campaign,
            isLinked: true,
            linkedToName: linkedCampaign?.name
          };
        }
        return campaign;
      }));
      
      setLinkingCampaign(null);
      setSelectedCampaign(null);
      toast.success('Campaign linked successfully');
    }, 1000);
  };

  const handleUnlinkCampaign = (campaignId: string) => {
    setLinkingCampaign(campaignId);
    
    // Simulate API call to unlink campaign
    setTimeout(() => {
      setCampaigns(prevCampaigns => prevCampaigns.map(campaign => {
        if (campaign.id === campaignId) {
          return {
            ...campaign,
            isLinked: false,
            linkedToName: undefined
          };
        }
        return campaign;
      }));
      
      setLinkingCampaign(null);
      toast.success('Campaign unlinked successfully');
    }, 1000);
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
        <Button variant="outline" onClick={() => toast.info('Refreshing campaigns...')}>
          Refresh
        </Button>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Campaign Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead>Clicks</TableHead>
              <TableHead>Impressions</TableHead>
              <TableHead>Linked To</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No campaigns found
                </TableCell>
              </TableRow>
            ) : (
              filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={campaign.status === 'ENABLED' ? 'default' : 
                              campaign.status === 'PAUSED' ? 'outline' : 'secondary'}
                    >
                      {campaign.status.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.budget}</TableCell>
                  <TableCell>{campaign.clicks.toLocaleString()}</TableCell>
                  <TableCell>{campaign.impressions.toLocaleString()}</TableCell>
                  <TableCell>
                    {campaign.isLinked ? (
                      <span className="flex items-center text-green-600">
                        <Check className="mr-1 h-4 w-4" />
                        {campaign.linkedToName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not linked</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.isLinked ? (
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
                            <select 
                              className="h-8 rounded-md border border-input bg-transparent px-3 py-1 text-sm ring-offset-background"
                              onChange={(e) => handleLinkCampaign(campaign.id, e.target.value)}
                              disabled={linkingCampaign === campaign.id}
                              defaultValue=""
                            >
                              <option value="" disabled>Select campaign</option>
                              {tortsharkCampaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default GoogleAdsCampaigns;
