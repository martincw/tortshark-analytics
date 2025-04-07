
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { AccountConnection } from "@/types/campaign";
import { getStoredAuthTokens, getGoogleAuthUrl, parseOAuthError } from "@/services/googleAdsService";
import { GoogleAdsConnection } from "@/components/accounts/GoogleAdsConnection";
import { ConnectedAccounts } from "@/components/accounts/ConnectedAccounts";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AccountsPage = () => {
  const { 
    accountConnections, 
    addAccountConnection, 
    syncAccount,
    isLoading 
  } = useCampaign();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPlatform, setNewAccountPlatform] = useState<"google" | "youtube">("google");
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState(false);
  
  // Check if we have stored tokens
  const isAuthenticated = !!getStoredAuthTokens()?.access_token;
  
  useEffect(() => {
    // Check for error in URL parameters (e.g., after redirect from Google)
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    
    if (error) {
      const errorMessage = parseOAuthError(error);
      setOauthError(`${error}: ${errorMessage}`);
      toast.error(`Google OAuth Error: ${errorMessage}`);
      
      // Clean up the URL to remove error parameters after a delay
      setTimeout(() => {
        navigate('/accounts', { replace: true });
      }, 500);
    }
  }, [location, navigate]);
  
  // Listen for auth success events
  useEffect(() => {
    const handleAuthSuccess = (event: CustomEvent) => {
      console.log("Auth success event received", event.detail);
      setAuthSuccess(true);
      
      // If there are accounts in the event, add them
      if (event.detail?.accounts && Array.isArray(event.detail.accounts)) {
        event.detail.accounts.forEach((account: AccountConnection) => {
          addAccountConnection(account);
        });
        toast.success(`Connected to ${event.detail.accounts.length} Google Ads account(s)`);
      } else {
        // If no accounts were found, show different success message
        toast.success("Successfully connected to Google Ads");
      }
      
      // Reset success state after a delay
      setTimeout(() => setAuthSuccess(false), 3000);
    };
    
    // Type assertion to handle CustomEvent
    window.addEventListener('googleAuthSuccess', handleAuthSuccess as EventListener);
    
    return () => {
      window.removeEventListener('googleAuthSuccess', handleAuthSuccess as EventListener);
    };
  }, [addAccountConnection]);
  
  const handleConnectGoogle = () => {
    try {
      // Clear any previous errors
      setOauthError(null);
      
      // Redirect to Google OAuth flow
      window.location.href = getGoogleAuthUrl();
    } catch (error) {
      console.error("Error initiating Google OAuth flow:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setOauthError(errorMessage);
      toast.error("Failed to connect to Google. You can still create campaigns manually.");
    }
  };
  
  const handleSyncAccount = async (accountId: string) => {
    toast("Syncing account data...", {
      duration: 2000,
    });
    
    const success = await syncAccount(accountId);
    
    if (success) {
      toast.success("Account synchronized successfully");
    } else {
      toast.error("Failed to sync account data");
    }
  };
  
  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      toast.error("Please enter an account name");
      return;
    }
    
    const newAccount: Omit<AccountConnection, "id"> = {
      name: newAccountName.trim(),
      platform: newAccountPlatform,
      isConnected: isAuthenticated, // Only mark as connected if authenticated
      lastSynced: isAuthenticated ? new Date().toISOString() : undefined,
    };
    
    addAccountConnection(newAccount);
    setNewAccountName("");
    toast.success("Account added successfully");
  };

  const handleCreateCampaign = () => {
    navigate("/add-campaign");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Ad Account Connections</h1>
      <p className="text-muted-foreground">
        Connect your ad accounts or create campaigns manually
      </p>
      
      {authSuccess && (
        <Alert className="bg-success-foreground/10 border-success-DEFAULT">
          <CheckCircle className="h-4 w-4 text-success-DEFAULT" />
          <AlertTitle>Authentication Successful</AlertTitle>
          <AlertDescription>
            Your Google Ads account has been connected successfully.
          </AlertDescription>
        </Alert>
      )}
      
      {oauthError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            {oauthError}. Please check your Google Cloud Console settings and try again.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GoogleAdsConnection
          isAuthenticated={isAuthenticated}
          newAccountName={newAccountName}
          setNewAccountName={setNewAccountName}
          newAccountPlatform={newAccountPlatform}
          setNewAccountPlatform={setNewAccountPlatform}
          handleAddAccount={handleAddAccount}
          isLoading={isLoading}
        />
        
        <ConnectedAccounts
          accountConnections={accountConnections}
          isLoading={isLoading}
          handleSyncAccount={handleSyncAccount}
          handleConnectGoogle={handleConnectGoogle}
          handleCreateCampaign={handleCreateCampaign}
        />
      </div>
    </div>
  );
};

export default AccountsPage;
