
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Link2, Unlink, RefreshCw, Mail } from "lucide-react";
import { 
  initiateGoogleAuth, 
  isGoogleAuthValid, 
  revokeGoogleAccess,
  refreshGoogleToken,
  getGoogleAdsCredentials
} from "@/services/googleAdsService";
import { useNavigate } from "react-router-dom";

const GoogleAdsIntegration: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isDisconnecting, setIsDisconnecting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check if Google Ads is already connected
  useEffect(() => {
    const checkConnection = async () => {
      setIsChecking(true);
      try {
        const connected = await isGoogleAuthValid();
        setIsConnected(connected);
        
        if (connected) {
          const credentials = await getGoogleAdsCredentials();
          setUserEmail(credentials?.userEmail || null);
        }
      } catch (error) {
        console.error("Error checking Google connection:", error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkConnection();
  }, []);

  // Handle connecting to Google Ads
  const handleConnect = async () => {
    try {
      await initiateGoogleAuth();
    } catch (error) {
      console.error("Error initiating Google auth:", error);
      toast.error("Failed to connect to Google Ads");
    }
  };

  // Handle disconnecting from Google Ads
  const handleDisconnect = async () => {
    if (window.confirm("Are you sure you want to disconnect from Google Ads?")) {
      setIsDisconnecting(true);
      try {
        const success = await revokeGoogleAccess();
        if (success) {
          setIsConnected(false);
          setUserEmail(null);
          toast.success("Successfully disconnected from Google Ads");
        } else {
          toast.error("Failed to disconnect from Google Ads");
        }
      } catch (error) {
        console.error("Error disconnecting from Google Ads:", error);
        toast.error("Failed to disconnect from Google Ads");
      } finally {
        setIsDisconnecting(false);
      }
    }
  };

  // Handle refreshing the token
  const handleRefreshToken = async () => {
    setIsRefreshing(true);
    try {
      const success = await refreshGoogleToken();
      if (success) {
        toast.success("Successfully refreshed Google Ads token");
      } else {
        toast.error("Failed to refresh Google Ads token");
      }
    } catch (error) {
      console.error("Error refreshing Google Ads token:", error);
      toast.error("Failed to refresh Google Ads token");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle navigating to accounts page
  const handleGoToAccounts = () => {
    navigate("/accounts");
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src="/placeholder.svg" 
                alt="Google Ads Logo" 
                className="w-6 h-6"
              />
              Google Ads
            </div>
            {isConnected && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-muted text-success-DEFAULT">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Connect to Google Ads to import campaign data and track performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isChecking ? (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mr-2"></div>
              <span>Checking connection status...</span>
            </div>
          ) : isConnected ? (
            <div className="space-y-4">
              <Alert className="bg-success-muted border-success-muted">
                <CheckCircle2 className="h-4 w-4 text-success-DEFAULT" />
                <AlertDescription className="text-success-DEFAULT">
                  Your Google Ads account is connected successfully. You can now add ad accounts and import campaign data.
                </AlertDescription>
              </Alert>
              
              {userEmail && (
                <div className="flex items-center gap-2 text-sm bg-muted/60 p-3 rounded-md">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>Connected with: <span className="font-medium">{userEmail}</span></span>
                </div>
              )}
              
              <div className="flex flex-col space-y-2">
                <h4 className="text-sm font-medium">Connected Services:</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground pl-2">
                  <li>Google Ads API Access</li>
                  <li>Campaign Management</li>
                  <li>Performance Metrics</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Connect your Google Ads account to import campaign data, track performance, and manage ads directly.
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted/50 rounded-md p-4 text-sm">
                <h4 className="font-medium mb-2">Why connect Google Ads?</h4>
                <ul className="list-disc list-inside text-muted-foreground pl-2 space-y-1">
                  <li>Import campaigns automatically</li>
                  <li>Track campaign performance metrics</li>
                  <li>Monitor ad spend and ROI</li>
                  <li>Access historical data</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {isConnected ? (
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                onClick={handleGoToAccounts}
                className="flex-1"
              >
                <Link2 className="mr-2 h-4 w-4" />
                Manage Ad Accounts
              </Button>
              <Button
                variant="outline"
                onClick={handleRefreshToken}
                disabled={isRefreshing}
                className="flex-1"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Token'}
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex-1"
              >
                <Unlink className="mr-2 h-4 w-4" />
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnect} className="w-full">
              <Link2 className="mr-2 h-4 w-4" />
              Connect to Google Ads
            </Button>
          )}
        </CardFooter>
      </Card>

      <div className="text-sm text-muted-foreground border-t pt-6">
        <h4 className="font-medium mb-2">About Google Ads API Integration</h4>
        <p className="mb-2">
          This integration uses OAuth 2.0 to securely connect to your Google Ads account. We only request access to the necessary permissions needed to import and analyze your campaign data.
        </p>
        <p>
          Your credentials are stored securely and you can revoke access at any time. No personal information is collected during this process.
        </p>
      </div>
    </div>
  );
};

export default GoogleAdsIntegration;
