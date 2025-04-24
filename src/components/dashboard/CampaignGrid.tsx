
import React from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { useCampaignGridData } from "@/hooks/useCampaignGridData";
import { CampaignFilters } from "./CampaignFilters";
import { CampaignList } from "./CampaignList";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { standardizeDateString, isDateInRange } from "@/lib/utils/ManualDateUtils";

interface CampaignGridProps {
  filteredCampaigns?: Campaign[];
}

export function CampaignGrid({ filteredCampaigns }: CampaignGridProps) {
  const { campaigns, isLoading, dateRange } = useCampaign();
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
  
  const campaignsToUse = filteredCampaigns || campaigns;
  
  const {
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    filterCampaign,
    setFilterCampaign,
    campaignTypes,
    sortedAndFilteredCampaigns
  } = useCampaignGridData(campaignsToUse);

  // Log the date range to ensure it's consistent with other components
  React.useEffect(() => {
    const standardizedStartDate = dateRange.startDate ? standardizeDateString(dateRange.startDate) : null;
    const standardizedEndDate = dateRange.endDate ? standardizeDateString(dateRange.endDate) : null;
    
    console.log(
      "CampaignGrid using date range:", 
      standardizedStartDate, 
      "to", 
      standardizedEndDate
    );
    
    console.log(`CampaignGrid received ${campaignsToUse.length} campaigns`);
    
    // Debug stats history dates for any date-related issues
    if (campaignsToUse.length > 0) {
      campaignsToUse.forEach(campaign => {
        if (campaign.statsHistory && campaign.statsHistory.length > 0) {
          console.log(`Campaign ${campaign.name} (${campaign.id}) has ${campaign.statsHistory.length} history entries`);
          
          // Check if any entries fall within the current date range
          const entriesInRange = campaign.statsHistory.filter(entry => 
            dateRange.startDate && dateRange.endDate && 
            isDateInRange(entry.date, dateRange.startDate, dateRange.endDate)
          );
          
          console.log(`${entriesInRange.length} entries fall within the current date range`);
        }
      });
    }
  }, [dateRange, campaignsToUse]);

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
