
import React, { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { AccountConnection } from "@/types/campaign";
import { ConnectedAccounts } from "@/components/accounts/ConnectedAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AccountsPage = () => {
  const { 
    accountConnections, 
    addAccountConnection, 
    isLoading 
  } = useCampaign();
  
  const navigate = useNavigate();
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPlatform, setNewAccountPlatform] = useState<"google" | "youtube">("google");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  
  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      toast.error("Please enter an account name");
      return;
    }
    
    const newAccount: Omit<AccountConnection, "id"> = {
      name: newAccountName.trim(),
      platform: newAccountPlatform,
      isConnected: false,
      lastSynced: new Date().toISOString(),
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Ad Account Connections</h1>
      </div>
      
      <p className="text-muted-foreground">
        Manage your ad accounts and create campaigns
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Account</CardTitle>
            <CardDescription>
              Create a new ad account
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
                placeholder="e.g., My Ad Account"
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
              disabled={isLoading || !newAccountName.trim()}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </CardContent>
        </Card>
        
        <ConnectedAccounts
          accountConnections={accountConnections}
          isLoading={isLoading}
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
