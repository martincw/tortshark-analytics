
import React from "react";
import { DateRangePicker } from "./DateRangePicker";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Check } from "lucide-react";
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
  
  const handleCampaignToggle = (campaignId: string) => {
    setSelectedCampaignIds(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      } else {
        return [...prev, campaignId];
      }
    });
  };
  
  const handleSelectAll = () => {
    setSelectedCampaignIds(campaigns.map(campaign => campaign.id));
  };
  
  const handleClearAll = () => {
    setSelectedCampaignIds([]);
  };

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaign Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage all your mass tort advertising campaigns
        </p>
      </div>
      <div className="flex gap-4 w-full md:w-auto">
        <DropdownMenu>
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
          <DropdownMenuContent className="w-72">
            <DropdownMenuLabel>Select Campaigns for Dashboard</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup className="max-h-[300px] overflow-y-auto">
              {campaigns.map(campaign => (
                <DropdownMenuCheckboxItem
                  key={campaign.id}
                  checked={selectedCampaignIds.includes(campaign.id)}
                  onCheckedChange={() => handleCampaignToggle(campaign.id)}
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
                </div>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <DateRangePicker />
        <Button className="w-full md:w-auto" onClick={() => navigate("/add-campaign")}>
          <Plus className="mr-2 h-4 w-4" /> Add Campaign
        </Button>
      </div>
    </div>
  );
}
