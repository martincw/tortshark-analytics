import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Link2, X, RefreshCw, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const UnmappedCampaignsBanner: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [unmappedCount, setUnmappedCount] = useState(0);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const fetchUnmappedCount = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-ads-sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: "get-unmapped-count",
            userId: user.id,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setUnmappedCount(data.unmappedCount || 0);
        setTotalCampaigns(data.totalCampaigns || 0);
        setLastSynced(new Date());
      }
    } catch (error) {
      console.error("Error fetching unmapped count:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnmappedCount();
    
    // Refresh every 15 minutes
    const interval = setInterval(fetchUnmappedCount, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  if (isLoading || isDismissed || unmappedCount === 0) {
    return null;
  }

  return (
    <Alert className="bg-amber-500/10 border-amber-500/30 mb-4">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <span className="text-amber-700 font-medium">
            {unmappedCount} Google Ads campaign{unmappedCount > 1 ? "s" : ""} not mapped
          </span>
          <span className="text-muted-foreground text-sm">
            — Map them to sync ad spend automatically
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/data-sources")}
            className="gap-1 text-amber-700 border-amber-500/50 hover:bg-amber-500/20"
          >
            <Link2 className="h-3 w-3" />
            Map Campaigns
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsDismissed(true)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default UnmappedCampaignsBanner;
