
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, LinkIcon, CheckCircle2, XCircle } from "lucide-react";
import { toast } from 'sonner';
import ClickMagickCampaigns from './ClickMagickCampaigns';

const ClickMagickIntegration = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('connect');

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your ClickMagick API key');
      return;
    }

    if (!apiUrl.trim()) {
      toast.error('Please enter your ClickMagick API URL');
      return;
    }

    setIsLoading(true);
    
    // Simulate API connection (frontend only)
    setTimeout(() => {
      setIsConnected(true);
      setIsLoading(false);
      setActiveTab('campaigns');
      toast.success('Successfully connected to ClickMagick');
      
      // In a real implementation, we would store the API key securely
      // and make actual API calls to validate the connection
    }, 1500);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setApiKey('');
    setApiUrl('');
    setActiveTab('connect');
    toast.info('ClickMagick disconnected');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LinkIcon className="mr-2 h-5 w-5" />
            ClickMagick Integration
          </CardTitle>
          <CardDescription>
            Connect your ClickMagick account to sync tracking and conversion data
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
                    <Label htmlFor="clickmagick-status">Connection Status</Label>
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="clickmagick-api-key">API Key</Label>
                      <Input
                        id="clickmagick-api-key"
                        placeholder="Enter your ClickMagick API key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clickmagick-api-url">API URL</Label>
                      <Input
                        id="clickmagick-api-url"
                        placeholder="Enter your ClickMagick domain (e.g., yourdomain.clickmagick.com)"
                        value={apiUrl}
                        onChange={(e) => setApiUrl(e.target.value)}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      You can find your API credentials in your ClickMagick account settings.
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="campaigns">
              <ClickMagickCampaigns />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          {isConnected ? (
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect ClickMagick
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isLoading}>
              {isLoading ? "Connecting..." : "Connect ClickMagick"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default ClickMagickIntegration;
