
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
import { CheckCircle, XCircle, RefreshCw, PlusCircle } from "lucide-react";

const AccountsPage = () => {
  const { accountConnections, addAccountConnection } = useCampaign();
  const [newAccountName, setNewAccountName] = React.useState("");
  const [newAccountPlatform, setNewAccountPlatform] = React.useState<"google" | "youtube">("google");
  
  const handleConnectAccount = (accountId: string) => {
    // This would normally trigger OAuth flow with Google
    toast.success("Account connected successfully");
  };
  
  const handleSyncAccount = (accountId: string) => {
    toast("Syncing account data...", {
      duration: 2000,
    });
    
    // In a real app, this would trigger an API call to sync data
    setTimeout(() => {
      toast.success("Account synchronized successfully");
    }, 2000);
  };
  
  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      toast.error("Please enter an account name");
      return;
    }
    
    const newAccount: Omit<AccountConnection, "id"> = {
      name: newAccountName.trim(),
      platform: newAccountPlatform,
      isConnected: false,
      lastSynced: null,
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
            <CardTitle>Add New Account</CardTitle>
            <CardDescription>
              Link a new Google Ads or YouTube Ads account to your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                >
                  YouTube Ads
                </Button>
              </div>
            </div>
            <Button 
              onClick={handleAddAccount} 
              className="w-full mt-4"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Account
            </Button>
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
            {accountConnections.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No accounts added yet
              </p>
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
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Sync
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnectAccount(account.id)}
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
