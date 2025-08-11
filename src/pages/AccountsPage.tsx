
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { ConnectedAccounts } from "@/components/accounts/ConnectedAccounts";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { CampaignMappingDialog } from "@/components/accounts/CampaignMappingDialog";
import { useAuth } from "@/contexts/AuthContext";


const AccountsPage = () => {
  const { user } = useAuth();
  const { 
    accountConnections, 
    fetchGoogleAdsAccounts,
    campaigns,
    isLoading,
    addAccountConnection
  } = useCampaign();
  
  const navigate = useNavigate();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMappingDialogOpen, setIsMappingDialogOpen] = useState(false);
  const [mappingAccountId, setMappingAccountId] = useState<string>("");
  const [allAccountConnections, setAllAccountConnections] = useState([...accountConnections]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const loadAllConnections = async () => {
      try {
        setIsRefreshing(true);
        
        // Check Google Auth status
        const { isGoogleAuthValid } = await import("@/services/googleAdsService");
        const isValid = await isGoogleAuthValid();
        setIsGoogleConnected(isValid);
        
        // Fetch Google accounts
        await fetchGoogleAdsAccounts();
        
        
      } catch (error) {
        console.error("Error loading connections:", error);
      } finally {
        setIsRefreshing(false);
      }
    };
    
    loadAllConnections();
  }, [user, navigate]);
  
  // Update local state when accountConnections changes
  useEffect(() => {
    setAllAccountConnections(accountConnections);
  }, [accountConnections]);
  
  const refreshAccounts = async () => {
    setIsRefreshing(true);
    try {
      // Fetch Google accounts
      await fetchGoogleAdsAccounts();
      
      
      toast.success("All platform connections refreshed");
    } catch (error) {
      console.error("Error refreshing accounts:", error);
      toast.error("Failed to refresh accounts");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
  };
  
  const handleOpenMappingDialog = (accountId: string) => {
    setMappingAccountId(accountId);
    setIsMappingDialogOpen(true);
  };

  const handleCreateCampaign = () => {
    if (selectedAccountId) {
      navigate(`/add-campaign?accountId=${selectedAccountId}`);
    } else {
      toast.error("Please select an account first");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Connected Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Select an account to create campaigns and track performance
          </p>
        </div>
        
        <Button 
          variant="outline"
          onClick={refreshAccounts}
          disabled={isRefreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Accounts'}
        </Button>
      </div>
      
      {!isGoogleConnected && (
        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-800 flex justify-between items-center">
            <span>Connect your Google Ads account to import campaigns</span>
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
      
      <ConnectedAccounts
        accountConnections={allAccountConnections}
        isLoading={isLoading || isRefreshing}
        selectedAccountId={selectedAccountId}
        onSelectAccount={handleSelectAccount}
        onMapCampaigns={handleOpenMappingDialog}
        campaigns={campaigns}
      />

      {allAccountConnections.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleCreateCampaign}
            size="lg"
            disabled={!selectedAccountId}
          >
            Create Campaign with Selected Account
          </Button>
        </div>
      )}
      
      <CampaignMappingDialog 
        isOpen={isMappingDialogOpen} 
        onClose={() => setIsMappingDialogOpen(false)}
        accountId={mappingAccountId}
        campaigns={campaigns}
      />
    </div>
  );
};

export default AccountsPage;
