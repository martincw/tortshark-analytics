
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Loader2, RefreshCw, Search, Calendar, AlertCircle } from 'lucide-react';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import { LeadProsperConnection as LeadProsperConnectionType } from '@/integrations/leadprosper/types';

export default function LeadProsperCampaigns() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [connection, setConnection] = useState<LeadProsperConnectionType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

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

  const loadCampaigns = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Check connection status
      const connectionData = await leadProsperApi.checkConnection();
      
      if (connectionData.error) {
        setErrorMessage(`Connection error: ${connectionData.error}`);
        setIsLoading(false);
        return;
      }
      
      if (!connectionData.isConnected) {
        setIsLoading(false);
        return;
      }
      
      setConnection({
        id: connectionData.credentials.id,
        name: connectionData.credentials.name,
        platform: 'leadprosper',
        isConnected: connectionData.credentials.is_connected,
        lastSynced: connectionData.credentials.last_synced,
        apiKey: '',
        credentials: connectionData.credentials.credentials || {}
      });
      
      // Get API key - try from credentials first, then from cache
      let apiKey = connectionData.credentials.credentials?.apiKey;
      
      if (!apiKey) {
        apiKey = leadProsperApi.getCachedApiKey();
        console.log("Using cached API key");
      }
      
      if (!apiKey) {
        setErrorMessage('API key not found in credentials. Please reconnect your Lead Prosper account.');
        toast.error('API key not found in credentials');
        setIsLoading(false);
        return;
      }
      
      try {
        const campaignsData = await leadProsperApi.getCampaigns(apiKey);
        setCampaigns(campaignsData);
        setFilteredCampaigns(campaignsData);
      } catch (campaignsError) {
        console.error('Error loading campaigns:', campaignsError);
        setErrorMessage(`Failed to load campaigns: ${campaignsError.message}`);
        toast.error('Failed to load Lead Prosper campaigns');
      }
      
    } catch (error) {
      console.error('Error loading Lead Prosper campaigns:', error);
      setErrorMessage(`Failed to load Lead Prosper campaigns: ${error.message}`);
      toast.error('Failed to load Lead Prosper campaigns');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRefreshCampaigns = async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      await loadCampaigns();
      toast.success('Campaigns refreshed successfully');
    } catch (error) {
      console.error('Error refreshing campaigns:', error);
      setErrorMessage(`Failed to refresh campaigns: ${error.message}`);
      toast.error('Failed to refresh campaigns');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!connection?.isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead Prosper Campaigns</CardTitle>
          <CardDescription>
            Connect to Lead Prosper to view and manage your campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="mb-4 text-muted-foreground">
              No active Lead Prosper connection found. Please connect your account first.
            </p>
            <Button variant="outline" onClick={() => window.location.hash = '#connection'}>
              Go to Connection Setup
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Lead Prosper Campaigns</CardTitle>
          <CardDescription>
            View and manage your Lead Prosper campaigns
          </CardDescription>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshCampaigns}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          
            <div className="flex items-center border rounded-md px-3 focus-within:ring-1 focus-within:ring-ring">
              <Search className="h-5 w-5 mr-2 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {filteredCampaigns.length > 0 ? (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell className="font-mono text-xs">{campaign.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                            {new Date(campaign.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                {searchTerm ? "No campaigns found matching your search" : "No campaigns found"}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        Last synced: {connection?.lastSynced 
          ? new Date(connection.lastSynced).toLocaleString() 
          : 'Never'}
      </CardFooter>
    </Card>
  );
}
