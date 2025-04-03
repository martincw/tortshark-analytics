
import React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campaign } from "@/types/campaign";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent, getPerformanceBgClass } from "@/utils/campaignUtils";
import { BadgeStat } from "@/components/ui/badge-stat";
import { useCampaign } from "@/contexts/CampaignContext";
import { useNavigate } from "react-router-dom";
import { AlertCircle, DollarSign, TrendingUp, Users, Calendar, Percent, ArrowRight } from "lucide-react";
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
    if (metrics.roi > 200) return "text-success-DEFAULT font-bold";
    if (metrics.roi > 0) return "text-secondary font-bold";
    return "text-error-DEFAULT font-bold";
  };

  // Extract campaign type (first part of the name before dash)
  const campaignType = campaign.name.split(" - ")[0];
  
  // Calculate conversion rate
  const conversionRate = campaign.manualStats.leads > 0 
    ? ((campaign.manualStats.cases / campaign.manualStats.leads) * 100).toFixed(1) 
    : "0";

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow border border-border/80 group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-bold line-clamp-1">{campaign.name}</CardTitle>
            <p className="text-sm text-muted-foreground flex items-center mt-1">
              <Calendar className="h-3 w-3 mr-1 inline" />
              {formattedDate}
            </p>
          </div>
          <Badge 
            variant={
              campaignType === "Rideshare" ? "default" : 
              campaignType === "LDS" ? "secondary" :
              campaignType === "MD" ? "outline" : "destructive"
            }
            className="shrink-0"
          >
            {campaignType}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">Account: {campaign.accountName}</p>
      </CardHeader>
      <CardContent className="pb-0">
        {/* Highlight ROI and Profit in a more prominent way */}
        <div className={`grid grid-cols-2 gap-1 mb-4 p-3 rounded-md ${getPerformanceBgClass(metrics.roi)}`}>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">ROI</span>
            <div className="flex items-center gap-1.5 mt-1">
              <Percent className="h-4 w-4 text-secondary" />
              <span className={`text-xl font-bold ${getProfitabilityClass()}`}>
                {metrics.roi.toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-muted-foreground">Profit</span>
            <div className="flex items-center gap-1.5 mt-1">
              <DollarSign className="h-4 w-4 text-secondary" />
              <span className={`text-xl font-bold ${getProfitabilityClass()}`}>
                {metrics.profit >= 1000 
                  ? `$${(metrics.profit / 1000).toFixed(1)}K` 
                  : formatCurrency(metrics.profit)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-2">
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
              label="Conv. Rate" 
              value={`${conversionRate}%`} 
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-4">
        <Button onClick={handleViewDetails} variant="outline" className="w-full group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
          View Details
          <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </CardFooter>
    </Card>
  );
}
