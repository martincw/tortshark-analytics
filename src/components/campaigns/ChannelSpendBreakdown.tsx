
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/campaignUtils";
import { Campaign } from "@/types/campaign";

interface ChannelSpendBreakdownProps {
  campaign: Campaign;
  dateRange?: {
    startDate: string | null;
    endDate: string | null;
  };
}

export function ChannelSpendBreakdown({ campaign, dateRange }: ChannelSpendBreakdownProps) {
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

  // Calculate channel totals
  const channelTotals = React.useMemo(() => {
    return filteredHistory.reduce(
      (totals, entry) => ({
        youtube: totals.youtube + (entry.youtube_spend || 0),
        meta: totals.meta + (entry.meta_spend || 0),
        newsbreak: totals.newsbreak + (entry.newsbreak_spend || 0),
        total: totals.total + (entry.adSpend || 0)
      }),
      { youtube: 0, meta: 0, newsbreak: 0, total: 0 }
    );
  }, [filteredHistory]);

  const hasChannelData = channelTotals.youtube > 0 || channelTotals.meta > 0 || channelTotals.newsbreak > 0;
  const hasTotalData = channelTotals.total > 0;

  if (!hasChannelData && !hasTotalData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Ad Spend Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No ad spend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // If we only have total data but no channel breakdown, show total as a single entry
  if (!hasChannelData && hasTotalData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Ad Spend Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-lg font-semibold">
              Total Ad Spend: {formatCurrency(channelTotals.total)}
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
    { name: 'YouTube', value: channelTotals.youtube, color: 'bg-red-500' },
    { name: 'Meta', value: channelTotals.meta, color: 'bg-blue-500' },
    { name: 'Newsbreak', value: channelTotals.newsbreak, color: 'bg-green-500' }
  ].filter(channel => channel.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Ad Spend Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-lg font-semibold">
            Total Ad Spend: {formatCurrency(channelTotals.total)}
          </div>
          
          <div className="space-y-3">
            {channels.map((channel) => {
              const percentage = channelTotals.total > 0 ? (channel.value / channelTotals.total) * 100 : 0;
              
              return (
                <div key={channel.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${channel.color}`} />
                      <span className="font-medium">{channel.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatCurrency(channel.value)}</div>
                      <div className="text-sm text-muted-foreground">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${channel.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Show recent entries with channel breakdown */}
          <div className="mt-6">
            <h4 className="font-medium mb-3">Recent Channel Spend</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filteredHistory
                .filter(entry => (entry.youtube_spend || 0) + (entry.meta_spend || 0) + (entry.newsbreak_spend || 0) > 0)
                .slice(0, 5)
                .map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center text-sm border-b pb-2">
                    <span className="font-medium">{new Date(entry.date).toLocaleDateString()}</span>
                    <div className="flex gap-4 text-xs">
                      {entry.youtube_spend && entry.youtube_spend > 0 && (
                        <span className="text-red-600">YT: {formatCurrency(entry.youtube_spend)}</span>
                      )}
                      {entry.meta_spend && entry.meta_spend > 0 && (
                        <span className="text-blue-600">Meta: {formatCurrency(entry.meta_spend)}</span>
                      )}
                      {entry.newsbreak_spend && entry.newsbreak_spend > 0 && (
                        <span className="text-green-600">NB: {formatCurrency(entry.newsbreak_spend)}</span>
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
