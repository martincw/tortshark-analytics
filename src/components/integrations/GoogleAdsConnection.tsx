
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { initiateGoogleAdsConnection, validateGoogleAdsConnection } from "@/services/googleAdsConnection";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const GoogleAdsConnection: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, session } = useAuth(); // Get both user and session

  useEffect(() => {
    const checkConnection = async () => {
      if (!session) return; // Check for session instead of just user
      
      try {
        const connected = await validateGoogleAdsConnection();
        setIsConnected(connected);
      } catch (error) {
        console.error("Error checking connection:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error checking connection";
        setConnectionError(errorMessage);
        toast.error(errorMessage);
      }
    };

    checkConnection();
  }, [session]); // Depend on session instead of user

  const handleConnect = async () => {
    if (!session) { // Check for session instead of just user
      const errorMsg = "Please sign in first";
      setConnectionError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const { url, error } = await initiateGoogleAdsConnection();
      if (error) {
        throw new Error(error);
      }
      if (!url) {
        throw new Error("No authentication URL received");
      }
      
      // Store the current URL for redirect after auth
      localStorage.setItem('preAuthPath', '/integrations');
      
      // Redirect to Google OAuth
      window.location.href = url;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to connect to Google Ads";
      setConnectionError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Ads Connection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {connectionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{connectionError}</AlertDescription>
          </Alert>
        )}

        <p className="text-muted-foreground">
          Connect your Google Ads account to import campaign data and track performance.
        </p>

        <Button 
          onClick={handleConnect}
          disabled={isConnecting || isConnected}
          className="w-full"
        >
          {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Connect Google Ads"}
        </Button>

        {isConnected && (
          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-800">
              Your Google Ads account is successfully connected.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleAdsConnection;
