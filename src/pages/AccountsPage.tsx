
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const AccountsPage = () => {
  const { user } = useAuth();
  const { 
    accountConnections, 
    campaigns,
    isLoading,
  } = useCampaign();
  
  const navigate = useNavigate();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [allAccountConnections, setAllAccountConnections] = useState([...accountConnections]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
  }, [user, navigate]);
  
  // Update local state when accountConnections changes
  useEffect(() => {
    setAllAccountConnections(accountConnections);
  }, [accountConnections]);

  const handleSelectAccount = (accountId: string) => {
    setSelectedAccountId(accountId);
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
      </div>
      
      <Alert className="mb-4 bg-blue-50 border-blue-200">
        <AlertCircle className="h-4 w-4 text-blue-500" />
        <AlertDescription className="text-blue-800">
          <span>We've removed all integrations. New integration functionality will be implemented soon.</span>
        </AlertDescription>
      </Alert>
      
      {allAccountConnections.length > 0 ? (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleCreateCampaign}
            size="lg"
            disabled={!selectedAccountId}
          >
            Create Campaign with Selected Account
          </Button>
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <div className="text-center max-w-md">
            <h3 className="text-lg font-medium mb-2">No Connected Accounts</h3>
            <p className="text-muted-foreground mb-4">
              Account connections are being reimplemented. Check back later for the new integration experience.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
