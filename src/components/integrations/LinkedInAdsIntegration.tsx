
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
import { AlertCircle, RefreshCw, LinkIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AccountConnection } from "@/types/campaign";
import { useCampaign } from "@/contexts/CampaignContext";

const LinkedInAdsIntegration = () => {
  const { accountConnections, updateAccountConnection, addAccountConnection } = useCampaign();
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionProgress, setConnectionProgress] = useState<number>(0);
  const linkedInAccounts = accountConnections.filter(account => account.platform === "linkedin");

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionProgress(0);
    
    try {
      // Simulate connection process
      for (let i = 0; i <= 80; i += 20) {
        setConnectionProgress(i);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // In a real implementation, this would redirect to LinkedIn OAuth
      toast.error("LinkedIn integration requires LinkedIn Marketing Developer Platform credentials. This is a demonstration only.");
      setConnectionProgress(0);
    } catch (error) {
      toast.error("Failed to initiate LinkedIn connection");
      console.error("LinkedIn connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">LinkedIn Ads Integration</h1>
        <p className="text-muted-foreground">
          Connect your LinkedIn Ads accounts to import campaign data
        </p>
      </div>
      
      <Alert variant="default" className="bg-muted border-muted-foreground/30">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          LinkedIn Ads integration requires LinkedIn Marketing Developer Platform credentials.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>Connect with LinkedIn</CardTitle>
          <CardDescription>Sign in with your LinkedIn account to connect</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? 
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Connecting...</> : 
              <><LinkIcon className="h-4 w-4 mr-2" /> Sign in with LinkedIn</>
            }
          </Button>
        </CardContent>
      </Card>
      
      {linkedInAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected LinkedIn Accounts</CardTitle>
            <CardDescription>
              Manage your connected LinkedIn Ads accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {linkedInAccounts.map((account) => (
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
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LinkedInAdsIntegration;
