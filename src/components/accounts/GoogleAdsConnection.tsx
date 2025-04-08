import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  CheckCircle, 
  Link, 
  AlertCircle, 
  PlusCircle, 
  ExternalLink, 
  Copy,
  CopyCheck,
  XCircle
} from "lucide-react";
import { 
  getGoogleAuthUrl, 
  clearAuthTokens, 
  getStoredAuthTokens,
  openGoogleAuthPopup
} from "@/services/googleAdsService";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface GoogleAdsConnectionProps {
  isAuthenticated: boolean;
  newAccountName: string;
  setNewAccountName: (value: string) => void;
  newAccountPlatform: "google" | "youtube";
  setNewAccountPlatform: (value: "google" | "youtube") => void;
  handleAddAccount: () => void;
  isLoading: boolean;
}

export const GoogleAdsConnection = ({
  isAuthenticated,
  newAccountName,
  setNewAccountName,
  newAccountPlatform,
  setNewAccountPlatform,
  handleAddAccount,
  isLoading,
}: GoogleAdsConnectionProps) => {
  const [configError, setConfigError] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [showUriDialog, setShowUriDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [directUrl, setDirectUrl] = useState("");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showConnectionError, setShowConnectionError] = useState(false);
  const [connectionErrorMessage, setConnectionErrorMessage] = useState("");
  const [developerTokenStatus, setDeveloperTokenStatus] = useState<"unknown" | "missing" | "present">("unknown");
  const exactRedirectUri = `${window.location.origin}/auth/google/callback`;
  
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      setConfigError(`OAuth error: ${error}`);
      
      if (error === 'redirect_uri_mismatch') {
        setShowUriDialog(true);
        toast.error("Redirect URI mismatch detected. Please update your Google Cloud Console settings.");
      } else {
        toast.error(`Google OAuth error: ${error}`);
      }
    }
    
    if (isAuthenticated) {
      const storedTokenError = localStorage.getItem("googleAdsDeveloperTokenError");
      if (storedTokenError) {
        setDeveloperTokenStatus("missing");
        setConfigError("Google Ads Developer Token is missing or invalid. Please check Supabase Edge Function secrets.");
        toast.error("Google Ads Developer Token is missing. This is required to fetch real accounts.");
      } else {
        setDeveloperTokenStatus("present");
      }
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      console.log("Received message from popup:", event.data);
      
      if (event.data.type === "GOOGLE_AUTH_SUCCESS") {
        console.log("Auth success event from popup");
        setIsAuthenticating(false);
        setShowConnectionError(false);
        toast.success("Successfully connected to Google Ads");
        setTimeout(() => window.location.reload(), 1000);
      } else if (event.data.type === "GOOGLE_AUTH_ERROR") {
        setIsAuthenticating(false);
        setShowConnectionError(true);
        setConnectionErrorMessage(event.data.error || "Unknown error");
        toast.error(`Authentication error: ${event.data.error || "Unknown error"}`);
      }
    };
    
    window.addEventListener("message", handleAuthMessage);
    return () => window.removeEventListener("message", handleAuthMessage);
  }, []);
  
  useEffect(() => {
    const handleAuthSuccess = () => {
      console.log("Auth success event from storage");
      setIsAuthenticating(false);
      setShowConnectionError(false);
    };
    
    const handleAuthFailure = (event: CustomEvent) => {
      console.log("Auth failure event:", event.detail);
      setIsAuthenticating(false);
      setShowConnectionError(true);
      setConnectionErrorMessage(event.detail?.message || "Authentication was not completed");
      toast.error(event.detail?.message || "Authentication was not completed");
    };
    
    window.addEventListener('googleAuthSuccess', handleAuthSuccess);
    window.addEventListener('googleAuthFailure', handleAuthFailure as EventListener);
    
    return () => {
      window.removeEventListener('googleAuthSuccess', handleAuthSuccess);
      window.removeEventListener('googleAuthFailure', handleAuthFailure as EventListener);
    };
  }, []);
  
  const handleConnectGoogle = () => {
    try {
      setShowConnectionError(false);
      setConnectionErrorMessage("");
      
      console.log("Current origin:", window.location.origin);
      console.log("Redirect URI should be:", exactRedirectUri);
      
      try {
        const url = getGoogleAuthUrl();
        setDirectUrl(url);
      } catch (error) {
        console.error("Failed to generate OAuth URL:", error);
      }
      
      setShowUriDialog(true);
    } catch (error) {
      console.error("Error initiating Google OAuth flow:", error);
      const errorMessage = error instanceof Error ? error.message : "Connection failed";
      setConfigError(errorMessage);
      toast.error(errorMessage);
    }
  };
  
  const proceedWithGoogleAuth = () => {
    try {
      setShowUriDialog(false);
      setIsAuthenticating(true);
      
      toast.info("Connecting to Google OAuth...");
      
      const popup = openGoogleAuthPopup();
      
      if (!popup) {
        window.location.href = getGoogleAuthUrl();
      } else {
        setTimeout(() => {
          if (isAuthenticating) {
            toast.info("Authentication is taking longer than expected. Check the popup window.");
          }
        }, 10000);
        
        setTimeout(() => {
          if (isAuthenticating) {
            setIsAuthenticating(false);
            setShowConnectionError(true);
            setConnectionErrorMessage("Authentication timed out. Please try again.");
            toast.error("Authentication timed out. Please try again.");
          }
        }, 120000);
      }
    } catch (error) {
      console.error("Error connecting to Google OAuth:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect";
      setConfigError(errorMessage);
      setShowConnectionError(true);
      setConnectionErrorMessage(errorMessage);
      toast.error(errorMessage);
      setIsAuthenticating(false);
    }
  };
  
  const openDirectLink = () => {
    if (directUrl) {
      window.open(directUrl, "_blank");
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(exactRedirectUri).then(() => {
      setCopied(true);
      toast.success("Redirect URI copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  const handleDisconnectGoogle = () => {
    clearAuthTokens();
    toast.success("Disconnected from Google Ads");
    window.location.reload();
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Connect to Google Ads</CardTitle>
          <CardDescription>
            {isAuthenticated 
              ? "Your Google Ads account is connected"
              : "Link your Google Ads account to pull campaign data (optional)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-success-DEFAULT">
                <CheckCircle className="h-5 w-5" />
                <span>Connected to Google Ads</span>
              </div>
              
              {developerTokenStatus === "missing" && (
                <div className="p-3 bg-error-foreground/10 rounded-md border border-error-DEFAULT">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-error-DEFAULT" />
                    <span className="font-medium text-sm">Developer Token Missing</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A Google Ads Developer Token is required to fetch real accounts.
                    Please add it as a secret in your Supabase Edge Function.
                  </p>
                  <a 
                    href="https://developers.google.com/google-ads/api/docs/first-call/dev-token"
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 text-xs flex items-center gap-1 mt-2"
                  >
                    How to get a Developer Token <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              
              <Button 
                onClick={handleDisconnectGoogle} 
                variant="outline"
                className="w-full"
              >
                Disconnect Google Ads
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Button 
                onClick={handleConnectGoogle} 
                className="w-full"
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <>
                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    Connect Google Ads
                  </>
                )}
              </Button>
              
              {showConnectionError && (
                <div className="p-3 bg-error-foreground/10 rounded-md border border-error-DEFAULT">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-error-DEFAULT" />
                    <span className="font-medium text-sm">Connection Failed</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {connectionErrorMessage || "Could not connect to Google. This could be due to a network issue, popup blocker, or Google authentication server problem."}
                  </p>
                  <div className="mt-2 space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleConnectGoogle}
                      className="text-xs"
                    >
                      Try Again
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUriDialog(true)}
                      className="text-xs"
                    >
                      Show Authentication Tips
                    </Button>
                  </div>
                </div>
              )}
              
              {configError && (
                <div className="p-3 bg-error-foreground/10 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-error" />
                    <span className="font-medium text-sm">Connection Error</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {configError}
                  </p>
                  <div className="mt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowDebugInfo(!showDebugInfo)}
                      className="text-xs"
                    >
                      {showDebugInfo ? "Hide Debug Info" : "Show Debug Info"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowUriDialog(true)}
                      className="text-xs ml-2"
                    >
                      Show Redirect URI
                    </Button>
                  </div>
                  
                  {showDebugInfo && (
                    <div className="mt-2 p-2 bg-secondary/30 rounded border text-xs font-mono whitespace-pre-wrap">
                      <p>Current Origin: {window.location.origin}</p>
                      <p>Required Redirect URI: {exactRedirectUri}</p>
                    </div>
                  )}
                  
                  <a 
                    href="https://console.cloud.google.com/apis/credentials" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 text-xs flex items-center gap-1 mt-2"
                  >
                    Go to Google API Console <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              
              <div className="p-3 bg-secondary/30 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Connection Optional</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can still create and manage campaigns manually without connecting to Google Ads
                </p>
              </div>
            </div>
          )}
          
          <div className="border-t my-4"></div>
          
          <AccountForm 
            newAccountName={newAccountName}
            setNewAccountName={setNewAccountName}
            newAccountPlatform={newAccountPlatform}
            setNewAccountPlatform={setNewAccountPlatform}
            handleAddAccount={handleAddAccount}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
      
      <Dialog open={showUriDialog} onOpenChange={setShowUriDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Google Authentication Setup</DialogTitle>
            <DialogDescription>
              Follow these steps to connect to Google Ads and avoid common authentication errors:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            <div className="bg-warning-foreground/10 p-4 rounded-md border border-warning-DEFAULT">
              <h3 className="text-sm font-medium mb-2">Copy this exact Redirect URI:</h3>
              <div className="bg-background p-3 rounded-md flex items-center justify-between">
                <code className="text-sm font-mono break-all">{exactRedirectUri}</code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyToClipboard}
                  className="ml-2"
                >
                  {copied ? <CopyCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Troubleshooting Tips:</h3>
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                <li>Make sure you're using a modern browser (Chrome, Firefox, Edge)</li>
                <li>Disable popup blockers for this site</li>
                <li>Ensure your browser allows third-party cookies</li>
                <li>Clear your browser cache and cookies if experiencing persistent issues</li>
                <li>Check your network connection</li>
                <li>Verify you have access to a Google Ads account</li>
              </ol>
            </div>
            
            <div className="pt-4 space-y-3">
              <Button onClick={proceedWithGoogleAuth} className="w-full">
                Proceed with Authentication
              </Button>
              
              {directUrl && (
                <Button variant="outline" onClick={openDirectLink} className="w-full">
                  Open Auth URL Directly <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface AccountFormProps {
  newAccountName: string;
  setNewAccountName: (value: string) => void;
  newAccountPlatform: "google" | "youtube";
  setNewAccountPlatform: (value: "google" | "youtube") => void;
  handleAddAccount: () => void;
  isLoading: boolean;
}

export const AccountForm = ({
  newAccountName,
  setNewAccountName,
  newAccountPlatform,
  setNewAccountPlatform,
  handleAddAccount,
  isLoading,
}: AccountFormProps) => {
  return (
    <>
      <div className="space-y-2">
        <label htmlFor="accountName" className="text-sm font-medium">
          Account Name
        </label>
        <Input
          id="accountName"
          value={newAccountName}
          onChange={(e) => setNewAccountName(e.target.value)}
          placeholder="e.g., Tort Masters LLC"
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Platform</label>
        <div className="flex gap-4">
          <Button
            type="button"
            variant={newAccountPlatform === "google" ? "default" : "outline"}
            onClick={() => setNewAccountPlatform("google")}
            className="flex-1"
          >
            Google Ads
          </Button>
          <Button
            type="button"
            variant={newAccountPlatform === "youtube" ? "secondary" : "outline"}
            onClick={() => setNewAccountPlatform("youtube")}
            className="flex-1"
            disabled
          >
            YouTube Ads
          </Button>
        </div>
      </div>
      <Button 
        onClick={handleAddAccount} 
        className="w-full mt-4"
        disabled={isLoading || !newAccountName.trim()}
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        Add Account
      </Button>
    </>
  );
};
