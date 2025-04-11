
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { AccountConnection } from "@/types/campaign";
import { ConnectedAccounts } from "@/components/accounts/ConnectedAccounts";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ExternalLink, InfoIcon, RefreshCw } from "lucide-react";
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
    fetchGoogleAdsAccounts,
    isLoading 
  } = useCampaign();
  
  const navigate = useNavigate();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  useEffect(() => {
    // Check if Google auth is already valid
    const checkGoogleAuth = async () => {
      const isValid = await isGoogleAuthValid();
      setIsGoogleConnected(isValid);
      
      // If connected, ensure we have the latest accounts
      if (isValid) {
        refreshAccounts();
      }
    };
    
    checkGoogleAuth();
  }, []);
  
  const refreshAccounts = async () => {
    setIsRefreshing(true);
    try {
      await fetchGoogleAdsAccounts();
      toast.success("Google Ads accounts refreshed");
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      toast.error("Failed to refresh accounts");
    } finally {
      setIsRefreshing(false);
    }
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Google Ads Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Select accounts to create campaigns
          </p>
        </div>
        
        <Button 
          variant="outline"
          onClick={refreshAccounts}
          disabled={isRefreshing || !isGoogleConnected}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Accounts'}
        </Button>
      </div>
      
      {!isGoogleConnected && (
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-800 flex justify-between items-center">
            <span>You need to connect to Google Ads before managing accounts</span>
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
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Imported Google Ads Accounts</CardTitle>
          <CardDescription>
            Accounts are automatically imported after connecting to Google Ads
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isGoogleConnected ? (
            accountConnections.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Select an account to create a campaign with it
              </p>
            ) : (
              <div className="bg-muted/30 p-4 rounded-md text-center">
                <p className="text-muted-foreground mb-2">No accounts found</p>
                <p className="text-sm text-muted-foreground">
                  Accounts are automatically imported after connecting to Google Ads.
                  Try refreshing if you don't see your accounts.
                </p>
              </div>
            )
          ) : (
            <div className="text-sm text-muted-foreground mt-2 flex items-start gap-2">
              <InfoIcon className="h-4 w-4 mt-0.5 text-amber-500" />
              <span>
                You need to connect to Google Ads first. Go to the Integrations page to complete authentication.
              </span>
            </div>
          )}
        </CardContent>
        {isGoogleConnected && (
          <CardFooter className="border-t pt-4">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => navigate("/integrations")}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Manage Google Ads Connection
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <ConnectedAccounts
        accountConnections={accountConnections}
        isLoading={isLoading || isRefreshing}
        handleCreateCampaign={handleCreateCampaign}
        selectedAccountId={selectedAccountId || undefined}
        onSelectAccount={handleSelectAccount}
      />

      {selectedAccountId && accountConnections.length > 0 && (
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
