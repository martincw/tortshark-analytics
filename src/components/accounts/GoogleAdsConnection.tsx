
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, Link, AlertCircle, PlusCircle } from "lucide-react";
import { getGoogleAuthUrl, clearAuthTokens, getStoredAuthTokens } from "@/services/googleAdsService";
import { toast } from "sonner";

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
  
  const handleConnectGoogle = () => {
    try {
      // Redirect to Google OAuth flow
      window.location.href = getGoogleAuthUrl();
    } catch (error) {
      console.error("Error initiating Google OAuth flow:", error);
      const errorMessage = error instanceof Error ? error.message : "Connection failed";
      setConfigError(errorMessage);
      toast.error(errorMessage);
    }
  };
  
  const handleDisconnectGoogle = () => {
    clearAuthTokens();
    toast.success("Disconnected from Google Ads");
    // Reload the page to clear the UI state
    window.location.reload();
  };
  
  return (
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
                  <span className="font-medium text-sm">Configuration Error</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {configError}. Check your environment variables.
                </p>
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
