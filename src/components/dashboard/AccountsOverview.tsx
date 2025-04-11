
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCampaign } from "@/contexts/CampaignContext";
import { CheckCircle, AlertCircle, PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function AccountsOverview() {
  const { accountConnections, fetchGoogleAdsAccounts, isLoading } = useCampaign();
  const navigate = useNavigate();
  const connectedAccounts = accountConnections.filter(account => account.isConnected);
  const pendingAccounts = accountConnections.filter(account => !account.isConnected);

  const handleRefreshAccounts = async () => {
    await fetchGoogleAdsAccounts();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Accounts Overview</CardTitle>
          <CardDescription>Manage your Google Ads accounts</CardDescription>
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
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success-DEFAULT" />
                <h3 className="font-medium">Connected Accounts ({connectedAccounts.length})</h3>
              </div>
              {connectedAccounts.length > 0 ? (
                <div className="space-y-3">
                  {connectedAccounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between bg-secondary/10 rounded-md p-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{account.name}</span>
                        <Badge variant="default">{account.platform}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {account.customerId ? `ID: ${account.customerId}` : ''}
                        {account.lastSynced ? ` • Last synced: ${new Date(account.lastSynced).toLocaleDateString()}` : "Never"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-2 border border-dashed rounded-md p-3">
                  No connected accounts yet
                </div>
              )}
            </div>
            
            {pendingAccounts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning-DEFAULT" />
                  <h3 className="font-medium">Pending Connections ({pendingAccounts.length})</h3>
                </div>
                <div className="space-y-3">
                  {pendingAccounts.map(account => (
                    <div key={account.id} className="flex items-center justify-between bg-warning-muted rounded-md p-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{account.name}</span>
                        <Badge variant="outline">{account.platform}</Badge>
                      </div>
                      <Button size="sm" onClick={() => navigate("/accounts")}>Connect</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        <div className="pt-2">
          <Button onClick={() => navigate("/accounts")} className="w-full" variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" />
            Manage Accounts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
