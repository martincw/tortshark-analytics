
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { initiateGoogleAdsConnection, processOAuthCallback, validateGoogleAdsConnection } from "@/services/googleAdsConnection";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const GoogleAdsConnection: React.FC = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { session } = useAuth();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkConnection = async () => {
      if (!session) return;
      
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
  }, [session]);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code');
      if (!code) return;

      setIsConnecting(true);
      setConnectionError(null);

      try {
        const success = await processOAuthCallback(code);
        if (success) {
          setIsConnected(true);
          toast.success("Successfully connected to Google Ads");
        } else {
          throw new Error("Failed to complete connection");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to complete Google Ads connection";
        setConnectionError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setIsConnecting(false);
      }
    };

    handleOAuthCallback();
  }, [searchParams]);

  const handleConnect = async () => {
    if (!session) {
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
