import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { handleGoogleAuthCallback, storeAuthTokens, parseOAuthError } from "@/services/googleAdsService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink, Copy, CopyCheck, CheckCircle } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";

const GoogleAuthCallback = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [copied, setCopied] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
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
          
          // If we're in a popup and there's an error, try to communicate with parent
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({ 
                type: "GOOGLE_AUTH_ERROR", 
                error: errorParam 
              }, "*");
            } catch (e) {
              console.error("Failed to communicate with parent window:", e);
            }
          }
          
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
        
        if (tokens.accounts && tokens.accounts.length > 0) {
          setAccounts(tokens.accounts);
          
          // Add returned accounts to context
          tokens.accounts.forEach(account => {
            addAccountConnection(account);
          });
          
          console.log(`Added ${tokens.accounts.length} Google Ads accounts`);
          toast.success(`Found ${tokens.accounts.length} Google Ads accounts`);
        } else {
          console.warn("No Google Ads accounts were returned");
          toast.warning("No Google Ads accounts were found");
          
          // Create a default account as fallback
          const defaultAccount = {
            id: "ga-" + Date.now(),
            name: "Default Google Ads Account",
            platform: "google" as const,
            isConnected: true,
            lastSynced: new Date().toISOString()
          };
          addAccountConnection(defaultAccount);
        }
        
        setSuccess(true);
        
        // Check if we were opened from a popup
        if (window.opener && !window.opener.closed) {
          // We're in a popup, so message the parent and close
          try {
            window.opener.postMessage({ 
              type: "GOOGLE_AUTH_SUCCESS",
              accounts: tokens.accounts || []
            }, "*");
            console.log("Sent success message to parent window with accounts:", tokens.accounts);
            // Close after a short delay to make sure the message is sent
            setTimeout(() => window.close(), 1000);
          } catch (e) {
            console.error("Failed to communicate with parent window:", e);
          }
        } else {
          // Normal navigation - delay to show success message
          setTimeout(() => {
            navigate("/accounts");
          }, 2000);
        }
        
        setIsProcessing(false);
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
        console.log("Received auth success message with accounts:", event.data.accounts);
        if (event.data.accounts) {
          setAccounts(event.data.accounts);
        }
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

  const handleRetryAuth = () => {
    // Redirect back to accounts page which will start the OAuth flow again
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
      ) : success ? (
        <div className="w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg space-y-4 text-center">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-success-DEFAULT" />
          </div>
          <h1 className="text-2xl font-bold">Authentication Successful!</h1>
          <p className="text-muted-foreground mt-2">
            Your Google Ads account has been connected successfully.
          </p>
          
          {accounts.length > 0 ? (
            <div className="mt-4 p-4 bg-secondary/20 rounded-md text-left">
              <h3 className="font-medium text-sm mb-2">Connected Accounts ({accounts.length}):</h3>
              <ul className="space-y-2">
                {accounts.map((account, index) => (
                  <li key={account.id} className="text-sm flex items-center">
                    <CheckCircle className="h-3 w-3 mr-2 text-success-DEFAULT" />
                    {account.name}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-warning-foreground text-sm mt-2">
              No Google Ads accounts were found
            </p>
          )}
          
          <Button 
            onClick={() => navigate("/accounts")} 
            className="w-full mt-4"
          >
            Go to Accounts Page
          </Button>
        </div>
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
                
                <Button
                  className="mt-4 w-full"
                  onClick={handleRetryAuth}
                >
                  Try Again
                </Button>
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
              <li>• Confirm that you've selected the correct scope for Google Ads API</li>
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
