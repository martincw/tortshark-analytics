
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { initiateGoogleAdsConnection, validateGoogleAdsConnection } from "@/services/googleAdsConnection";
import { useAuth } from "@/contexts/AuthContext";

const GoogleAdsConnection: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkConnection = async () => {
      if (user) {
        try {
          const connected = await validateGoogleAdsConnection();
          setIsConnected(connected);
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };

    checkConnection();
  }, [user]);

  const handleConnect = async () => {
    if (!user) {
      setConnectionError("Please sign in first");
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const { url } = await initiateGoogleAdsConnection();
      window.location.href = url;
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : "Connection failed");
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
