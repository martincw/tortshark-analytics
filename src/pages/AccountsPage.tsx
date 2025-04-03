
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCampaign } from "@/contexts/CampaignContext";
import { toast } from "sonner";
import { AccountConnection } from "@/types/campaign";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  PlusCircle, 
  Link
} from "lucide-react";
import { 
  getGoogleAuthUrl, 
  getStoredAuthTokens, 
  clearAuthTokens 
} from "@/services/googleAdsService";

const AccountsPage = () => {
  const { 
    accountConnections, 
    addAccountConnection, 
    syncAccount,
    isLoading 
  } = useCampaign();
  
  const [newAccountName, setNewAccountName] = React.useState("");
  const [newAccountPlatform, setNewAccountPlatform] = React.useState<"google" | "youtube">("google");
  
  // Check if we have stored tokens
  const isAuthenticated = !!getStoredAuthTokens()?.access_token;
  
  const handleConnectGoogle = () => {
    // Redirect to Google OAuth flow
    window.location.href = getGoogleAuthUrl();
  };
  
  const handleDisconnectGoogle = () => {
    clearAuthTokens();
    toast.success("Disconnected from Google Ads");
    // Reload the page to clear the UI state
    window.location.reload();
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
    
    if (!isAuthenticated) {
      toast.error("Please connect to Google Ads first");
      return;
    }
    
    const newAccount: Omit<AccountConnection, "id"> = {
      name: newAccountName.trim(),
      platform: newAccountPlatform,
      isConnected: true,
      lastSynced: new Date().toISOString(),
    };
    
    addAccountConnection(newAccount);
    setNewAccountName("");
    toast.success("Account added successfully");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Ad Account Connections</h1>
      <p className="text-muted-foreground">
        Connect your Google Ads and YouTube Ads accounts to pull campaign data
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Connect to Google Ads</CardTitle>
            <CardDescription>
              {isAuthenticated 
                ? "Your Google Ads account is connected"
                : "Link your Google Ads account to pull campaign data"}
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
              <Button 
                onClick={handleConnectGoogle} 
                className="w-full"
              >
                <Link className="mr-2 h-4 w-4" />
                Connect Google Ads
              </Button>
            )}
            
            {isAuthenticated && (
              <>
                <div className="border-t my-4"></div>
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
                  disabled={isLoading}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Manage your connected ad accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : accountConnections.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 border border-dashed rounded-md">
                <p>No accounts added yet</p>
                {!isAuthenticated && (
                  <Button 
                    onClick={handleConnectGoogle}
                    variant="outline" 
                    className="mt-4"
                  >
                    <Link className="mr-2 h-4 w-4" />
                    Connect Google Ads
                  </Button>
                )}
              </div>
            ) : (
              accountConnections.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.name}</span>
                      <Badge variant={account.platform === "google" ? "default" : "secondary"}>
                        {account.platform === "google" ? "Google" : "YouTube"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {account.isConnected ? (
                        <CheckCircle className="h-4 w-4 text-success-DEFAULT" />
                      ) : (
                        <XCircle className="h-4 w-4 text-error-DEFAULT" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {account.isConnected ? "Connected" : "Not connected"}
                      </span>
                      {account.lastSynced && (
                        <span className="text-xs text-muted-foreground">
                          · Last synced: {new Date(account.lastSynced).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {account.isConnected ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSyncAccount(account.id)}
                        disabled={isLoading}
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                        Sync
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={handleConnectGoogle}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountsPage;
