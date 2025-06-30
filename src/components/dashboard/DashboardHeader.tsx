
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

export function DashboardHeader() {
  const navigate = useNavigate();
  const { campaigns, selectedCampaignIds, setSelectedCampaignIds } = useCampaign();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Calculate active and inactive campaign counts
  const activeCampaigns = campaigns.filter(campaign => campaign.is_active !== false).length;
  const inactiveCampaigns = campaigns.filter(campaign => campaign.is_active === false).length;
  
  const handleCampaignToggle = (campaignId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const newSelectedIds = [...selectedCampaignIds];
    
    if (newSelectedIds.includes(campaignId)) {
      const index = newSelectedIds.indexOf(campaignId);
      if (index !== -1) {
        newSelectedIds.splice(index, 1);
      }
    } else {
      newSelectedIds.push(campaignId);
    }
    
    setSelectedCampaignIds(newSelectedIds);
  };
  
  const handleSelectAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedCampaignIds(campaigns.map(campaign => campaign.id));
  };
  
  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedCampaignIds([]);
  };
  
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
          <Button variant="outline">
            <Calendar className="mr-2 h-4 w-4" /> Add Stats
          </Button>
          <Button className="w-full md:w-auto" onClick={() => navigate("/add-campaign")}>
            <Plus className="mr-2 h-4 w-4" /> Add Campaign
          </Button>
        </div>
      </div>
      
      {/* Campaign Status Indicators */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            Active: {activeCampaigns}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
          <XCircle className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-600">
            Inactive: {inactiveCampaigns}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-sm font-medium text-blue-700">
            Total: {campaigns.length}
          </span>
        </div>
      </div>
    </div>
  );
}
