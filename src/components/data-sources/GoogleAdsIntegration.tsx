
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, LinkIcon, CheckCircle2, XCircle, LogIn } from "lucide-react";
import { toast } from 'sonner';
import GoogleAdsCampaigns from './GoogleAdsCampaigns';

const GoogleAdsIntegration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('connect');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    // Simulate OAuth login (frontend only)
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
      setActiveTab('campaigns');
      toast.success('Successfully connected to Google Ads');
      
      // In a real implementation, we would redirect to Google OAuth flow
      // and handle the callback to get the access token
    }, 1500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setActiveTab('connect');
    toast.info('Google Ads disconnected');
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
            Connect your Google Ads account to sync ad performance data automatically
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
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Label htmlFor="googleads-status">Connection Status</Label>
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

                {!isConnected && (
                  <div className="space-y-4 mt-4">
                    <div className="text-sm text-muted-foreground mb-4">
                      To connect with Google Ads, you need to authorize access to your account.
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
              </div>
            </TabsContent>
            
            <TabsContent value="campaigns">
              <GoogleAdsCampaigns />
            </TabsContent>
          </Tabs>
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
