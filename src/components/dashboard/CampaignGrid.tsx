
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
  const { campaigns, isLoading } = useCampaign();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);
  
  React.useEffect(() => {
    const checkAuth = async () => {
      setIsChecking(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
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

  // Show authentication UI if not authenticated
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
