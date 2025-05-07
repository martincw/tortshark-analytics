
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Search, 
  Loader2, 
  AlertCircle,
  HelpCircle,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function LeadProsperCampaigns() {
  const { user } = useAuth();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<{ isConnected: boolean, error?: string }>({
    isConnected: false
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionAndLoadCampaigns();
  }, []);

  const checkConnectionAndLoadCampaigns = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      // Check if the user is connected to Lead Prosper
      const connectionData = await leadProsperApi.checkConnection();
      
      if (connectionData.error) {
        setConnectionStatus({ isConnected: false, error: connectionData.error });
        setErrorMessage(`Connection error: ${connectionData.error}`);
        return;
      }
      
      if (!connectionData.isConnected) {
        console.log('No active Lead Prosper connection found');
        setConnectionStatus({ isConnected: false });
        setErrorMessage('No active Lead Prosper connection found. Please connect your account first.');
        return;
      }
      
      setConnectionStatus({ isConnected: true });
      
      // Get the API key
      const apiKey = connectionData.credentials?.credentials?.apiKey || 
                     leadProsperApi.getCachedApiKey();
                     
      if (!apiKey) {
        setErrorMessage('API key not found. Please reconnect your Lead Prosper account.');
        return;
      }
      
      // Load campaigns
      await loadCampaigns(apiKey);
      
    } catch (error) {
      console.error('Error checking connection and loading campaigns:', error);
      setErrorMessage('Failed to check connection status and load campaigns');
      toast.error('Failed to load Lead Prosper campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCampaigns = async (apiKey: string) => {
    try {
      const campaigns = await leadProsperApi.getCampaigns(apiKey);
      setCampaigns(campaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setErrorMessage(`Failed to load campaigns: ${error.message}`);
      toast.error('Failed to load Lead Prosper campaigns');
    }
  };

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      
      // Get API key from cache first
      let apiKey = leadProsperApi.getCachedApiKey();
      
      // If no key in cache, get it from connection data
      if (!apiKey) {
        const connectionData = await leadProsperApi.checkConnection();
        
        if (!connectionData.isConnected || !connectionData.credentials?.credentials?.apiKey) {
          toast.error('No API key found. Please reconnect your Lead Prosper account.');
          return;
        }
        
        apiKey = connectionData.credentials.credentials.apiKey;
      }
      
      await loadCampaigns(apiKey);
      toast.success('Campaigns refreshed successfully');
    } catch (error) {
      console.error('Error refreshing campaigns:', error);
      toast.error('Failed to refresh campaigns');
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => 
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.id.toString().includes(searchTerm)
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          Lead Prosper Campaigns
        </CardTitle>
        <CardDescription>
          View and manage your Lead Prosper campaigns
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : errorMessage ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>{errorMessage}</p>
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => window.location.href = "/integrations?tab=leadprosper"}
              >
                Go to Lead Prosper Connection
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
              <div className="flex items-center border rounded-md px-3 w-full sm:w-auto focus-within:ring-1 focus-within:ring-ring">
                <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing || !connectionStatus.isConnected}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <span>Refresh Campaigns</span>
                )}
              </Button>
            </div>
            
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <div className="flex items-center">
                        <span>Actions</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              View or manage campaign in Lead Prosper
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.length > 0 ? (
                    filteredCampaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>{campaign.name}</TableCell>
                        <TableCell>{campaign.id}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <a
                            href={`https://app.leadprosper.io/campaigns/${campaign.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-blue-500 hover:text-blue-700"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </a>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? (
                          <>No campaigns match your search</>
                        ) : (
                          <>No campaigns found</>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
