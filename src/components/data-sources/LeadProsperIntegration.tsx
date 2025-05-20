
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, LinkIcon, CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from 'sonner';
import LeadProsperCampaigns from './LeadProsperCampaigns';
import { leadProsperApi } from "@/integrations/leadprosper/client";
import { SUPABASE_FUNCTIONS_URL } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LeadProsperIntegration = () => {
  const { user } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState('connect');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for existing connection on component mount
  useEffect(() => {
    checkExistingConnection();
  }, []);

  const checkExistingConnection = async () => {
    try {
      setIsLoading(true);
      const connectionData = await leadProsperApi.checkConnection(true);
      if (connectionData.isConnected) {
        console.log("Found existing Lead Prosper connection");
        setIsConnected(true);
        setActiveTab('campaigns');
      } else {
        console.log("No existing Lead Prosper connection found");
      }
    } catch (error) {
      console.error("Error checking Lead Prosper connection:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Lead Prosper API key');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      console.log("Starting verification process");
      
      // First try to verify the API key using the Edge Function
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/lead-prosper-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });
      
      console.log("Verification response status:", response.status);
      const verifyResult = await response.json();
      console.log("Verification result:", verifyResult);
      
      if (!verifyResult.isValid) {
        const errorMsg = verifyResult.error || 'API key verification failed. Please check your key and try again.';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        return;
      }
      
      // If verified, store the credentials
      if (user) {
        console.log("Saving verified connection");
        const connectionResult = await leadProsperApi.saveConnection(apiKey, 'Lead Prosper', user.id);
        
        if (connectionResult) {
          // Cache the API key for quicker access
          leadProsperApi.setCachedApiKey(apiKey);
          
          setIsConnected(true);
          setActiveTab('campaigns');
          toast.success('Successfully connected to Lead Prosper');
          console.log("Connection saved successfully");
        } else {
          throw new Error("Failed to save the connection");
        }
      } else {
        toast.error('User not logged in. Please sign in to save your connection.');
      }
    } catch (error) {
      console.error('Error connecting to Lead Prosper:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect to Lead Prosper';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      // Get the current connection
      const { credentials } = await leadProsperApi.checkConnection();
      
      if (credentials?.id) {
        // Delete the connection
        const success = await leadProsperApi.deleteConnection(credentials.id);
        
        if (success) {
          // Clear local cache
          leadProsperApi.resetState();
          
          setIsConnected(false);
          setApiKey('');
          setActiveTab('connect');
          toast.info('Lead Prosper disconnected');
        } else {
          toast.error('Failed to disconnect from Lead Prosper');
        }
      } else {
        // If no connection in DB but locally we think we're connected
        leadProsperApi.resetState();
        setIsConnected(false);
        setApiKey('');
        setActiveTab('connect');
        toast.info('Lead Prosper disconnected');
      }
    } catch (error) {
      console.error('Error disconnecting from Lead Prosper:', error);
      toast.error('Error disconnecting from Lead Prosper');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify API key separately before connecting
  const verifyApiKeyOnly = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Lead Prosper API key');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);
    
    try {
      console.log("Verifying API key only");
      const response = await fetch(`${SUPABASE_FUNCTIONS_URL}/lead-prosper-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      });
      
      console.log("Verification response status:", response.status);
      const verifyResult = await response.json();
      console.log("Verification result:", verifyResult);
      
      if (verifyResult.isValid) {
        toast.success('API key is valid!');
      } else {
        const errorMsg = verifyResult.error || 'API key verification failed. Please check your key.';
        setErrorMessage(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error verifying API key:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to verify API key';
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LinkIcon className="mr-2 h-5 w-5" />
            Lead Prosper Integration
          </CardTitle>
          <CardDescription>
            Connect your Lead Prosper account to sync lead data automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="connect">Connection</TabsTrigger>
              <TabsTrigger value="campaigns" disabled={!isConnected}>Campaigns</TabsTrigger>
            </TabsList>
            
            <TabsContent value="connect">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <Label htmlFor="leadprosper-status">Connection Status</Label>
                        <div className="flex items-center mt-1 text-sm">
                          {isConnected ? (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                              <span className="text-green-600">Connected</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-2 h-4 w-4 text-red-500" />
                              <span className="text-red-600">Not Connected</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {errorMessage && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
                      </Alert>
                    )}

                    {!isConnected && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="leadprosper-api-key">API Key</Label>
                          <Input
                            id="leadprosper-api-key"
                            placeholder="Enter your Lead Prosper API key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          You can find your API key in your Lead Prosper account settings.
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                          <Button variant="secondary" onClick={verifyApiKeyOnly} disabled={isVerifying || !apiKey.trim()}>
                            {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isVerifying ? "Verifying..." : "Verify API Key"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="campaigns">
              <LeadProsperCampaigns />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          {isConnected ? (
            <Button variant="destructive" onClick={handleDisconnect} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disconnect Lead Prosper
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isLoading || !apiKey.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Connecting..." : "Connect Lead Prosper"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default LeadProsperIntegration;
