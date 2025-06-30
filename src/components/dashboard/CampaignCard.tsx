
import React from 'react';
import { Campaign } from '@/types/campaign';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{campaign.name}</CardTitle>
          <Badge variant={campaign.is_active ? "default" : "secondary"}>
            {campaign.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{campaign.platform}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium">Leads</p>
            <p className="text-2xl font-bold">{campaign.manualStats?.leads || 0}</p>
          </div>
          <div>
            <p className="font-medium">Cases</p>
            <p className="text-2xl font-bold">{campaign.manualStats?.cases || 0}</p>
          </div>
          <div>
            <p className="font-medium">Revenue</p>
            <p className="text-2xl font-bold">${(campaign.manualStats?.revenue || 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="font-medium">Ad Spend</p>
            <p className="text-2xl font-bold">${(campaign.stats?.adSpend || 0).toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
