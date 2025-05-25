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
import { 
  ExternalLink, 
  Key, 
  RefreshCw, 
  Loader2, 
  Check, 
  X, 
  AlertCircle,
  RotateCcw,
  CheckCircle
} from 'lucide-react';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import { LeadProsperConnection as LeadProsperConnectionType } from '@/integrations/leadprosper/types';

export default function LeadProsperConnection() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connection, setConnection] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [connectionName, setConnectionName] = useState('Lead Prosper');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // First load - check connection and get webhook URL
  useEffect(() => {
    checkConnection();
    // Get webhook URL directly as a string, not a Promise
    const url = leadProsperApi.getLeadProsperWebhookUrl();
    setWebhookUrl(url);
    
    // Try to restore API key from cache
    const cachedApiKey = leadProsperApi.getCachedApiKey();
    if (cachedApiKey) {
      setApiKey(cachedApiKey);
    }
  }, []);

  // Check the connection status
  const checkConnection = async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      
      const data = await leadProsperApi.checkConnection(forceRefresh);
      
      if (data.error) {
        console.error('Connection check returned error:', data.error);
        setErrorMessage(`Connection error: ${data.error}`);
        setIsConnected(false);
        return;
      }
      
      setIsConnected(data.isConnected);
      
      if (data.credentials) {
        let credentialsData = data.credentials.credentials;
        
        // Parse credentials if it's a string
        if (typeof credentialsData === 'string') {
          try {
            credentialsData = JSON.parse(credentialsData);
          } catch (e) {
            console.error('Failed to parse credentials JSON:', e);
            credentialsData = { apiKey: data.apiKey || '' };
          }
        }
        
        // Make sure credentialsData is an object with the required apiKey
        if (!credentialsData || typeof credentialsData !== 'object') {
          credentialsData = { apiKey: data.apiKey || '' };
        }
        
        setConnection({
          id: data.credentials.id,
          name: data.credentials.name,
          platform: 'leadprosper',
          isConnected: data.credentials.is_connected,
          lastSynced: data.credentials.last_synced,
          apiKey: credentialsData.apiKey || '',
          credentials: {
            apiKey: credentialsData.apiKey || '',
            ...credentialsData
          }
        });
        
        // Update the API key state and cache
        if (credentialsData.apiKey) {
          setApiKey(credentialsData.apiKey);
          leadProsperApi.setCachedApiKey(credentialsData.apiKey);
        }
        
        setConnectionName(data.credentials.name);
      }
      
      if (data.isConnected && data.fromCache === false) {
        setSuccessMessage('Connection status verified successfully');
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setErrorMessage('Failed to check Lead Prosper connection status');
      toast.error('Failed to check Lead Prosper connection status');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify API key is valid before saving
  const verifyApiKey = async () => {
    if (!apiKey) {
      toast.error('Please enter your Lead Prosper API key');
      return false;
    }
    
    setIsVerifying(true);
    
    try {
      // First do basic validation
      if (apiKey.length < 10) {
        toast.error('API key appears to be invalid (too short)');
        return false;
      }
      
      console.log('Verifying API key...');
      const isValid = await leadProsperApi.verifyApiKey(apiKey);
      console.log('API key verification result:', isValid);
      
      if (isValid) {
        toast.success('API key verified successfully');
        return true;
      } else {
        toast.error('API key verification failed. Please check your key and try again.');
        return false;
      }
    } catch (error) {
      console.error('API key verification error:', error);
      toast.error(`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  // Connect to Lead Prosper
  const handleConnect = async () => {
    if (!await verifyApiKey()) {
      return;
    }
    
    if (!user?.id) {
      toast.error('User ID not available. Please login again.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      
      // Try to store the credentials
      const storeSuccess = await leadProsperApi.storeCredentials(apiKey, user.id);
      if (!storeSuccess) {
        throw new Error('Failed to store API key in the database');
      }
      
      // Save the connection
      const updatedConnection = await leadProsperApi.saveConnection(
        apiKey,
        connectionName,
        user.id
      );
      
      // Extract credentials from the response
      let updatedCredentials = updatedConnection.credentials;
      if (typeof updatedCredentials === 'string') {
        try {
          updatedCredentials = JSON.parse(updatedCredentials);
        } catch (e) {
          console.error('Failed to parse credentials JSON:', e);
          updatedCredentials = { apiKey };
        }
      } else if (!updatedCredentials) {
        updatedCredentials = { apiKey };
      }
      
      // Update connection state
      setConnection({
        id: updatedConnection.id,
        name: updatedConnection.name,
        platform: 'leadprosper',
        isConnected: updatedConnection.is_connected,
        lastSynced: updatedConnection.last_synced,
        apiKey: apiKey,
        credentials: {
          apiKey: apiKey,
          ...(typeof updatedCredentials === 'object' ? updatedCredentials : {})
        }
      });
      
      setIsConnected(true);
      setShowDialog(false);
      toast.success('Lead Prosper connected successfully');
      
      // Force refresh connection status
      setTimeout(() => {
        checkConnection(true);
      }, 1000);
    } catch (error) {
      console.error('Connection error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect to Lead Prosper');
      toast.error(error instanceof Error ? error.message : 'Failed to connect to Lead Prosper');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Disconnect from Lead Prosper
  const handleDisconnect = async () => {
    if (!connection?.id) return;
    
    try {
      setIsSubmitting(true);
      await leadProsperApi.deleteConnection(connection.id);
      setConnection(null);
      setIsConnected(false);
      leadProsperApi.setCachedApiKey(null);
      toast.success('Lead Prosper disconnected successfully');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect from Lead Prosper');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Reset authentication state
  const handleResetAuth = async () => {
    try {
      setIsResetting(true);
      
      // Reset API state
      leadProsperApi.resetState();
      
      // Reset UI state
      setApiKey('');
      
      // Force refresh connection status
      await checkConnection(true);
      
      toast.success('Lead Prosper authentication reset successfully');
    } catch (error) {
      console.error('Error resetting authentication:', error);
      toast.error('Failed to reset authentication state');
    } finally {
      setIsResetting(false);
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
            {successMessage && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-800">Success</AlertTitle>
                <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
              </Alert>
            )}
          
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{connection?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Last synced: {connection?.lastSynced 
                    ? new Date(connection.lastSynced).toLocaleString() 
                    : 'Never'}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => checkConnection(true)}
                disabled={isSubmitting}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSubmitting ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
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
              <AccordionItem value="troubleshoot">
                <AccordionTrigger>Troubleshooting</AccordionTrigger>
                <AccordionContent>
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Issues?</AlertTitle>
                    <AlertDescription className="mt-2">
                      <p className="mb-2">
                        If you're experiencing connection issues, try resetting the authentication state.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleResetAuth}
                        disabled={isResetting}
                      >
                        {isResetting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )}
                        Reset Authentication State
                      </Button>
                    </AlertDescription>
                  </Alert>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Key className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="font-medium">Not Connected</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your Lead Prosper account to import leads
                </p>
              </div>
            </div>
            
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
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
                
                <Button 
                  variant="secondary" 
                  type="button" 
                  onClick={() => verifyApiKey()}
                  disabled={isVerifying || !apiKey}
                  className="mt-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>Verify API Key</>
                  )}
                </Button>
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
