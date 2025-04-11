
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountConnection } from "@/types/campaign";
import {
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  PlusCircle,
  ExternalLink
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";

interface ConnectedAccountsProps {
  accountConnections: AccountConnection[];
  isLoading: boolean;
  handleCreateCampaign: () => void;
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
}

export const ConnectedAccounts = ({
  accountConnections,
  isLoading,
  handleCreateCampaign,
  selectedAccountId,
  onSelectAccount,
}: ConnectedAccountsProps) => {
  const navigate = useNavigate();
  const { fetchGoogleAdsAccounts } = useCampaign();
  
  const handleRefreshAccounts = async () => {
    await fetchGoogleAdsAccounts();
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your Google Ads accounts
          </CardDescription>
        </div>
        <Button 
          variant="outline"
          size="sm"
          onClick={handleRefreshAccounts}
          disabled={isLoading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : accountConnections.length === 0 ? (
          <EmptyAccountsState 
            handleCreateCampaign={handleCreateCampaign}
            navigate={navigate}
          />
        ) : (
          <AccountsList
            accountConnections={accountConnections}
            isLoading={isLoading}
            handleCreateCampaign={handleCreateCampaign}
            selectedAccountId={selectedAccountId}
            onSelectAccount={onSelectAccount}
            navigate={navigate}
          />
        )}
      </CardContent>
    </Card>
  );
};

interface EmptyAccountsStateProps {
  handleCreateCampaign: () => void;
  navigate: (path: string) => void;
}

const EmptyAccountsState = ({
  handleCreateCampaign,
  navigate
}: EmptyAccountsStateProps) => {
  return (
    <div className="flex flex-col items-center space-y-4 text-center text-muted-foreground py-8 border border-dashed rounded-md p-4">
      <p>No accounts added yet</p>
      <div className="flex flex-col md:flex-row gap-3 w-full max-w-xs">
        <Button 
          onClick={() => navigate("/integrations")}
          variant="default" 
          className="flex-1"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Connect Google Ads
        </Button>
        <Button 
          onClick={handleCreateCampaign}
          variant="secondary" 
          className="flex-1"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>
    </div>
  );
};

interface AccountsListProps {
  accountConnections: AccountConnection[];
  isLoading: boolean;
  handleCreateCampaign: () => void;
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  navigate: (path: string) => void;
}

const AccountsList = ({
  accountConnections,
  isLoading,
  handleCreateCampaign,
  selectedAccountId,
  onSelectAccount,
  navigate
}: AccountsListProps) => {
  return (
    <>
      <div className="space-y-3">
        <h3 className="text-sm font-medium mb-2">All Accounts</h3>
        {accountConnections.map((account) => (
          <div
            key={account.id}
            className={`flex items-center justify-between p-4 border rounded-md cursor-pointer transition-colors ${
              selectedAccountId === account.id ? "bg-muted border-primary" : "hover:bg-muted/50"
            }`}
            onClick={() => onSelectAccount && onSelectAccount(account.id)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{account.name}</span>
                <Badge variant="default">{account.platform}</Badge>
                {account.isConnected ? (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Connected</Badge>
                ) : (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Not Connected</Badge>
                )}
                {selectedAccountId === account.id && (
                  <Badge variant="outline" className="ml-2 bg-primary/10">Selected</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {account.customerId ? `Customer ID: ${account.customerId}` : ''}
                  {account.lastSynced ? ` • Last updated: ${new Date(account.lastSynced).toLocaleDateString()}` : ""}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!account.isConnected && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/integrations");
                  }}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between pt-4">
        <Button 
          onClick={() => navigate("/integrations")} 
          variant="outline"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Manage Integrations
        </Button>
        <Button 
          onClick={handleCreateCampaign} 
          variant="secondary"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>
    </>
  );
};
