
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, LinkIcon, AlertCircle } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const GoogleAdsIntegration = () => {
  const { accountConnections, updateAccountConnection } = useCampaign();
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [developerToken, setDeveloperToken] = useState<string>("");
  const [connectionProgress, setConnectionProgress] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "success" | "error">("idle");

  const googleAdsAccounts = accountConnections.filter(account => account.platform === "google");
  
  const handleConnect = async (accountId?: string) => {
    if (!accountId && (!customerId.trim() || !developerToken.trim())) {
      toast.error("Please enter a valid customer ID and developer token");
      return;
    }
    
    setIsConnecting(true);
    setConnectionProgress(0);
    setConnectionStatus("connecting");
    
    // Simulate API connection
    for (let i = 0; i <= 100; i += 10) {
      setConnectionProgress(i);
      // Add a delay to simulate network request
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Simulate successful connection
    if (Math.random() > 0.2) { // 80% success rate for demo
      if (accountId) {
        // Update existing account
        updateAccountConnection(accountId, {
          isConnected: true,
          lastSynced: new Date().toISOString()
        });
      } else {
        // This would normally call addAccountConnection, but that's handled in AccountsPage
        toast.success("Account ready to be added. Please go to Accounts page to complete setup.");
      }
      setConnectionStatus("success");
      toast.success("Successfully connected to Google Ads");
    } else {
      setConnectionStatus("error");
      toast.error("Failed to connect to Google Ads. Please check your credentials and try again.");
    }
    
    setIsConnecting(false);
  };
  
  const handleRefresh = async (accountId: string) => {
    setIsConnecting(true);
    
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    updateAccountConnection(accountId, {
      lastSynced: new Date().toISOString()
    });
    
    toast.success("Account data refreshed successfully");
    setIsConnecting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">Google Ads Integration</h1>
        <p className="text-muted-foreground">
          Connect your Google Ads accounts to automatically import campaign data
        </p>
      </div>
      
      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-800">
          This is a demonstration of the Google Ads integration UI. In a production environment, 
          this would connect to the Google Ads API using OAuth.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>Add New Google Ads Account</CardTitle>
          <CardDescription>
            Enter your Google Ads API credentials to connect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerId">Customer ID</Label>
            <Input
              id="customerId"
              placeholder="123-456-7890"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              disabled={isConnecting}
            />
            <p className="text-xs text-muted-foreground">
              Your 10-digit Google Ads customer ID (formatted as 123-456-7890)
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="developerToken">Developer Token</Label>
            <Input
              id="developerToken"
              type="password"
              placeholder="Enter your developer token"
              value={developerToken}
              onChange={(e) => setDeveloperToken(e.target.value)}
              disabled={isConnecting}
            />
            <p className="text-xs text-muted-foreground">
              Your Google Ads API developer token
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={() => handleConnect()} 
            disabled={isConnecting || !customerId.trim() || !developerToken.trim()}
            className="w-full"
          >
            {isConnecting ? "Connecting..." : "Connect to Google Ads"}
          </Button>
        </CardFooter>
        
        {connectionStatus === "connecting" && (
          <div className="px-6 pb-4">
            <Progress value={connectionProgress} className="h-2" />
            <p className="text-xs text-center mt-2 text-muted-foreground">
              Connecting to Google Ads...
            </p>
          </div>
        )}
      </Card>
      
      {googleAdsAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Google Ads Accounts</CardTitle>
            <CardDescription>
              Manage your connected Google Ads accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {googleAdsAccounts.map((account) => (
                <div 
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-md"
                >
                  <div>
                    <h3 className="font-medium">{account.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {account.isConnected ? "Connected" : "Not connected"} 
                      {account.lastSynced && ` • Last synced: ${new Date(account.lastSynced).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefresh(account.id)}
                      disabled={isConnecting || !account.isConnected}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    {!account.isConnected && (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(account.id)}
                        disabled={isConnecting}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GoogleAdsIntegration;
