
import React, { useEffect, useState } from "react";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { Button } from "@/components/ui/button";
import { Plus, Link, Bug, LayoutGrid, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { toast } from "sonner";

const CampaignsPage = () => {
  const navigate = useNavigate();
  const { campaigns, accountConnections, isLoading } = useCampaign();
  const [showDebug, setShowDebug] = useState(true); // Set to true to show debug tools by default
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  useEffect(() => {
    console.log("CampaignsPage - Mounted with campaigns:", campaigns.length);
    console.log("CampaignsPage - Campaign details:", campaigns);
    
    // Check localStorage directly as a backup
    const rawCampaigns = localStorage.getItem('campaigns');
    console.log("Direct localStorage check - campaigns:", rawCampaigns);
    
    if (campaigns.length === 0 && rawCampaigns) {
      toast.info("Found campaigns in localStorage but they're not loaded in the app. Try refreshing the page.");
    }
  }, [campaigns]);

  const handleDebugToggle = () => {
    setShowDebug(!showDebug);
  };

  const handleClearLocalStorage = () => {
    if (window.confirm("This will delete all your campaign data. Are you sure?")) {
      localStorage.removeItem('campaigns');
      localStorage.removeItem('accountConnections');
      toast.success("Local storage cleared. Refresh the page to see changes.");
    }
  };

  const inspectLocalStorage = () => {
    const rawCampaigns = localStorage.getItem('campaigns');
    console.log("Raw campaigns from localStorage:", rawCampaigns);
    
    if (rawCampaigns) {
      try {
        const parsedCampaigns = JSON.parse(rawCampaigns);
        console.log("Parsed campaigns:", parsedCampaigns);
        toast.success(`Found ${Array.isArray(parsedCampaigns) ? parsedCampaigns.length : 0} campaigns in localStorage`);
      } catch (e) {
        console.error("Error parsing campaigns:", e);
        toast.error("Error parsing campaign data");
      }
    } else {
      toast.error("No campaign data found in localStorage");
    }
  };

  const resetAppState = () => {
    // Force a re-initialization of the app by reloading the page
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mass Tort Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your case acquisition campaigns and track performance
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-md overflow-hidden mr-2">
            <Button 
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm" 
              className="rounded-none px-3"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Grid
            </Button>
            <Button 
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm" 
              className="rounded-none px-3"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
          <Button onClick={() => navigate("/add-campaign")}>
            <Plus className="mr-2 h-4 w-4" /> Add Campaign
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDebugToggle}
            title="Debug Tools"
          >
            <Bug className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {showDebug && (
        <div className="p-4 border border-dashed rounded-lg bg-muted/50">
          <h3 className="font-medium mb-2">Debug Tools</h3>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={inspectLocalStorage}>
              Inspect LocalStorage
            </Button>
            <Button size="sm" variant="outline" onClick={resetAppState}>
              Refresh App
            </Button>
            <Button size="sm" variant="destructive" onClick={handleClearLocalStorage}>
              Clear LocalStorage
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use these tools to help debug issues with your campaign data
          </p>
        </div>
      )}
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-lg font-medium">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 border border-dashed rounded-lg">
          <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
          <p className="text-muted-foreground mb-6">
            Create your first campaign to get started
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/add-campaign")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Campaign
            </Button>
            <Button onClick={() => navigate("/accounts")} variant="outline">
              <Link className="mr-2 h-4 w-4" />
              Manage Ad Accounts
            </Button>
          </div>
        </div>
      ) : (
        <CampaignGrid />
      )}
    </div>
  );
};

export default CampaignsPage;
