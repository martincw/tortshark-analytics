
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExternalLink, Key, RefreshCw, Loader2, Check, X, AlertCircle } from 'lucide-react';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import { LeadProsperConnection as LeadProsperConnectionType } from '@/integrations/leadprosper/types';

export default function LeadProsperConnection() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<LeadProsperConnectionType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [connectionName, setConnectionName] = useState('Lead Prosper');
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    checkConnection();
    leadProsperApi.getLeadProsperWebhookUrl().then(url => {
      setWebhookUrl(url);
    });
  }, []);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const data = await leadProsperApi.checkConnection();
      setIsConnected(data.isConnected);
      if (data.credentials) {
        setConnection({
          id: data.credentials.id,
          name: data.credentials.name,
          platform: 'leadprosper',
          isConnected: data.credentials.is_connected,
          lastSynced: data.credentials.last_synced,
          apiKey: '',
          credentials: data.credentials.credentials || {}
        });
        setApiKey(data.credentials.credentials?.apiKey || '');
        setConnectionName(data.credentials.name);
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      toast.error('Failed to check Lead Prosper connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey) {
      toast.error('Please enter your Lead Prosper API key');
      return;
    }

    try {
      setIsSubmitting(true);
      
      if (connection?.id) {
        // Update existing connection
        const updatedConnection = await leadProsperApi.updateConnection(
          connection.id,
          apiKey,
          connectionName
        );
        
        setConnection({
          ...connection,
          name: updatedConnection.name,
          lastSynced: updatedConnection.last_synced,
          credentials: updatedConnection.credentials
        });
        
        toast.success('Lead Prosper connection updated successfully');
      } else {
        // Create new connection
        const newConnection = await leadProsperApi.createConnection(
          apiKey,
          connectionName,
          user?.id || ''
        );
        
        setConnection({
          id: newConnection.id,
          name: newConnection.name,
          platform: 'leadprosper',
          isConnected: newConnection.is_connected,
          lastSynced: newConnection.last_synced,
          apiKey: '',
          credentials: newConnection.credentials
        });
        
        toast.success('Lead Prosper connected successfully');
      }
      
      setIsConnected(true);
      setShowDialog(false);
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect to Lead Prosper');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection?.id) return;
    
    try {
      setIsSubmitting(true);
      await leadProsperApi.deleteConnection(connection.id);
      setConnection(null);
      setIsConnected(false);
      toast.success('Lead Prosper disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect from Lead Prosper');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <span>Lead Prosper</span>
          {isConnected && <Check className="ml-2 h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>
          Connect your Lead Prosper account to import leads and campaign data
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{connection?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Last synced: {connection?.lastSynced 
                    ? new Date(connection.lastSynced).toLocaleString() 
                    : 'Never'}
                </p>
              </div>
            </div>
            
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="webhook">
                <AccordionTrigger>Webhook Configuration</AccordionTrigger>
                <AccordionContent>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Webhook URL</AlertTitle>
                    <AlertDescription className="mt-2">
                      <p className="mb-2">
                        To receive real-time lead notifications, set up a Campaign Trigger in Lead Prosper
                        with the following webhook URL:
                      </p>
                      <div className="flex items-center justify-between bg-muted p-2 rounded mb-2">
                        <code className="text-sm break-all">{webhookUrl}</code>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            navigator.clipboard.writeText(webhookUrl);
                            toast.success('Webhook URL copied to clipboard');
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => window.open('https://app.leadprosper.io/settings?tab=campaign-triggers', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Configure in Lead Prosper
                      </Button>
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Key className="h-12 w-12 text-muted-foreground" />
            <div className="text-center">
              <h3 className="font-medium">Not Connected</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Lead Prosper account to import leads
              </p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter>
        {isConnected ? (
          <div className="flex space-x-2 w-full">
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">Update API Key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Lead Prosper Connection</DialogTitle>
                  <DialogDescription>
                    Enter your Lead Prosper API key to update the connection
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Connection Name</Label>
                    <Input 
                      id="name"
                      value={connectionName}
                      onChange={(e) => setConnectionName(e.target.value)}
                      placeholder="Lead Prosper"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input 
                      id="apiKey"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      type="password"
                      placeholder="Your Lead Prosper API key"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                  <Button onClick={handleConnect} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>Update Connection</>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Button 
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isSubmitting}
              className="ml-auto"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Disconnect
                </>
              )}
            </Button>
          </div>
        ) : (
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Key className="mr-2 h-4 w-4" />
                Connect Lead Prosper
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect to Lead Prosper</DialogTitle>
                <DialogDescription>
                  Enter your Lead Prosper API key to connect your account
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Connection Name</Label>
                  <Input 
                    id="name"
                    value={connectionName}
                    onChange={(e) => setConnectionName(e.target.value)}
                    placeholder="Lead Prosper"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input 
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    type="password"
                    placeholder="Your Lead Prosper API key"
                  />
                  <p className="text-sm text-muted-foreground">
                    You can find your API key in the Lead Prosper dashboard under Settings &gt; API Keys
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button onClick={handleConnect} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>Connect</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  );
}
