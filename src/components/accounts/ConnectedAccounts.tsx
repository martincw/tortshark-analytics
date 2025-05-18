
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountConnection } from "@/types/campaign";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Link, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConnectedAccountsProps {
  accountConnections: AccountConnection[];
  isLoading: boolean;
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
  onMapCampaigns?: (accountId: string) => void;
  campaigns?: any[];
}

export const ConnectedAccounts = ({
  accountConnections,
  isLoading,
  selectedAccountId,
  onSelectAccount,
  onMapCampaigns,
  campaigns = []
}: ConnectedAccountsProps) => {
  const navigate = useNavigate();
  
  const renderMapButton = (account: AccountConnection) => {
    if (!account.isConnected || !onMapCampaigns || !campaigns.length) return null;
    
    // Platform-specific mapping buttons
    switch (account.platform) {
      case 'google':
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Pass the Google Ads customer ID so the mapping dialog can
              // correctly load campaigns for this account
              onMapCampaigns(account.customerId || account.id);
            }}
            className="px-3 py-1.5 text-sm border rounded hover:bg-muted flex items-center gap-2"
          >
            <Link className="h-4 w-4" />
            Map Google Campaigns
          </button>
        );
        
      case 'leadprosper':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/campaigns`); // Navigate to campaigns page where they can map Lead Prosper campaigns
            }}
          >
            <LinkIcon className="h-4 w-4 mr-2" />
            Map Lead Prosper Campaigns
          </Button>
        );
          
      default:
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMapCampaigns(account.id);
            }}
            className="px-3 py-1.5 text-sm border rounded hover:bg-muted flex items-center gap-2"
          >
            <Link className="h-4 w-4" />
            Map Campaigns
          </button>
        );
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : accountConnections.length === 0 ? (
          <div className="text-center py-8 space-y-4 text-muted-foreground border border-dashed rounded-lg">
            <p>No accounts connected yet</p>
            <p className="text-sm">
              Go to Integrations to connect your accounts
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
                    <span className="font-medium">
                      {account.name || `Account ${account.customerId || account.id}`}
                    </span>
                    <Badge variant="default">{account.platform}</Badge>
                    {selectedAccountId === account.id && (
                      <Badge variant="outline" className="bg-primary/10">Selected</Badge>
                    )}
                  </div>
                  {account.customerId && (
                    <span className="text-xs text-muted-foreground">
                      Customer ID: {account.customerId}
                      {account.lastSynced && ` • Last synced: ${new Date(account.lastSynced).toLocaleDateString()}`}
                    </span>
                  )}
                </div>
                {renderMapButton(account)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
