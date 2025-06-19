
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Target, AlertCircle, Info, Loader2 } from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";

interface OptimalSpendBadgeProps {
  optimalSpend?: number;
  currentSpend?: number;
  efficiency?: number;
  confidence?: number;
  recommendation?: string;
  projectedIncrease?: number;
  analysisType?: 'advanced' | 'basic' | 'gathering' | 'insufficient_variation' | 'low_confidence';
}

export function OptimalSpendBadge({
  optimalSpend,
  currentSpend,
  efficiency,
  confidence,
  recommendation,
  projectedIncrease,
  analysisType = 'gathering'
}: OptimalSpendBadgeProps) {
  
  const getBadgeVariant = () => {
    switch (analysisType) {
      case 'gathering':
        return "outline";
      case 'insufficient_variation':
      case 'basic':
        return "secondary";
      case 'low_confidence':
        return "outline";
      case 'advanced':
        if (!efficiency) return "outline";
        if (efficiency >= 85) return "default";
        if (efficiency >= 70) return "secondary";
        return "destructive";
      default:
        return "outline";
    }
  };

  const getIcon = () => {
    switch (analysisType) {
      case 'gathering':
        return <Loader2 className="h-3 w-3 mr-1 animate-spin" />;
      case 'insufficient_variation':
        return <Info className="h-3 w-3 mr-1" />;
      case 'basic':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'low_confidence':
        return <AlertCircle className="h-3 w-3 mr-1" />;
      case 'advanced':
        if (!currentSpend || !optimalSpend) return <Target className="h-3 w-3 mr-1" />;
        if (optimalSpend > currentSpend * 1.1) return <TrendingUp className="h-3 w-3 mr-1" />;
        if (optimalSpend < currentSpend * 0.9) return <TrendingDown className="h-3 w-3 mr-1" />;
        return <Target className="h-3 w-3 mr-1" />;
      default:
        return <AlertCircle className="h-3 w-3 mr-1" />;
    }
  };

  const getBadgeText = () => {
    switch (analysisType) {
      case 'gathering':
        return "Analyzing...";
      case 'insufficient_variation':
        return "Need Variation";
      case 'basic':
        return `Basic: ${formatCurrency(optimalSpend || 0)}`;
      case 'low_confidence':
        return `Low Conf: ${formatCurrency(optimalSpend || 0)}`;
      case 'advanced':
        return `Optimal: ${formatCurrency(optimalSpend || 0)}`;
      default:
        return "Analyzing...";
    }
  };

  const getTooltipContent = () => {
    switch (analysisType) {
      case 'gathering':
        return (
          <div className="space-y-1">
            <p className="font-medium">Gathering Data</p>
            <p>Need more performance data to calculate optimal spend</p>
            <p className="text-xs text-muted-foreground">Requires at least 5 days of spend data</p>
          </div>
        );
      case 'insufficient_variation':
        return (
          <div className="space-y-1">
            <p className="font-medium">Insufficient Spend Variation</p>
            <p>{recommendation}</p>
            <p className="text-xs text-muted-foreground">Vary spend by ±20% to enable optimization</p>
          </div>
        );
      case 'basic':
        return (
          <div className="space-y-1">
            <p className="font-medium">Basic Analysis</p>
            <p>Efficiency: {efficiency}%</p>
            <p>Confidence: {confidence}%</p>
            <p className="text-primary">{recommendation}</p>
            <p className="text-xs text-muted-foreground">Based on industry benchmarks</p>
          </div>
        );
      case 'low_confidence':
        return (
          <div className="space-y-1">
            <p className="font-medium">Low Confidence Recommendation</p>
            <p>Efficiency: {efficiency}%</p>
            <p>Confidence: {confidence}%</p>
            <p className="text-primary">{recommendation}</p>
            <p className="text-xs text-warning-DEFAULT">Need more varied spend data for accuracy</p>
          </div>
        );
      case 'advanced':
        return (
          <div className="space-y-1">
            <p className="font-medium">Spend Optimization</p>
            <p>Current Efficiency: {efficiency}%</p>
            <p>Confidence: {confidence}%</p>
            {recommendation && <p className="text-primary">{recommendation}</p>}
            {projectedIncrease && projectedIncrease > 0 && (
              <p className="text-success-DEFAULT">
                Expected: +{projectedIncrease} leads/day
              </p>
            )}
          </div>
        );
      default:
        return <p>Analyzing spend optimization...</p>;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getBadgeVariant()} className="text-xs cursor-help">
            {getIcon()}
            {getBadgeText()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
