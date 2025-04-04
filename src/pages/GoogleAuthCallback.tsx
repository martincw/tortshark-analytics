
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { handleGoogleAuthCallback, storeAuthTokens } from "@/services/googleAdsService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";

const GoogleAuthCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const processAuth = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get("code");
        const errorMsg = queryParams.get("error");
        
        // Collect debug info
        const debug = {
          url: window.location.href,
          query: Object.fromEntries(queryParams.entries()),
          origin: window.location.origin,
          redirectUri: window.location.origin + "/auth/google/callback"
        };
        setDebugInfo(debug);
        console.log("Auth callback debug info:", debug);
        
        if (errorMsg) {
          setError(`Google returned an error: ${errorMsg}`);
          setIsProcessing(false);
          return;
        }
        
        if (!code) {
          setError("Authorization code not found");
          setIsProcessing(false);
          return;
        }

        // Exchange code for tokens
        const tokens = await handleGoogleAuthCallback(code);
        
        if (!tokens) {
          setError("Failed to authenticate with Google");
          setIsProcessing(false);
          return;
        }

        // Store tokens securely
        storeAuthTokens(tokens);
        
        toast.success("Successfully connected to Google Ads");
        navigate("/accounts");
      } catch (error) {
        console.error("Error during auth callback:", error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Authentication failed";
          
        setError(errorMessage);
        setIsProcessing(false);
      }
    };

    processAuth();
  }, [location.search, navigate]);

  const handleContinue = () => {
    if (error) {
      toast.error("Failed to connect Google Ads, but you can still create campaigns manually");
    }
    navigate("/accounts");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {isProcessing ? (
        <>
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <h1 className="text-2xl font-bold">Processing Google Authentication</h1>
          <p className="text-muted-foreground mt-2">Please wait while we connect your account...</p>
        </>
      ) : error ? (
        <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-error-DEFAULT">
            <AlertCircle className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Authentication Error</h1>
          </div>
          <p className="text-muted-foreground">{error}</p>
          
          <div className="bg-secondary/20 p-3 rounded-md">
            <h3 className="text-sm font-medium mb-2">Possible solutions:</h3>
            <ul className="text-sm space-y-2">
              <li>• Make sure your Google project has OAuth configured properly</li>
              <li>• Check that <code>{window.location.origin}/auth/google/callback</code> is added as an authorized redirect URI in your Google console</li>
              <li>• Verify that your Google project has the Google Ads API enabled</li>
            </ul>
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 text-sm flex items-center gap-1 mt-2"
            >
              Go to Google API Console <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          
          <div className="pt-4">
            <Button onClick={handleContinue} className="w-full">
              Continue to Accounts Page
            </Button>
            <p className="text-center mt-4 text-sm text-muted-foreground">
              You can still create and manage campaigns manually
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default GoogleAuthCallback;
