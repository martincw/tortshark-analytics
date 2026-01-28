
import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LinkIcon, CheckCircle2, XCircle, LogIn, AlertCircle, Building2, Map } from "lucide-react";
import { toast } from 'sonner';
import GoogleAdsCampaigns from './GoogleAdsCampaigns';
import GoogleAdsAccountSelector from '@/components/integrations/GoogleAdsAccountSelector';
import { initiateGoogleAdsConnection, validateGoogleAdsConnection } from '@/services/googleAdsConnection';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const GoogleAdsIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [activeTab, setActiveTab] = useState('connect');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [hasConnectedAccounts, setHasConnectedAccounts] = useState(false);

  const { session, isLoading: isAuthLoading } = useAuth();

  const checkConnectionStatus = useCallback(async () => {
    setIsChecking(true);
    setConnectionError(null);

    try {
      const isValid = await validateGoogleAdsConnection();
      setIsConnected(isValid);

      if (isValid) {
        // Check if any accounts are connected
        const { data: accounts } = await supabase
          .from('account_connections')
          .select('id')
          .eq('platform', 'google_ads')
          .eq('is_connected', true)
          .limit(1);

        setHasConnectedAccounts(accounts && accounts.length > 0);

        // Navigate to appropriate tab based on state
        if (accounts && accounts.length > 0) {
          setActiveTab('campaigns');
        } else {
          setActiveTab('accounts');
        }
      }
    } catch (error) {
      console.error("Error validating Google Ads connection:", error);
      const message = error instanceof Error ? error.message : "Failed to verify connection status";
      setConnectionError(message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Re-check once auth is ready (important after OAuth redirects)
  useEffect(() => {
    if (isAuthLoading) return;
    if (!session) {
      setIsConnected(false);
      setIsChecking(false);
      return;
    }

    checkConnectionStatus();
  }, [isAuthLoading, session?.access_token, checkConnectionStatus]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setConnectionError(null);
    
    try {
      const result = await initiateGoogleAdsConnection();
      
      if (result.error) {
        setConnectionError(result.error);
        return;
      }
      
        if (result.url) {
          // Store current path in localStorage before redirecting
          localStorage.setItem('redirectAfterAuth', '/data-sources?source=googleads');

          // Redirect to Google OAuth URL
          window.location.href = result.url;
        }
    } catch (error) {
      console.error("Failed to initiate Google Ads connection:", error);
      setConnectionError("Failed to connect to Google Ads");
      toast.error("Failed to start Google Ads connection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountsConnected = () => {
    setHasConnectedAccounts(true);
    setActiveTab('campaigns');
    toast.success('Accounts connected! Now you can map campaigns.');
  };

  const handleDisconnect = async () => {
    try {
      // Delete the tokens
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('google_ads_tokens')
          .delete()
          .eq('user_id', user.id);
        
        // Disconnect all Google Ads accounts
        await supabase
          .from('account_connections')
          .update({ is_connected: false })
          .eq('user_id', user.id)
          .eq('platform', 'google_ads');
      }
      
      toast.info('Google Ads disconnected');
      setIsConnected(false);
      setHasConnectedAccounts(false);
      setActiveTab('connect');
    } catch (error) {
      toast.error("Failed to disconnect Google Ads");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LinkIcon className="mr-2 h-5 w-5" />
            Google Ads Integration
          </CardTitle>
          <CardDescription>
            Connect your Google Ads accounts to sync ad performance data automatically
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isChecking ? (
            <div className="flex justify-center p-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="connect">
                  Connection
                </TabsTrigger>
                <TabsTrigger value="accounts" disabled={!isConnected}>
                  <Building2 className="mr-1 h-4 w-4" />
                  Accounts
                </TabsTrigger>
                <TabsTrigger value="campaigns" disabled={!isConnected || !hasConnectedAccounts}>
                  <Map className="mr-1 h-4 w-4" />
                  Campaigns
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="connect">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">Connection Status</div>
                      <div className="flex items-center text-sm">
                        {isConnected ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                            <span className="text-green-600">Connected to Google</span>
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

                  {connectionError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{connectionError}</AlertDescription>
                    </Alert>
                  )}

                  {!isConnected && (
                    <div className="space-y-4 mt-4">
                      <div className="text-sm text-muted-foreground mb-4">
                        To connect with Google Ads, you need to authorize access to your account.
                        This will allow TortShark to retrieve campaign data from your Google Ads account.
                      </div>
                      <Button 
                        onClick={handleGoogleLogin} 
                        disabled={isLoading}
                        className="w-full justify-center"
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        {isLoading ? "Connecting..." : "Login with Google"}
                      </Button>
                    </div>
                  )}

                  {isConnected && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-800">
                        ✓ Google account connected. Go to the <strong>Accounts</strong> tab to select which Google Ads accounts to connect.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="accounts">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select the Google Ads accounts you want to connect. You can connect multiple accounts.
                  </p>
                  <GoogleAdsAccountSelector onAccountsConnected={handleAccountsConnected} />
                </div>
              </TabsContent>
              
              <TabsContent value="campaigns">
                <GoogleAdsCampaigns />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {isConnected && (
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect Google Ads
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default GoogleAdsIntegration;
