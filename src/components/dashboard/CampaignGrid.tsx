
import React from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { useCampaignGridData } from "@/hooks/useCampaignGridData";
import { CampaignFilters } from "./CampaignFilters";
import { CampaignList } from "./CampaignList";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

export function CampaignGrid() {
  const { campaigns, isLoading, migrateFromLocalStorage } = useCampaign();
  const navigate = useNavigate();
  const [hasLocalData, setHasLocalData] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);
  
  React.useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        // Check if there's localStorage data to migrate
        const storedCampaigns = localStorage.getItem("campaigns");
        setHasLocalData(!!storedCampaigns);
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAuth();
  }, []);
  
  const {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filterCampaign,
    setFilterCampaign,
    campaignTypes,
    sortedAndFilteredCampaigns
  } = useCampaignGridData(campaigns);

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCampaign("all");
  };

  // Show migration UI if not authenticated or there's local data
  if (!isAuthenticated && !isChecking) {
    return (
      <div className="space-y-4 border p-6 rounded-lg">
        <h2 className="text-xl font-semibold">Authentication Required</h2>
        <p className="text-muted-foreground">
          You need to sign in to view and manage your campaigns.
        </p>
        <Button onClick={() => navigate("/auth")}>
          <LogIn className="mr-2 h-4 w-4" /> Sign In to Continue
        </Button>
      </div>
    );
  }
  
  // Show migration UI if there's local data
  if (hasLocalData && !isLoading) {
    return (
      <div className="space-y-4 border p-6 rounded-lg">
        <h2 className="text-xl font-semibold">Migrate Your Campaign Data</h2>
        <p className="text-muted-foreground">
          We've detected campaign data in your browser's local storage. 
          Would you like to migrate this data to your account?
        </p>
        <div className="flex gap-2">
          <Button 
            onClick={async () => {
              await migrateFromLocalStorage();
              setHasLocalData(false);
            }}
          >
            Migrate Local Data
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setHasLocalData(false)}
          >
            Skip Migration
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || isChecking) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CampaignFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filterCampaign={filterCampaign}
        setFilterCampaign={setFilterCampaign}
        campaignTypes={campaignTypes}
      />
      
      <CampaignList 
        campaigns={sortedAndFilteredCampaigns} 
        onClearFilters={clearFilters} 
      />
    </div>
  );
}
