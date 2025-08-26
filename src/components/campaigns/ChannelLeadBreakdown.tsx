import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/campaignUtils";
import { Campaign } from "@/types/campaign";

interface ChannelLeadBreakdownProps {
  campaign: Campaign;
  dateRange?: {
    startDate: string | null;
    endDate: string | null;
  };
}

export function ChannelLeadBreakdown({ campaign, dateRange }: ChannelLeadBreakdownProps) {
  // Filter stats history based on date range
  const filteredHistory = React.useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) {
      return campaign.statsHistory;
    }
    
    return campaign.statsHistory.filter(entry => {
      const entryDate = new Date(entry.date);
      const startDate = new Date(dateRange.startDate!);
      const endDate = new Date(dateRange.endDate!);
      return entryDate >= startDate && entryDate <= endDate;
    });
  }, [campaign.statsHistory, dateRange]);

  // Calculate channel totals with migration logic
  const channelTotals = React.useMemo(() => {
    return filteredHistory.reduce(
      (totals, entry) => {
        // Handle migration case: if no platform breakdown but has total data, treat as YouTube
        const hasLeads = entry.leads && entry.leads > 0;
        const hasAdSpend = entry.adSpend && entry.adSpend > 0;
        const hasPlatformBreakdown = (entry.youtube_leads || 0) + (entry.meta_leads || 0) + (entry.newsbreak_leads || 0) > 0 ||
                                   (entry.youtube_spend || 0) + (entry.meta_spend || 0) + (entry.newsbreak_spend || 0) > 0;
        
        const youtubeLeads = hasPlatformBreakdown ? (entry.youtube_leads || 0) : (hasLeads ? entry.leads : 0);
        const youtubeSpend = hasPlatformBreakdown ? (entry.youtube_spend || 0) : (hasAdSpend ? entry.adSpend : 0);
        
        return {
          youtube: {
            leads: totals.youtube.leads + youtubeLeads,
            spend: totals.youtube.spend + youtubeSpend
          },
          meta: {
            leads: totals.meta.leads + (entry.meta_leads || 0),
            spend: totals.meta.spend + (entry.meta_spend || 0)
          },
          newsbreak: {
            leads: totals.newsbreak.leads + (entry.newsbreak_leads || 0),
            spend: totals.newsbreak.spend + (entry.newsbreak_spend || 0)
          },
          total: {
            leads: totals.total.leads + (entry.leads || 0),
            spend: totals.total.spend + (entry.adSpend || 0)
          }
        };
      },
      { 
        youtube: { leads: 0, spend: 0 },
        meta: { leads: 0, spend: 0 },
        newsbreak: { leads: 0, spend: 0 },
        total: { leads: 0, spend: 0 }
      }
    );
  }, [filteredHistory]);

  const hasChannelData = channelTotals.youtube.leads > 0 || 
                         channelTotals.meta.leads > 0 || 
                         channelTotals.newsbreak.leads > 0;
  const hasTotalData = channelTotals.total.leads > 0;

  if (!hasChannelData && !hasTotalData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Lead Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No lead data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // If we only have total data but no channel breakdown, show total summary
  if (!hasChannelData && hasTotalData) {
    const avgCpl = channelTotals.total.spend > 0 ? channelTotals.total.spend / channelTotals.total.leads : 0;
    
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Lead Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-lg">{channelTotals.total.leads}</div>
                <div className="text-muted-foreground">Total Leads</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">{formatCurrency(channelTotals.total.spend)}</div>
                <div className="text-muted-foreground">Total Spend</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">{formatCurrency(avgCpl)}</div>
                <div className="text-muted-foreground">Avg CPL</div>
              </div>
            </div>
            <div className="text-center py-4 text-muted-foreground">
              Channel-specific breakdown not available. Edit entries to add platform-specific data.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const channels = [
    { 
      name: 'YouTube', 
      leads: channelTotals.youtube.leads, 
      spend: channelTotals.youtube.spend,
      color: 'bg-red-500' 
    },
    { 
      name: 'Meta', 
      leads: channelTotals.meta.leads, 
      spend: channelTotals.meta.spend,
      color: 'bg-blue-500' 
    },
    { 
      name: 'Newsbreak', 
      leads: channelTotals.newsbreak.leads, 
      spend: channelTotals.newsbreak.spend,
      color: 'bg-green-500' 
    }
  ].filter(channel => channel.leads > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Lead Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-lg">{channelTotals.total.leads}</div>
              <div className="text-muted-foreground">Total Leads</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">{formatCurrency(channelTotals.total.spend)}</div>
              <div className="text-muted-foreground">Total Spend</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-lg">
                {channelTotals.total.leads > 0 
                  ? formatCurrency(channelTotals.total.spend / channelTotals.total.leads)
                  : '$0.00'
                }
              </div>
              <div className="text-muted-foreground">Avg CPL</div>
            </div>
          </div>
          
          <div className="space-y-3">
            {channels.map((channel) => {
              const cpl = channel.leads > 0 ? channel.spend / channel.leads : 0;
              const leadsPercentage = channelTotals.total.leads > 0 ? (channel.leads / channelTotals.total.leads) * 100 : 0;
              
              return (
                <div key={channel.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${channel.color}`} />
                      <span className="font-medium">{channel.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{channel.leads} leads</div>
                      <div className="text-sm text-muted-foreground">{leadsPercentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div>Spend: {formatCurrency(channel.spend)}</div>
                    <div className="font-medium">CPL: {formatCurrency(cpl)}</div>
                  </div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${channel.color}`}
                      style={{ width: `${leadsPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Show recent entries with channel breakdown */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Recent Channel Performance</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filteredHistory
                .filter(entry => (entry.youtube_leads || 0) + (entry.meta_leads || 0) + (entry.newsbreak_leads || 0) > 0)
                .slice(0, 5)
                .map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="font-medium">{new Date(entry.date).toLocaleDateString()}</span>
                    <div className="flex gap-4 text-xs">
                      {entry.youtube_leads && entry.youtube_leads > 0 && (
                        <span className="text-red-600">
                          YT: {entry.youtube_leads} leads 
                          {entry.youtube_spend && entry.youtube_spend > 0 && (
                            <span className="text-gray-500">
                              ({formatCurrency(entry.youtube_spend / entry.youtube_leads)} CPL)
                            </span>
                          )}
                        </span>
                      )}
                      {entry.meta_leads && entry.meta_leads > 0 && (
                        <span className="text-blue-600">
                          Meta: {entry.meta_leads} leads
                          {entry.meta_spend && entry.meta_spend > 0 && (
                            <span className="text-gray-500">
                              ({formatCurrency(entry.meta_spend / entry.meta_leads)} CPL)
                            </span>
                          )}
                        </span>
                      )}
                      {entry.newsbreak_leads && entry.newsbreak_leads > 0 && (
                        <span className="text-green-600">
                          NB: {entry.newsbreak_leads} leads
                          {entry.newsbreak_spend && entry.newsbreak_spend > 0 && (
                            <span className="text-gray-500">
                              ({formatCurrency(entry.newsbreak_spend / entry.newsbreak_leads)} CPL)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}