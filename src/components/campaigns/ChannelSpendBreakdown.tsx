
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
    console.log('=== CHANNEL SPEND BREAKDOWN DEBUG ===');
    console.log('Campaign:', campaign.name);
    console.log('Total history entries:', campaign.statsHistory.length);
    console.log('Filtered history entries:', filteredHistory.length);
    console.log('Date range:', dateRange);
    
    filteredHistory.forEach((entry, index) => {
      console.log(`Entry ${index + 1}:`, {
        date: entry.date,
        youtube_spend: entry.youtube_spend,
        meta_spend: entry.meta_spend,
        newsbreak_spend: entry.newsbreak_spend,
        adSpend: entry.adSpend,
        hasYoutube: !!entry.youtube_spend && entry.youtube_spend > 0,
        hasMeta: !!entry.meta_spend && entry.meta_spend > 0,
        hasNewsbreak: !!entry.newsbreak_spend && entry.newsbreak_spend > 0
      });
    });
    
    const totals = filteredHistory.reduce(
      (totals, entry) => ({
        youtube: totals.youtube + (entry.youtube_spend || 0),
        meta: totals.meta + (entry.meta_spend || 0),
        newsbreak: totals.newsbreak + (entry.newsbreak_spend || 0),
        total: totals.total + (entry.adSpend || 0)
      }),
      { youtube: 0, meta: 0, newsbreak: 0, total: 0 }
    );
    
    console.log('Calculated totals:', totals);
    console.log('Has channel data:', totals.youtube > 0 || totals.meta > 0 || totals.newsbreak > 0);
    console.log('=== END DEBUG ===');
    
    return totals;
  }, [filteredHistory, campaign.name, dateRange]);

  const hasChannelData = channelTotals.youtube > 0 || channelTotals.meta > 0 || channelTotals.newsbreak > 0;

  if (!hasChannelData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Channel Ad Spend Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No channel-specific ad spend data available
          </div>
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <div>Debug: Filtered entries: {filteredHistory.length}</div>
            <div>Date range: {dateRange?.startDate} to {dateRange?.endDate}</div>
            <div>Channel totals: YT: {channelTotals.youtube}, Meta: {channelTotals.meta}, NB: {channelTotals.newsbreak}</div>
            <div>Total ad spend: {channelTotals.total}</div>
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
