
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Target, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";

interface OptimalSpendBadgeProps {
  optimalSpend?: number;
  currentSpend?: number;
  efficiency?: number;
  confidence?: number;
  recommendation?: string;
  projectedIncrease?: number;
}

export function OptimalSpendBadge({
  optimalSpend,
  currentSpend,
  efficiency,
  confidence,
  recommendation,
  projectedIncrease
}: OptimalSpendBadgeProps) {
  if (!optimalSpend || !confidence || confidence < 60) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Analyzing...
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Gathering data for spend optimization</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const getEfficiencyColor = () => {
    if (!efficiency) return "outline";
    if (efficiency >= 85) return "default";
    if (efficiency >= 70) return "secondary";
    return "destructive";
  };

  const getIcon = () => {
    if (!currentSpend || !optimalSpend) return <Target className="h-3 w-3 mr-1" />;
    if (optimalSpend > currentSpend * 1.1) return <TrendingUp className="h-3 w-3 mr-1" />;
    if (optimalSpend < currentSpend * 0.9) return <TrendingDown className="h-3 w-3 mr-1" />;
    return <Target className="h-3 w-3 mr-1" />;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={getEfficiencyColor()} className="text-xs cursor-help">
            {getIcon()}
            Optimal: {formatCurrency(optimalSpend)}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
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
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
