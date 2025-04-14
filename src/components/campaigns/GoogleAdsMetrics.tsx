
import React, { useState, useEffect } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import type { Campaign, GoogleAdsMetrics as GoogleAdsMetricsType } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, TrendingUp } from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";
import { fetchGoogleAdsMetrics } from "@/services/googleAdsService";

interface GoogleAdsMetricsProps {
  campaign: Campaign;
}

const GoogleAdsMetrics: React.FC<GoogleAdsMetricsProps> = ({ campaign }) => {
  const { accountConnections, dateRange } = useCampaign();
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
      // Pass date range with fixed formatting
      console.log(`GoogleAdsMetrics: Fetching with date range ${dateRange.startDate} to ${dateRange.endDate}`);
      const data = await fetchGoogleAdsMetrics(
        campaign.accountId, 
        dateRange
      );
      
      if (data) {
        // Sort metrics by date
        const sortedMetrics = [...data].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        
        console.log(`GoogleAdsMetrics: Received ${sortedMetrics.length} data points`);
        setMetrics(sortedMetrics);
      } else {
        setError("Failed to load Google Ads metrics");
      }
    } catch (err) {
      setError("Failed to load Google Ads metrics");
      console.error("Error loading metrics:", err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reload data when date range changes
  useEffect(() => {
    if (isAccountConnected) {
      loadMetrics();
    }
  }, [campaign.accountId, dateRange.startDate, dateRange.endDate, isAccountConnected]);
  
  const handleRefresh = () => {
    toast.info("Refreshing Google Ads metrics...");
    loadMetrics();
  };

  // Format dates for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
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
          onClick={handleRefresh} 
          disabled={isLoading || !isAccountConnected}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Loading...' : 'Refresh'}
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
        ) : isLoading && !metrics ? (
          <div className="flex justify-center py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : metrics && metrics.length > 0 ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <MetricCard 
                title="Impressions" 
                value={formatNumber(aggregatedMetrics?.impressions || 0)} 
              />
              <MetricCard 
                title="Clicks" 
                value={formatNumber(aggregatedMetrics?.clicks || 0)} 
              />
              <MetricCard 
                title="CTR" 
                value={formatPercent(aggregatedMetrics?.ctr || 0)} 
              />
              <MetricCard 
                title="CPC" 
                value={formatCurrency(aggregatedMetrics?.cpc || 0)} 
              />
              <MetricCard 
                title="Ad Spend" 
                value={formatCurrency(aggregatedMetrics?.adSpend || 0)} 
              />
              <MetricCard 
                title="CPL" 
                value={formatCurrency(aggregatedMetrics?.cpl || 0)} 
              />
            </div>
            
            <div className="mt-6">
              <div className="flex items-center mb-3">
                <TrendingUp className="mr-2 h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium">Performance Trends</h3>
              </div>
              
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={metrics}
                    margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right"
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === "adSpend") return [`$${value}`, "Ad Spend"];
                        if (name === "clicks") return [value, "Clicks"];
                        return [value, name];
                      }}
                      labelFormatter={(label) => formatDate(label as string)}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="adSpend"
                      name="Ad Spend"
                      stroke="#6366f1"
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="clicks"
                      name="Clicks"
                      stroke="#f97316"
                      activeDot={{ r: 6 }}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            No metrics data available for the selected date range
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
