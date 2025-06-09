import React, { useState } from "react";
import { DateRangePicker } from "./DateRangePicker";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Calendar, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { AddStatsDialog } from "./AddStatsDialog";

export function DashboardHeader() {
  const navigate = useNavigate();
  const { campaigns, selectedCampaignIds, setSelectedCampaignIds } = useCampaign();
  const [isAddStatsDialogOpen, setIsAddStatsDialogOpen] = useState(false);
  // Add state for controlling dropdown open state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Calculate active and inactive campaign counts
  const activeCampaigns = campaigns.filter(campaign => campaign.is_active !== false).length;
  const inactiveCampaigns = campaigns.filter(campaign => campaign.is_active === false).length;
  
  const handleCampaignToggle = (campaignId: string, e: React.MouseEvent) => {
    // Prevent dropdown from closing
    e.preventDefault();
    e.stopPropagation();
    
    // Fix: Clone the array first, then modify it, and set the new array directly
    const newSelectedIds = [...selectedCampaignIds];
    
    if (newSelectedIds.includes(campaignId)) {
      // Remove the ID
      const index = newSelectedIds.indexOf(campaignId);
      if (index !== -1) {
        newSelectedIds.splice(index, 1);
      }
    } else {
      // Add the ID
      newSelectedIds.push(campaignId);
    }
    
    setSelectedCampaignIds(newSelectedIds);
  };
  
  const handleSelectAll = (e: React.MouseEvent) => {
    // Prevent dropdown from closing
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedCampaignIds(campaigns.map(campaign => campaign.id));
  };
  
  const handleClearAll = (e: React.MouseEvent) => {
    // Prevent dropdown from closing
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedCampaignIds([]);
  };
  
  // Function to manually close the dropdown when done selecting
  const handleCloseDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage all your mass tort advertising campaigns
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Campaigns
                {selectedCampaignIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedCampaignIds.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-72 bg-background" 
              // Fix: Use the correct event type expected by onCloseAutoFocus
              onCloseAutoFocus={(event: Event) => {
                event.preventDefault();
              }}
            >
              <DropdownMenuLabel>Select Campaigns for Dashboard</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
                {campaigns.map(campaign => (
                  <DropdownMenuCheckboxItem
                    key={campaign.id}
                    checked={selectedCampaignIds.includes(campaign.id)}
                    // Fix: Make sure we're passing the correct event type
                    onSelect={(e) => handleCampaignToggle(campaign.id, e as unknown as React.MouseEvent)}
                  >
                    {campaign.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              {campaigns.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <div className="p-2 flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={handleSelectAll}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={handleClearAll}
                    >
                      Clear All
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={handleCloseDropdown}
                    >
                      Done
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DateRangePicker />
          <Button variant="outline" onClick={() => setIsAddStatsDialogOpen(true)}>
            <Calendar className="mr-2 h-4 w-4" /> Add Stats
          </Button>
          <Button className="w-full md:w-auto" onClick={() => navigate("/add-campaign")}>
            <Plus className="mr-2 h-4 w-4" /> Add Campaign
          </Button>
        </div>
      </div>
      
      {/* Campaign Status Indicators */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-success-muted border border-success-DEFAULT/20 rounded-lg">
          <CheckCircle className="h-4 w-4 text-success-DEFAULT" />
          <span className="text-sm font-medium text-success-DEFAULT">
            Active: {activeCampaigns}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-muted border border-border rounded-lg">
          <XCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            Inactive: {inactiveCampaigns}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-accent border border-border rounded-lg">
          <span className="text-sm font-medium text-foreground">
            Total: {campaigns.length}
          </span>
        </div>
      </div>
      
      <AddStatsDialog 
        open={isAddStatsDialogOpen}
        onOpenChange={setIsAddStatsDialogOpen}
      />
    </div>
  );
}
