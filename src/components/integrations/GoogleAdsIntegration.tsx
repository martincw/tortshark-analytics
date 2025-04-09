
import React, { useState, useEffect } from "react";
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
import { AccountConnection } from "@/types/campaign";
import GoogleSignIn from "./GoogleSignIn";
import { getGoogleAdsCredentials, revokeGoogleAccess } from "@/services/googleAdsService";

const GoogleAdsIntegration = () => {
  const { accountConnections, updateAccountConnection, addAccountConnection } = useCampaign();
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [developerToken, setDeveloperToken] = useState<string>("Ngh3IukgQ3ovdkH3M0smUg");
  const [connectionProgress, setConnectionProgress] = useState<number>(0);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "connecting" | "success" | "error">("idle");
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState<boolean>(false);

  const googleAdsAccounts = accountConnections.filter(account => account.platform === "google");
  
  // Check for existing Google auth on component mount
  useEffect(() => {
    const credentials = getGoogleAdsCredentials();
    if (credentials) {
      setCustomerId(credentials.customerId);
      setDeveloperToken(credentials.developerToken);
    }
  }, []);
  
  const connectToGoogleAds = async (customerId: string, developerToken: string): Promise<boolean> => {
    // In a real implementation, this would verify the Google Ads API connection
    try {
      // Simulate API request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // This would be replaced with real API validation
      if (!customerId.match(/\d{3}-\d{3}-\d{4}/) || !developerToken || developerToken.length < 8) {
        throw new Error("Invalid credentials");
      }
      
      return true;
    } catch (error) {
      console.error("Google Ads API connection error:", error);
      return false;
    }
  };
  
  const handleConnect = async (accountId?: string) => {
    if (!accountId && (!customerId.trim() || !developerToken.trim())) {
      toast.error("Please enter a valid customer ID and developer token");
      return;
    }
    
    setIsConnecting(true);
    setConnectionProgress(0);
    setConnectionStatus("connecting");
    
    try {
      // Increment progress
      for (let i = 0; i <= 80; i += 20) {
        setConnectionProgress(i);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      let success = false;
      
      if (accountId) {
        // Update existing account
        const account = accountConnections.find(acc => acc.id === accountId);
        if (account && account.credentials) {
          success = await connectToGoogleAds(
            account.credentials.customerId || "", 
            account.credentials.developerToken || ""
          );
        }
      } else {
        // Connect new account
        success = await connectToGoogleAds(customerId, developerToken);
      }
      
      setConnectionProgress(100);
      
      if (success) {
        if (accountId) {
          // Update existing account
          updateAccountConnection(accountId, {
            isConnected: true,
            lastSynced: new Date().toISOString()
          });
        } else {
          // Add new account connection
          const newAccount: AccountConnection = {
            id: `google-${Date.now()}`,
            name: `Google Ads (${customerId})`,
            platform: "google",
            isConnected: true,
            lastSynced: new Date().toISOString(),
            credentials: {
              customerId,
              developerToken
            }
          };
          addAccountConnection(newAccount);
          setCustomerId("");
          setDeveloperToken("");
        }
        setConnectionStatus("success");
        toast.success("Successfully connected to Google Ads");
      } else {
        setConnectionStatus("error");
        toast.error("Failed to connect to Google Ads. Please check your credentials and try again.");
      }
    } catch (error) {
      setConnectionStatus("error");
      toast.error("An error occurred while connecting to Google Ads");
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleRefresh = async (accountId: string) => {
    setIsConnecting(true);
    
    try {
      // In a real implementation, this would fetch fresh data from Google Ads API
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      updateAccountConnection(accountId, {
        lastSynced: new Date().toISOString()
      });
      
      toast.success("Account data refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh account data");
      console.error("Refresh error:", error);
    } finally {
      setIsConnecting(false);
    }
  };
  
  const handleDisconnect = async (accountId: string) => {
    try {
      await revokeGoogleAccess();
      
      updateAccountConnection(accountId, {
        isConnected: false
      });
      
      toast.success("Account disconnected successfully");
    } catch (error) {
      toast.error("Failed to disconnect account");
      console.error("Disconnect error:", error);
    }
  };
  
  const validateCustomerId = (id: string) => {
    return id.match(/\d{3}-\d{3}-\d{4}/);
  };

  const handleGoogleSignInSuccess = (credentials: { customerId: string; developerToken: string }) => {
    setCustomerId(credentials.customerId);
    setDeveloperToken(credentials.developerToken);
    handleConnect();
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
          Sign in with your Google account to automatically connect to your Google Ads account
        </AlertDescription>
      </Alert>
      
      {!showManualEntry ? (
        <>
          <GoogleSignIn 
            onSuccess={handleGoogleSignInSuccess} 
            isConnecting={isConnecting}
            connectionProgress={connectionProgress}
          />
          
          <div className="text-center">
            <Button 
              variant="link" 
              onClick={() => setShowManualEntry(true)}
              className="text-sm"
            >
              Or enter credentials manually
            </Button>
          </div>
        </>
      ) : (
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
                className={!validateCustomerId(customerId) && customerId ? "border-red-300" : ""}
              />
              {!validateCustomerId(customerId) && customerId && (
                <p className="text-xs text-red-500">
                  Invalid format. Use format: 123-456-7890
                </p>
              )}
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
                Your Google Ads API developer token has been pre-filled for convenience
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button 
              onClick={() => handleConnect()} 
              disabled={isConnecting || !customerId.trim() || !developerToken.trim() || !validateCustomerId(customerId)}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect to Google Ads"}
            </Button>
            
            <Button 
              variant="link" 
              onClick={() => setShowManualEntry(false)}
              className="text-sm"
            >
              Use Google Sign-In instead
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
      )}
      
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
                    {account.isConnected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefresh(account.id)}
                          disabled={isConnecting}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Refresh
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(account.id)}
                          disabled={isConnecting}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
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
