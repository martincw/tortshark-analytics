import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { RefreshCw, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GoogleAdsAccount {
  id: string;
  customerId: string;
  name: string;
  currency?: string;
  timeZone?: string;
  status?: string;
  isConnected?: boolean;
}

interface GoogleAdsAccountSelectorProps {
  onAccountsConnected?: () => void;
}

const GoogleAdsAccountSelector: React.FC<GoogleAdsAccountSelectorProps> = ({ 
  onAccountsConnected 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch available Google Ads accounts
      const { data, error: funcError } = await supabase.functions.invoke('google-ads-accounts', {
        body: { action: 'list' }
      });

      if (funcError) throw funcError;

      if (data?.accounts) {
        // Also check which accounts are already connected
        const { data: existingConnections } = await supabase
          .from('account_connections')
          .select('customer_id')
          .eq('platform', 'google_ads')
          .eq('is_connected', true);

        const connectedIds = new Set(existingConnections?.map(c => c.customer_id) || []);

        const accountsWithStatus = data.accounts.map((acc: GoogleAdsAccount) => ({
          ...acc,
          isConnected: connectedIds.has(acc.customerId || acc.id)
        }));

        setAccounts(accountsWithStatus);

        // Pre-select already connected accounts
        const preSelectedIds = accountsWithStatus
          .filter((a: GoogleAdsAccount) => a.isConnected)
          .map((a: GoogleAdsAccount) => a.customerId || a.id);
        setSelectedAccounts(new Set<string>(preSelectedIds));
      }
    } catch (err: any) {
      console.error("Error fetching Google Ads accounts:", err);
      setError(err.message || "Failed to fetch accounts");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) {
        newSet.delete(accountId);
      } else {
        newSet.add(accountId);
      }
      return newSet;
    });
  };

  const handleSaveConnections = async () => {
    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get workspace
      const { data: workspace } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      // First, disconnect all existing Google Ads connections
      await supabase
        .from('account_connections')
        .update({ is_connected: false })
        .eq('user_id', user.id)
        .eq('platform', 'google_ads');

      // Now connect selected accounts
      for (const account of accounts) {
        const accountId = account.customerId || account.id;
        const isSelected = selectedAccounts.has(accountId);

        if (isSelected) {
          // Upsert the connection
          await supabase
            .from('account_connections')
            .upsert({
              user_id: user.id,
              workspace_id: workspace?.workspace_id,
              platform: 'google_ads',
              customer_id: accountId,
              name: account.name || `Account ${accountId}`,
              is_connected: true,
              last_synced: new Date().toISOString()
            }, {
              onConflict: 'user_id,platform,customer_id'
            });
        }
      }

      toast.success(`Connected ${selectedAccounts.size} Google Ads account(s)`);
      onAccountsConnected?.();
    } catch (err: any) {
      console.error("Error saving connections:", err);
      toast.error(err.message || "Failed to save connections");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Google Ads Accounts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Google Ads Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchAccounts} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Select Google Ads Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No Google Ads accounts found. Make sure you have access to at least one Google Ads account.
            </AlertDescription>
          </Alert>
          <Button onClick={fetchAccounts} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Select Google Ads Accounts</CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchAccounts}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose which Google Ads accounts you want to connect to TortShark.
        </p>

        <div className="space-y-2">
          {accounts.map((account) => {
            const accountId = account.customerId || account.id;
            const isSelected = selectedAccounts.has(accountId);

            return (
              <div
                key={accountId}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50'
                }`}
                onClick={() => toggleAccount(accountId)}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleAccount(accountId)}
                  />
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {accountId}
                      {account.currency && ` • ${account.currency}`}
                    </p>
                  </div>
                </div>
                {account.isConnected && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="h-3 w-3" />
                    Connected
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {selectedAccounts.size} account(s) selected
          </p>
          <Button 
            onClick={handleSaveConnections} 
            disabled={isSaving || selectedAccounts.size === 0}
          >
            {isSaving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Connections
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleAdsAccountSelector;
