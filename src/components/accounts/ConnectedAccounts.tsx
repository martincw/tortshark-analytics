
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
  Link,
  AlertCircle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ConnectedAccountsProps {
  accountConnections: AccountConnection[];
  isLoading: boolean;
  handleSyncAccount: (accountId: string) => void;
  handleConnectGoogle: () => void;
  handleCreateCampaign: () => void;
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
}

export const ConnectedAccounts = ({
  accountConnections,
  isLoading,
  handleSyncAccount,
  handleConnectGoogle,
  handleCreateCampaign,
  selectedAccountId,
  onSelectAccount,
}: ConnectedAccountsProps) => {
  // Filter to just show Google accounts for the dedicated section
  const googleAccounts = accountConnections.filter(
    account => account.platform === "google" && account.isConnected
  );
  
  const hasGoogleAccounts = googleAccounts.length > 0;

  return (
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
          <EmptyAccountsState 
            handleConnectGoogle={handleConnectGoogle}
            handleCreateCampaign={handleCreateCampaign}
          />
        ) : (
          <>
            {hasGoogleAccounts && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Google Ads Accounts</h3>
                <div className="bg-secondary/20 rounded-md p-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Synced</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {googleAccounts.map((account) => (
                        <TableRow 
                          key={account.id}
                          className={`cursor-pointer ${selectedAccountId === account.id ? "bg-primary/10" : ""}`}
                          onClick={() => onSelectAccount && onSelectAccount(account.id)}
                        >
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-success-DEFAULT" />
                              <span>Connected</span>
                              {selectedAccountId === account.id && (
                                <Badge variant="outline" className="ml-2 bg-primary/10">Selected</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {account.lastSynced 
                              ? new Date(account.lastSynced).toLocaleDateString() 
                              : "Not synced yet"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSyncAccount(account.id);
                              }}
                              disabled={isLoading}
                            >
                              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                              Sync
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {googleAccounts.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      <AlertCircle className="h-5 w-5 mx-auto mb-2" />
                      <p>No Google Ads accounts connected</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <AccountsList
              accountConnections={accountConnections}
              isLoading={isLoading}
              handleSyncAccount={handleSyncAccount}
              handleConnectGoogle={handleConnectGoogle}
              handleCreateCampaign={handleCreateCampaign}
              selectedAccountId={selectedAccountId}
              onSelectAccount={onSelectAccount}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

interface EmptyAccountsStateProps {
  handleConnectGoogle: () => void;
  handleCreateCampaign: () => void;
}

const EmptyAccountsState = ({
  handleConnectGoogle,
  handleCreateCampaign,
}: EmptyAccountsStateProps) => {
  return (
    <div className="flex flex-col items-center space-y-4 text-center text-muted-foreground py-8 border border-dashed rounded-md p-4">
      <p>No accounts added yet</p>
      <div className="flex flex-col md:flex-row gap-3 w-full max-w-xs">
        <Button 
          onClick={handleConnectGoogle}
          variant="outline" 
          className="flex-1"
        >
          <Link className="mr-2 h-4 w-4" />
          Connect Google
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
  handleSyncAccount: (accountId: string) => void;
  handleConnectGoogle: () => void;
  handleCreateCampaign: () => void;
  selectedAccountId?: string;
  onSelectAccount?: (accountId: string) => void;
}

const AccountsList = ({
  accountConnections,
  isLoading,
  handleSyncAccount,
  handleConnectGoogle,
  handleCreateCampaign,
  selectedAccountId,
  onSelectAccount,
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
                <Badge variant={account.platform === "google" ? "default" : "secondary"}>
                  {account.platform === "google" ? "Google" : "YouTube"}
                </Badge>
                {selectedAccountId === account.id && (
                  <Badge variant="outline" className="ml-2 bg-primary/10">Selected</Badge>
                )}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSyncAccount(account.id);
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConnectGoogle();
                  }}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-center pt-2">
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

export { Link };
