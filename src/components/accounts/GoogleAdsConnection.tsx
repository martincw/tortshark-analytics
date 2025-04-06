
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
  CopyCheck
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
  const exactRedirectUri = `${window.location.origin}/auth/google/callback`;
  
  useEffect(() => {
    // Check URL for error parameters that might indicate OAuth issues
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    
    if (error) {
      setConfigError(`OAuth error: ${error}`);
      
      // If it's a redirect_uri_mismatch, show the URI dialog automatically
      if (error === 'redirect_uri_mismatch') {
        setShowUriDialog(true);
        toast.error("Redirect URI mismatch detected. Please update your Google Cloud Console settings.");
      } else {
        toast.error(`Google OAuth error: ${error}`);
      }
    }
  }, []);
  
  const handleConnectGoogle = () => {
    try {
      // Log the current origin for debugging purposes
      console.log("Current origin:", window.location.origin);
      console.log("Redirect URI should be:", exactRedirectUri);
      
      // Generate the OAuth URL and store it for direct access
      try {
        const url = getGoogleAuthUrl();
        setDirectUrl(url);
      } catch (error) {
        console.error("Failed to generate OAuth URL:", error);
      }
      
      // Always show the URI dialog first before proceeding with authentication
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
      
      toast.info("Connecting to Google OAuth...");
      
      // Try using popup approach first
      const popup = openGoogleAuthPopup();
      
      if (!popup) {
        // If popup fails, try direct navigation
        window.location.href = getGoogleAuthUrl();
      } else {
        // Monitor the popup
        const checkPopupClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkPopupClosed);
            // Check if authentication succeeded by checking for tokens
            const tokens = getStoredAuthTokens();
            if (tokens?.access_token) {
              toast.success("Successfully connected to Google Ads");
              window.location.reload();
            }
          }
        }, 500);
      }
    } catch (error) {
      console.error("Error connecting to Google OAuth:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to connect";
      setConfigError(errorMessage);
      toast.error(errorMessage);
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
    // Reload the page to clear the UI state
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
              >
                <Link className="mr-2 h-4 w-4" />
                Connect Google Ads
              </Button>
              
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
            <DialogTitle>Fix Redirect URI Mismatch Error</DialogTitle>
            <DialogDescription>
              The "redirect_uri_mismatch" error means the URI in your Google Cloud Console doesn't exactly match what this app is using. Follow these steps to fix it:
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
              <h3 className="text-sm font-medium">To fix this error:</h3>
              <ol className="list-decimal pl-5 space-y-2 text-sm">
                <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-500">Google Cloud Console</a></li>
                <li>Find and select your OAuth 2.0 Client ID</li>
                <li>Under "Authorized redirect URIs," add the exact URI above (it must match character-for-character)</li>
                <li>Click Save, then wait a few minutes for Google to process the change</li>
                <li>Try connecting again</li>
              </ol>
            </div>
            
            <div className="pt-4 space-y-3">
              <Button onClick={proceedWithGoogleAuth} className="w-full">
                Try Connecting Again
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
            disabled // YouTube not supported yet
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
