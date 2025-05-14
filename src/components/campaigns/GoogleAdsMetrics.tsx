
import React from "react";
import type { Campaign } from "@/types/campaign-base";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface GoogleAdsMetricsProps {
  campaign: Campaign;
}

const GoogleAdsMetrics: React.FC<GoogleAdsMetricsProps> = ({ campaign }) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Google Ads Metrics</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={true}
        >
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-800">Integration Update</AlertTitle>
          <AlertDescription className="text-blue-700">
            <p>The Google Ads integration is being reimplemented with an improved experience.</p>
            <p className="mt-2">New functionality will be available soon.</p>
          </AlertDescription>
        </Alert>
        
        <div className="flex justify-center py-8">
          <div className="text-center max-w-md space-y-4">
            <h3 className="text-lg font-medium">Google Ads Integration</h3>
            <p className="text-muted-foreground">
              We're building a new Google Ads integration that will provide enhanced campaign tracking 
              and performance metrics. Check back soon for updates.
            </p>
            <Button 
              variant="outline" 
              disabled={true}
              className="mt-2"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect to Google Ads
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleAdsMetrics;
