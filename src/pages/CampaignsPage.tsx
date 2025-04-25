
import React, { useEffect, useState } from "react";
import { CampaignGrid } from "@/components/dashboard/CampaignGrid";
import { Button } from "@/components/ui/button";
import { Plus, Link, Bug, LayoutGrid, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CampaignsPage = () => {
  const navigate = useNavigate();
  const { campaigns, isLoading, dateRange } = useCampaign();
  const [showDebug, setShowDebug] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  
  useEffect(() => {
    const checkAuth = async () => {
      setIsCheckingAuth(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error("Error checking auth:", error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, []);

  // Log date range for debugging
  useEffect(() => {
    if (dateRange.startDate) {
      console.log("CampaignsPage date range:", dateRange.startDate, "to", dateRange.endDate);
    }
  }, [dateRange]);

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

  // Show auth prompt if user is not authenticated
  if (!isAuthenticated && !isCheckingAuth) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mass Tort Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Manage your case acquisition campaigns and track performance
            </p>
          </div>
        </div>
        
        <div className="bg-muted/30 p-8 rounded-lg text-center space-y-4">
          <h2 className="text-2xl font-semibold">Authentication Required</h2>
          <p className="text-muted-foreground">
            Please sign in to view and manage your campaigns
          </p>
          <Button 
            onClick={() => navigate("/auth")}
            size="lg"
          >
            Sign In or Register
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || isCheckingAuth) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Mass Tort Campaigns</h1>
            <p className="text-muted-foreground mt-1">
              Manage your case acquisition campaigns and track performance
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mb-4"></div>
          <p className="text-lg font-medium">Loading campaigns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mass Tort Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage your case acquisition campaigns and track performance
          </p>
          {dateRange.startDate && (
            <div className="text-sm mt-1 text-muted-foreground">
              Showing data from <span className="font-medium">{dateRange.startDate}</span> to <span className="font-medium">{dateRange.endDate}</span>
            </div>
          )}
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
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
            <Button size="sm" variant="destructive" onClick={handleClearLocalStorage}>
              Clear LocalStorage
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate("/tools")}>
              Advanced Tools
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use these tools to help debug issues with your campaign data
          </p>
        </div>
      )}
      
      {campaigns.length === 0 ? (
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
        <CampaignGrid filteredCampaigns={campaigns} />
      )}
    </div>
  );
};

export default CampaignsPage;
