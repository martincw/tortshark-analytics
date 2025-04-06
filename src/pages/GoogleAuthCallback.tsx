
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { handleGoogleAuthCallback, storeAuthTokens, parseOAuthError } from "@/services/googleAdsService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink, Copy, CopyCheck } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";

const GoogleAuthCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { addAccountConnection } = useCampaign();
  const exactRedirectUri = `${window.location.origin}/auth/google/callback`;

  useEffect(() => {
    const processAuth = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const code = queryParams.get("code");
        const errorParam = queryParams.get("error");
        const state = queryParams.get("state");
        
        // Collect debug info
        const debug = {
          url: window.location.href,
          query: Object.fromEntries(queryParams.entries()),
          origin: window.location.origin,
          redirectUri: exactRedirectUri,
          timestamp: new Date().toISOString()
        };
        setDebugInfo(debug);
        console.log("Auth callback debug info:", debug);
        
        if (errorParam) {
          setErrorCode(errorParam);
          const errorMessage = parseOAuthError(errorParam);
          setError(`Google authentication failed: ${errorMessage}`);
          setIsProcessing(false);
          return;
        }
        
        if (!code) {
          setError("Authorization code not found in the callback URL");
          setIsProcessing(false);
          return;
        }

        // Exchange code for tokens
        const tokens = await handleGoogleAuthCallback(code, state || undefined);
        
        if (!tokens) {
          setError("Failed to exchange authorization code for tokens");
          setIsProcessing(false);
          return;
        }

        // Store tokens securely
        storeAuthTokens(tokens);
        
        // Add any returned accounts to the account connections
        if (tokens.accounts && tokens.accounts.length > 0) {
          tokens.accounts.forEach(account => {
            addAccountConnection(account);
          });
          toast.success(`Connected to ${tokens.accounts.length} Google Ads account(s)`);
        } else {
          // If no accounts were returned, create a default one
          const defaultAccount = {
            name: "Google Ads Account",
            platform: "google" as const,
            isConnected: true,
            lastSynced: new Date().toISOString()
          };
          addAccountConnection(defaultAccount);
          toast.success("Successfully connected to Google Ads");
        }
        
        // Check if we were opened from a popup
        if (window.opener && !window.opener.closed) {
          // We're in a popup, so message the parent and close
          window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS" }, "*");
          window.close();
        } else {
          // Normal navigation
          navigate("/accounts");
        }
      } catch (error) {
        console.error("Error during auth callback:", error);
        const errorMessage = error instanceof Error 
          ? error.message 
          : "Authentication failed for unknown reasons";
          
        setError(errorMessage);
        setIsProcessing(false);
      }
    };

    processAuth();
  }, [location.search, navigate, addAccountConnection, exactRedirectUri]);

  useEffect(() => {
    // Add event listener to handle when popup is closed
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
        window.location.reload();
      }
    };
    
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, []);

  const handleContinue = () => {
    if (error) {
      toast.error("Failed to connect Google Ads, but you can still create campaigns manually");
    }
    navigate("/accounts");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(exactRedirectUri).then(() => {
      setCopied(true);
      toast.success("Redirect URI copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
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
          
          {errorCode === "redirect_uri_mismatch" && (
            <div className="bg-warning-foreground/10 p-4 rounded-md border border-warning-DEFAULT">
              <h3 className="text-sm font-medium mb-2 text-warning-DEFAULT">Redirect URI Mismatch Error</h3>
              <p className="text-sm mb-3">
                The redirect URI in your Google Cloud Console doesn't match the one this app is using.
              </p>
              
              <div className="bg-secondary/20 p-3 rounded-md mb-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-mono overflow-x-auto">{exactRedirectUri}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={copyToClipboard}
                    className="ml-2 h-8 px-2"
                  >
                    {copied ? <CopyCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <p>To fix this issue:</p>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>Copy the exact redirect URI above</li>
                  <li>Go to your Google Cloud Console</li>
                  <li>Navigate to "APIs & Services" → "Credentials"</li>
                  <li>Edit your OAuth 2.0 Client ID</li>
                  <li>Add or update the redirect URI to match exactly</li>
                  <li>Save your changes and try again</li>
                </ol>
              </div>
            </div>
          )}
          
          <div className="bg-secondary/20 p-3 rounded-md">
            <h3 className="text-sm font-medium mb-2">General troubleshooting:</h3>
            <ul className="text-sm space-y-2">
              <li>• Make sure your Google project has OAuth configured properly</li>
              <li>• Check that <code>{exactRedirectUri}</code> is added as an authorized redirect URI in your Google console</li>
              <li>• Verify that your Google project has the Google Ads API enabled</li>
              <li>• Ensure you're using a Google account with access to Google Ads</li>
              <li>• Confirm that you've selected the read-only scope for Google Ads API</li>
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
