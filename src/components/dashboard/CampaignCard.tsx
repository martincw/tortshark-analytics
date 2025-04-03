
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campaign } from "@/types/campaign";
import { calculateMetrics, formatCurrency, formatNumber } from "@/utils/campaignUtils";
import { BadgeStat } from "@/components/ui/badge-stat";
import { useCampaign } from "@/contexts/CampaignContext";
import { useNavigate } from "react-router-dom";
import { AlertCircle, DollarSign, TrendingUp, Users, Calendar } from "lucide-react";
import { format } from "date-fns";

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const { setSelectedCampaignId } = useCampaign();
  const navigate = useNavigate();
  const metrics = calculateMetrics(campaign);
  
  const handleViewDetails = () => {
    setSelectedCampaignId(campaign.id);
    navigate(`/campaign/${campaign.id}`);
  };

  // Format the date
  const formattedDate = format(new Date(campaign.stats.date), "MMM d, yyyy");

  // Determine profitability class
  const getProfitabilityClass = () => {
    if (metrics.roi > 200) return "text-success-DEFAULT";
    if (metrics.roi > 0) return "text-secondary";
    return "text-error-DEFAULT";
  };

  // Extract campaign type (first part of the name before dash)
  const campaignType = campaign.name.split(" - ")[0];

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold">{campaign.name}</CardTitle>
            <p className="text-sm text-muted-foreground flex items-center mt-1">
              <Calendar className="h-3 w-3 mr-1" />
              {formattedDate}
            </p>
          </div>
          <Badge 
            variant={
              campaignType === "Rideshare" ? "default" : 
              campaignType === "LDS" ? "secondary" :
              campaignType === "MD" ? "outline" : "destructive"
            }
          >
            {campaignType}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Account: {campaign.accountName}</p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <BadgeStat 
              label="Ad Spend" 
              value={formatCurrency(campaign.stats.adSpend)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <BadgeStat 
              label="Leads" 
              value={formatNumber(campaign.manualStats.leads)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            <BadgeStat 
              label="Cases" 
              value={formatNumber(campaign.manualStats.cases)} 
            />
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <BadgeStat 
              label="Retainers" 
              value={formatNumber(campaign.manualStats.retainers)} 
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <BadgeStat
            label="ROI"
            value={`${metrics.roi.toFixed(0)}%`}
            className={getProfitabilityClass()}
          />
          <BadgeStat
            label="Profit"
            value={formatCurrency(metrics.profit)}
            className={getProfitabilityClass()}
          />
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button onClick={handleViewDetails} variant="outline" className="w-full">
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
