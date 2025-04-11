
import React, { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import type { Campaign, GoogleAdsMetrics as GoogleAdsMetricsType } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GoogleAdsMetricsProps {
  campaign: Campaign;
}

const GoogleAdsMetrics: React.FC<GoogleAdsMetricsProps> = ({ campaign }) => {
  const { accountConnections, dateRange, fetchGoogleAdsMetrics } = useCampaign();
  const [metrics, setMetrics] = useState<GoogleAdsMetricsType[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const account = accountConnections.find(acc => acc.id === campaign.accountId);
  const isAccountConnected = account?.isConnected ?? false;
  
  const loadMetrics = async () => {
    if (!campaign.accountId || !isAccountConnected) {
      setError("Google Ads account not connected");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchGoogleAdsMetrics(campaign.accountId, dateRange);
      setMetrics(data);
    } catch (err) {
      setError("Failed to load Google Ads metrics");
      console.error("Error loading metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    if (isAccountConnected) {
      loadMetrics();
    }
  }, [campaign.accountId, dateRange, isAccountConnected]);
  
  // Calculate aggregated metrics
  const aggregatedMetrics = metrics ? metrics.reduce((acc, curr) => {
    return {
      impressions: acc.impressions + curr.impressions,
      clicks: acc.clicks + curr.clicks,
      adSpend: acc.adSpend + curr.adSpend,
      ctr: 0, // Will calculate below
      cpc: 0, // Will calculate below
      cpl: 0, // Will calculate below
      date: ""
    };
  }, { impressions: 0, clicks: 0, adSpend: 0, ctr: 0, cpc: 0, cpl: 0, date: "" }) : null;
  
  // Calculate derived metrics
  if (aggregatedMetrics) {
    aggregatedMetrics.ctr = aggregatedMetrics.impressions > 0 
      ? (aggregatedMetrics.clicks / aggregatedMetrics.impressions) * 100 
      : 0;
    aggregatedMetrics.cpc = aggregatedMetrics.clicks > 0 
      ? aggregatedMetrics.adSpend / aggregatedMetrics.clicks 
      : 0;
    // Estimate CPL using campaign data
    const leads = campaign.manualStats.leads || 1; // Prevent division by zero
    aggregatedMetrics.cpl = aggregatedMetrics.adSpend / leads;
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Google Ads Metrics</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadMetrics} 
          disabled={isLoading || !isAccountConnected}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {!isAccountConnected ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Google Ads account not connected. Please connect your account in the Accounts page.
            </AlertDescription>
          </Alert>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : metrics && aggregatedMetrics ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard 
              title="Impressions" 
              value={aggregatedMetrics.impressions.toLocaleString()} 
            />
            <MetricCard 
              title="Clicks" 
              value={aggregatedMetrics.clicks.toLocaleString()} 
            />
            <MetricCard 
              title="CTR" 
              value={`${aggregatedMetrics.ctr.toFixed(2)}%`} 
            />
            <MetricCard 
              title="CPC" 
              value={formatCurrency(aggregatedMetrics.cpc)} 
            />
            <MetricCard 
              title="Ad Spend" 
              value={formatCurrency(aggregatedMetrics.adSpend)} 
            />
            <MetricCard 
              title="CPL" 
              value={formatCurrency(aggregatedMetrics.cpl)} 
            />
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No metrics data available
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value }) => (
  <div className="bg-muted/50 p-4 rounded-md">
    <div className="text-muted-foreground text-sm font-medium mb-1">{title}</div>
    <div className="text-xl font-semibold">{value}</div>
  </div>
);

export default GoogleAdsMetrics;
