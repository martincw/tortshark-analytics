
import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LinkIcon, RefreshCw } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { AccountConnection } from "@/types/campaign";

const LinkedInAdsIntegration = () => {
  const { accountConnections, addAccountConnection } = useCampaign();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);
  
  // Fixed type check - using array.filter and checking platform properly
  const linkedInAccounts = accountConnections.filter(
    account => account.platform === "linkedin"
  );
  
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionProgress(0);
    
    try {
      // Simulate connection process with LinkedIn API
      for (let i = 0; i <= 100; i += 20) {
        setConnectionProgress(i);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Mock successful connection
      const newAccount: AccountConnection = {
        id: `linkedin-${Date.now()}`,
        name: "LinkedIn Ads Account",
        platform: "linkedin", // Now using the correct platform type
        isConnected: true,
        lastSynced: new Date().toISOString(),
      };
      
      addAccountConnection(newAccount);
      toast.success("Successfully connected to LinkedIn Ads");
    } catch (error) {
      toast.error("Failed to connect to LinkedIn Ads");
      console.error("LinkedIn connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  if (linkedInAccounts.length > 0) {
    return (
      <div className="space-y-6">
        <p>You have already connected your LinkedIn Ads account.</p>
        <Button onClick={() => toast.info("Refresh functionality coming soon")}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh LinkedIn Data
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connect with LinkedIn</CardTitle>
          <CardDescription>Sign in with your LinkedIn account to connect your ads</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Connecting...</>
            ) : (
              <><LinkIcon className="h-4 w-4 mr-2" /> Sign in with LinkedIn</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default LinkedInAdsIntegration;
