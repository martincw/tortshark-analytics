
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { AccountConnection } from "@/types/campaign";
import { ConnectedAccounts } from "@/components/accounts/ConnectedAccounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PlusCircle, AlertCircle, ExternalLink, InfoIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { getGoogleAdsCredentials, isGoogleAuthValid } from "@/services/googleAdsService";

const AccountsPage = () => {
  const { 
    accountConnections, 
    addAccountConnection, 
    isLoading 
  } = useCampaign();
  
  const navigate = useNavigate();
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountPlatform, setNewAccountPlatform] = useState<"google">("google");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  
  useEffect(() => {
    // Check if Google auth is already valid
    setIsGoogleConnected(isGoogleAuthValid());
  }, []);
  
  const handleAddAccount = () => {
    if (!newAccountName.trim()) {
      toast.error("Please enter an account name");
      return;
    }
    
    if (!isGoogleConnected) {
      toast.error("Please connect to Google Ads first");
      navigate("/integrations");
      return;
    }
    
    const credentials = getGoogleAdsCredentials();
    
    const newAccount: Omit<AccountConnection, "id"> = {
      name: newAccountName.trim(),
      platform: newAccountPlatform,
      isConnected: Boolean(credentials),
      lastSynced: new Date().toISOString(),
      credentials: credentials ? {
        customerId: credentials.customerId,
        developerToken: credentials.developerToken
      } : undefined
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
        <h1 className="text-3xl font-bold tracking-tight">Google Ads Account Connections</h1>
      </div>
      
      <p className="text-muted-foreground">
        Manage your Google Ads accounts and create campaigns
      </p>
      
      {!isGoogleConnected && (
        <Alert variant="warning" className="mb-4 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-800 flex justify-between items-center">
            <span>You need to connect to Google Ads before adding accounts</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              onClick={() => navigate("/integrations")}
            >
              Connect to Google
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Account</CardTitle>
            <CardDescription>
              Create a new Google Ads account
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
                placeholder="e.g., My Google Ads Account"
                disabled={!isGoogleConnected}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Platform</label>
              <div className="w-full p-2 border rounded-md bg-muted/30 text-sm">
                Google Ads
              </div>
            </div>
            
            {!isGoogleConnected && (
              <div className="text-sm text-muted-foreground mt-2 flex items-start gap-2">
                <InfoIcon className="h-4 w-4 mt-0.5 text-amber-500" />
                <span>
                  You need to connect to Google Ads first. Go to the Integrations page to complete authentication.
                </span>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleAddAccount} 
              className="w-full"
              disabled={isLoading || !newAccountName.trim() || !isGoogleConnected}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Account
            </Button>
          </CardFooter>
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
