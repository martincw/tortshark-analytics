
import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { hyrosApi } from '@/integrations/hyros/client';
import HyrosCampaigns from './HyrosCampaigns';
import { useCampaign } from '@/contexts/CampaignContext';

export default function Hyros() {
  const { toast } = useToast();
  const { fetchCampaigns } = useCampaign();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<{
    apiKey: string;
    accountId?: string;
    lastSynced?: string;
  } | null>(null);

  // Load existing connection
  useEffect(() => {
    const loadConnection = async () => {
      try {
        setLoading(true);
        const credentials = await hyrosApi.getApiCredentials();
        
        if (credentials) {
          setIsConnected(true);
          setConnectionDetails({
            apiKey: credentials.apiKey,
            accountId: credentials.accountId,
            lastSynced: credentials.lastSynced
          });
        }
      } catch (error) {
        console.error("Error loading HYROS connection:", error);
        toast({
          title: "Connection Error",
          description: "Failed to load HYROS connection details. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadConnection();
  }, [toast]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey) {
      setError("API key is required");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Connecting to HYROS with API key...");
      const result = await hyrosApi.connectHyros(apiKey);
      console.log("HYROS connection result:", result);
      
      if (result.success) {
        setIsConnected(true);
        setConnectionDetails({
          apiKey,
          accountId: result.accountId,
        });
        toast({
          title: "Connected to HYROS",
          description: "Your HYROS account has been connected successfully.",
        });
        
        // Refresh campaigns in case there are new ones from HYROS
        await fetchCampaigns();
      } else {
        setError(result.error || "Failed to connect to HYROS. Please check your API key.");
      }
    } catch (error) {
      console.error("Error connecting to HYROS:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
      toast({
        title: "Connection Error",
        description: "Failed to connect to HYROS. Please check your network connection and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      setError(null);
      
      const result = await hyrosApi.verifyApiKey(connectionDetails?.apiKey || '');
      
      if (result.success) {
        toast({
          title: "API Key Verified",
          description: "Your HYROS API key is valid.",
        });
      } else {
        setError(result.error || "Failed to verify API key. It may have expired or been revoked.");
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error verifying API key:", error);
      setError(error instanceof Error ? error.message : "An unexpected error occurred");
      toast({
        title: "Verification Error",
        description: "Failed to verify API key. Please check your network connection and try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect to HYROS</CardTitle>
          <CardDescription>
            Connect your HYROS account to import campaigns and lead data
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : isConnected ? (
            <div className="space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Connected to HYROS</AlertTitle>
                <AlertDescription className="text-green-700">
                  Your HYROS account is connected. You can now import campaigns and lead data.
                  {connectionDetails?.accountId && (
                    <div className="mt-2 text-sm">Account ID: {connectionDetails.accountId}</div>
                  )}
                  {connectionDetails?.lastSynced && (
                    <div className="text-sm">Last synced: {new Date(connectionDetails.lastSynced).toLocaleString()}</div>
                  )}
                </AlertDescription>
              </Alert>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline" 
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify API Key'
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="api-key">HYROS API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your HYROS API key"
                  autoComplete="off"
                />
                <p className="text-sm text-muted-foreground">
                  You can find your API key in your HYROS account settings.
                </p>
              </div>
              
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect to HYROS'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      
      {isConnected && <HyrosCampaigns />}
    </div>
  );
}
