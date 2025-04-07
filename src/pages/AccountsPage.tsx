
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { AccountConnection } from "@/types/campaign";
import { getStoredAuthTokens, getGoogleAuthUrl, parseOAuthError, getStoredAccounts } from "@/services/googleAdsService";
import { GoogleAdsConnection } from "@/components/accounts/GoogleAdsConnection";
import { ConnectedAccounts } from "@/components/accounts/ConnectedAccounts";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

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
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [googleAccounts, setGoogleAccounts] = useState<AccountConnection[]>([]);
  
  const isAuthenticated = !!getStoredAuthTokens()?.access_token;
  
  // Check for stored Google accounts on load
  useEffect(() => {
    if (isAuthenticated) {
      const accounts = getStoredAccounts();
      if (accounts.length > 0) {
        setGoogleAccounts(accounts);
        
        // Import any Google accounts that aren't already in our account connections
        accounts.forEach(account => {
          const exists = accountConnections.some(ac => ac.id === account.id);
          if (!exists) {
            addAccountConnection(account);
            console.log("Added Google account:", account.name);
          }
        });
        
        toast.success(`Found ${accounts.length} Google Ads accounts`);
        
        // If we have Google accounts but none selected, select the first one
        if (!selectedAccountId && accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
          toast.info(`Selected account: ${accounts[0].name}`);
        }
      } else {
        console.log("No stored Google accounts found");
      }
    }
  }, [isAuthenticated, addAccountConnection, accountConnections, selectedAccountId]);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    
    if (error) {
      const errorMessage = parseOAuthError(error);
      setOauthError(`${error}: ${errorMessage}`);
      toast.error(`Google OAuth Error: ${errorMessage}`);
      
      setTimeout(() => {
        navigate('/accounts', { replace: true });
      }, 500);
    }
  }, [location, navigate]);
  
  useEffect(() => {
    const handleAuthSuccess = (event: CustomEvent) => {
      console.log("Auth success event received", event.detail);
      setAuthSuccess(true);
      
      if (event.detail?.accounts && Array.isArray(event.detail.accounts)) {
        const newAccounts = event.detail.accounts;
        setGoogleAccounts(newAccounts);
        
        // Add any new accounts to our context
        newAccounts.forEach((account: AccountConnection) => {
          const exists = accountConnections.some(ac => ac.id === account.id);
          if (!exists) {
            addAccountConnection(account);
            console.log("Added new Google account:", account.name);
          }
        });
        
        // If accounts were found, select the first one
        if (newAccounts.length > 0) {
          setSelectedAccountId(newAccounts[0].id);
          toast.info(`Selected account: ${newAccounts[0].name}`);
        }
        
        toast.success(`Connected to ${newAccounts.length} Google Ads account(s)`);
      } else {
        toast.success("Successfully connected to Google Ads");
        // Check again for stored accounts
        const storedAccounts = getStoredAccounts();
        if (storedAccounts.length > 0) {
          setGoogleAccounts(storedAccounts);
          console.log("Found stored accounts after auth:", storedAccounts);
        }
      }
      
      setTimeout(() => setAuthSuccess(false), 3000);
    };
    
    window.addEventListener('googleAuthSuccess', handleAuthSuccess as EventListener);
    
    return () => {
      window.removeEventListener('googleAuthSuccess', handleAuthSuccess as EventListener);
    };
  }, [accountConnections, addAccountConnection]);
  
  const handleConnectGoogle = () => {
    try {
      setOauthError(null);
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
      isConnected: isAuthenticated,
      lastSynced: isAuthenticated ? new Date().toISOString() : undefined,
    };
    
    addAccountConnection(newAccount);
    setNewAccountName("");
    toast.success("Account added successfully");
  };

  const handleCreateCampaign = () => {
    // If an account is selected, pass it in the query parameter
    if (selectedAccountId) {
      navigate(`/add-campaign?accountId=${selectedAccountId}`);
    } else {
      navigate("/add-campaign");
    }
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
    const accountName = accountConnections.find(acc => acc.id === accountId)?.name;
    toast.info(`Account selected: ${accountName}`);
  };

  // Count Google accounts 
  const connectedGoogleAccounts = accountConnections.filter(
    acc => acc.platform === "google" && acc.isConnected
  ).length;

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
            {googleAccounts.length > 0 && ` ${googleAccounts.length} account(s) found.`}
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
      
      {connectedGoogleAccounts > 0 && (
        <Alert className="bg-primary/10 border-primary">
          <CheckCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Google Ads Accounts Connected</AlertTitle>
          <AlertDescription>
            You have {connectedGoogleAccounts} Google Ads account(s) connected and ready to use.
            {selectedAccountId && " One account is selected and ready for campaign creation."}
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
          selectedAccountId={selectedAccountId || undefined}
          onSelectAccount={handleSelectAccount}
        />
      </div>

      {selectedAccountId && (
        <div className="flex justify-center">
          <Button 
            onClick={handleCreateCampaign} 
            size="lg"
            className="mt-4"
          >
            Create Campaign with Selected Account
          </Button>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
