
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
  const [authenticationAttempted, setAuthenticationAttempted] = useState(false);
  
  const isAuthenticated = !!getStoredAuthTokens()?.access_token;
  
  useEffect(() => {
    if (isAuthenticated) {
      const accounts = getStoredAccounts();
      console.log("Checking for stored accounts:", accounts);
      
      if (accounts.length > 0) {
        setGoogleAccounts(accounts);
        setAuthenticationAttempted(true);
        
        // Use a Set to track existing IDs and avoid duplicates
        const existingAccountIds = new Set(accountConnections.map(ac => ac.id));
        let newAccountsAdded = 0;
        
        accounts.forEach(account => {
          if (!existingAccountIds.has(account.id)) {
            addAccountConnection(account);
            console.log("Added Google account:", account.name);
            newAccountsAdded++;
            existingAccountIds.add(account.id);
          }
        });
        
        if (newAccountsAdded > 0) {
          toast.success(`Found ${newAccountsAdded} new Google Ads accounts`);
        }
        
        if (!selectedAccountId && accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
          toast.info(`Selected account: ${accounts[0].name}`);
        }
      } else {
        console.log("No stored Google accounts found");
        
        if (authenticationAttempted) {
          toast.warning("No Google Ads accounts found. You can create accounts manually.");
        }
      }
    }
  }, [isAuthenticated, addAccountConnection, accountConnections, selectedAccountId, authenticationAttempted]);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    
    if (error) {
      const errorMessage = parseOAuthError(error);
      setOauthError(`${error}: ${errorMessage}`);
      toast.error(`Google OAuth Error: ${errorMessage}`);
      setAuthenticationAttempted(true);
      
      setTimeout(() => {
        navigate('/accounts', { replace: true });
      }, 500);
    }
  }, [location, navigate]);
  
  useEffect(() => {
    const handleAuthSuccess = (event: CustomEvent) => {
      console.log("Auth success event received", event.detail);
      setAuthSuccess(true);
      setAuthenticationAttempted(true);
      
      if (event.detail?.accounts && Array.isArray(event.detail.accounts)) {
        const newAccounts = event.detail.accounts;
        setGoogleAccounts(newAccounts);
        
        // Use a Set to track existing IDs and avoid duplicates
        const existingAccountIds = new Set(accountConnections.map(ac => ac.id));
        let newAccountsAdded = 0;
        
        newAccounts.forEach((account: AccountConnection) => {
          if (!existingAccountIds.has(account.id)) {
            addAccountConnection(account);
            console.log("Added new Google account:", account.name);
            newAccountsAdded++;
            existingAccountIds.add(account.id);
          }
        });
        
        if (newAccounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(newAccounts[0].id);
          toast.info(`Selected account: ${newAccounts[0].name}`);
        }
        
        if (newAccountsAdded > 0) {
          toast.success(`Connected to ${newAccountsAdded} Google Ads account(s)`);
        } else if (newAccounts.length > 0) {
          toast.success("Successfully connected to Google Ads");
        } else {
          toast.warning("No new Google Ads accounts found");
        }
      } else {
        const storedAccounts = getStoredAccounts();
        if (storedAccounts.length > 0) {
          setGoogleAccounts(storedAccounts);
          toast.success("Successfully connected to Google Ads");
          
          let newAccountsAdded = 0;
          storedAccounts.forEach(account => {
            const exists = accountConnections.some(ac => ac.id === account.id);
            if (!exists) {
              addAccountConnection(account);
              newAccountsAdded++;
            }
          });
          
          if (!selectedAccountId && storedAccounts.length > 0) {
            setSelectedAccountId(storedAccounts[0].id);
          }
          
          if (newAccountsAdded > 0) {
            toast.success(`Added ${newAccountsAdded} Google Ads account(s)`);
          }
        } else if (accountConnections.length === 0) {
          const fallbackAccount: AccountConnection = {
            id: "fallback-" + Date.now(),
            name: "Default Google Ads Account",
            platform: "google",
            isConnected: false,
            lastSynced: undefined
          };
          
          addAccountConnection(fallbackAccount);
          setSelectedAccountId(fallbackAccount.id);
          setGoogleAccounts([fallbackAccount]);
          
          toast.info("Created a default account for you");
        }
      }
      
      setTimeout(() => setAuthSuccess(false), 3000);
    };
    
    const handleAuthFailure = (event: CustomEvent) => {
      console.log("Auth failure event received", event.detail);
      setAuthenticationAttempted(true);
      
      if (accountConnections.length === 0) {
        const fallbackAccount: AccountConnection = {
          id: "fallback-" + Date.now(),
          name: "Default Google Ads Account",
          platform: "google",
          isConnected: false,
          lastSynced: undefined
        };
        
        addAccountConnection(fallbackAccount);
        setSelectedAccountId(fallbackAccount.id);
        toast.info("Created a default account. You can still create campaigns manually.");
      }
    };
    
    window.addEventListener('googleAuthSuccess', handleAuthSuccess as EventListener);
    window.addEventListener('googleAuthFailure', handleAuthFailure as EventListener);
    
    return () => {
      window.removeEventListener('googleAuthSuccess', handleAuthSuccess as EventListener);
      window.removeEventListener('googleAuthFailure', handleAuthFailure as EventListener);
    };
  }, [accountConnections, addAccountConnection, selectedAccountId]);
  
  const handleConnectGoogle = () => {
    try {
      setOauthError(null);
      setAuthenticationAttempted(true);
      window.location.href = getGoogleAuthUrl();
    } catch (error) {
      console.error("Error initiating Google OAuth flow:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setOauthError(errorMessage);
      toast.error("Failed to connect to Google. You can still create campaigns manually.");
      
      if (accountConnections.length === 0) {
        const fallbackAccount: AccountConnection = {
          id: "fallback-" + Date.now(),
          name: "Default Google Ads Account",
          platform: "google",
          isConnected: false,
          lastSynced: undefined
        };
        
        addAccountConnection(fallbackAccount);
        setSelectedAccountId(fallbackAccount.id);
      }
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
    
    const newAccountId = addAccountConnection(newAccount);
    setNewAccountName("");
    
    if (typeof newAccountId === 'string') {
      setSelectedAccountId(newAccountId);
    }
    
    toast.success("Account added successfully");
  };

  const handleCreateCampaign = () => {
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
