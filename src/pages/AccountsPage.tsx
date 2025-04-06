
import React, { useEffect } from "react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { AccountConnection } from "@/types/campaign";
import { getStoredAuthTokens, getGoogleAuthUrl, parseOAuthError } from "@/services/googleAdsService";
import { GoogleAdsConnection } from "@/components/accounts/GoogleAdsConnection";
import { ConnectedAccounts } from "@/components/accounts/ConnectedAccounts";

const AccountsPage = () => {
  const { 
    accountConnections, 
    addAccountConnection, 
    syncAccount,
    isLoading 
  } = useCampaign();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [newAccountName, setNewAccountName] = React.useState("");
  const [newAccountPlatform, setNewAccountPlatform] = React.useState<"google" | "youtube">("google");
  
  // Check if we have stored tokens
  const isAuthenticated = !!getStoredAuthTokens()?.access_token;
  
  useEffect(() => {
    // Check for error in URL parameters (e.g., after redirect from Google)
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    
    if (error) {
      const errorMessage = parseOAuthError(error);
      toast.error(`Google OAuth Error: ${errorMessage}`);
      
      // Clean up the URL to remove error parameters
      navigate('/accounts', { replace: true });
    }
  }, [location, navigate]);
  
  const handleConnectGoogle = () => {
    try {
      // Redirect to Google OAuth flow
      window.location.href = getGoogleAuthUrl();
    } catch (error) {
      console.error("Error initiating Google OAuth flow:", error);
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
