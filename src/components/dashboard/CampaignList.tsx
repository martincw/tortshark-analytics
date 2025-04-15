
import React from "react";
import { Campaign } from "@/types/campaign";
import { CampaignCard } from "./CampaignCard";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";

interface CampaignListProps {
  campaigns: Campaign[];
  onClearFilters: () => void;
}

export function CampaignList({ campaigns, onClearFilters }: CampaignListProps) {
  const { dateRange } = useCampaign();
  
  React.useEffect(() => {
    console.log("CampaignList - Received campaigns:", campaigns);
    console.log("CampaignList - Using date range:", dateRange.startDate, "to", dateRange.endDate);
    
    // Calculate total metrics to debug
    const totalLeads = campaigns.reduce((sum, camp) => sum + camp.manualStats.leads, 0);
    const totalCases = campaigns.reduce((sum, camp) => sum + camp.manualStats.cases, 0);
    const totalRevenue = campaigns.reduce((sum, camp) => sum + camp.manualStats.revenue, 0);
    const totalAdSpend = campaigns.reduce((sum, camp) => sum + camp.stats.adSpend, 0);
    
    console.log("CampaignList - Totals:", {
      leads: totalLeads,
      cases: totalCases,
      revenue: totalRevenue,
      adSpend: totalAdSpend
    });
    
    // Log each campaign's stats history to debug date filtering issues
    campaigns.forEach(campaign => {
      console.log(`Campaign ${campaign.name} has ${campaign.statsHistory.length} stats history entries`);
      
      if (campaign.statsHistory.length > 0) {
        const firstEntry = campaign.statsHistory[0];
        const lastEntry = campaign.statsHistory[campaign.statsHistory.length - 1];
        console.log(`First entry date: ${firstEntry.date}, Last entry date: ${lastEntry.date}`);
      }
    });
  }, [campaigns, dateRange]);
  
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <p className="text-lg font-medium text-muted-foreground">No campaigns found</p>
        <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search terms</p>
        <Button 
          variant="outline" 
          onClick={onClearFilters}
          className="mt-4"
        >
          Clear filters
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
