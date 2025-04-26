import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Campaign, GoalProgress } from "@/types/campaign";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { 
  Progress,
  ProgressIndicator,
} from "@/components/ui/progress";
import { BadgeDelta } from "@/components/ui/badge-delta";
import { isDateInRange, parseStoredDate } from "@/lib/utils/ManualDateUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { addDays, endOfMonth, format, getDaysInMonth, startOfMonth } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight, CheckCircle2, TrendingDown, TrendingUp } from "lucide-react";

interface GoalTrackerProps {
  campaign: Campaign;
}

export const GoalTracker: React.FC<GoalTrackerProps> = ({ campaign }) => {
  const { dateRange } = useCampaign();
  
  // Calculate metrics based on current data
  const currentMetrics = useMemo(() => {
    return calculateMetrics(campaign, dateRange);
  }, [campaign, dateRange]);

  // Calculate days remaining in the month
  const daysInfo = useMemo(() => {
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const totalDaysInMonth = getDaysInMonth(today);
    const currentDay = today.getDate();
    const daysRemaining = totalDaysInMonth - currentDay + 1; // +1 to include today
    const daysElapsed = currentDay - 1; // -1 because we don't count today as elapsed
    const percentOfMonthElapsed = (daysElapsed / totalDaysInMonth) * 100;
    
    return {
      today,
      monthStart,
      monthEnd,
      totalDaysInMonth,
      currentDay,
      daysRemaining,
      daysElapsed,
      percentOfMonthElapsed
    };
  }, []);

  // Track progress towards goals
  const goalProgress = useMemo(() => {
    if (!campaign.targets) {
      return [];
    }
    
    // Create goal tracking for each important metric
    const goals: GoalProgress[] = [];
    
    // Revenue goal
    const currentRevenue = currentMetrics.revenue || 0;
    const targetRevenue = campaign.targets.monthlyIncome;
    const revenuePercentComplete = targetRevenue > 0 ? (currentRevenue / targetRevenue) * 100 : 0;
    
    // Calculate daily revenue rate
    const dailyRevenueRate = daysInfo.daysElapsed > 0 ? currentRevenue / daysInfo.daysElapsed : currentRevenue;
    const projectedMonthRevenue = dailyRevenueRate * daysInfo.totalDaysInMonth;
    
    goals.push({
      metric: 'Revenue',
      current: currentRevenue,
      target: targetRevenue,
      percentComplete: revenuePercentComplete,
      daysRemaining: daysInfo.daysRemaining,
      projectedValue: projectedMonthRevenue,
      willReachTarget: projectedMonthRevenue >= targetRevenue,
      gapToTarget: targetRevenue - currentRevenue
    });
    
    // Profit goal
    const currentProfit = currentMetrics.profit;
    const targetProfit = campaign.targets.targetProfit;
    const profitPercentComplete = targetProfit > 0 ? (currentProfit / targetProfit) * 100 : 0;
    
    // Calculate daily profit rate
    const dailyProfitRate = daysInfo.daysElapsed > 0 ? currentProfit / daysInfo.daysElapsed : currentProfit;
    const projectedMonthProfit = dailyProfitRate * daysInfo.totalDaysInMonth;
    
    goals.push({
      metric: 'Profit',
      current: currentProfit,
      target: targetProfit,
      percentComplete: profitPercentComplete,
      daysRemaining: daysInfo.daysRemaining,
      projectedValue: projectedMonthProfit,
      willReachTarget: projectedMonthProfit >= targetProfit,
      gapToTarget: targetProfit - currentProfit
    });
    
    // Ad Spend goal
    const currentAdSpend = currentMetrics.adSpend || 0;
    const targetAdSpend = campaign.targets.monthlySpend;
    const adSpendPercentComplete = targetAdSpend > 0 ? (currentAdSpend / targetAdSpend) * 100 : 0;
    
    // Calculate daily ad spend rate
    const dailyAdSpendRate = daysInfo.daysElapsed > 0 ? currentAdSpend / daysInfo.daysElapsed : currentAdSpend;
    const projectedMonthAdSpend = dailyAdSpendRate * daysInfo.totalDaysInMonth;
    
    goals.push({
      metric: 'Ad Spend',
      current: currentAdSpend,
      target: targetAdSpend,
      percentComplete: adSpendPercentComplete,
      daysRemaining: daysInfo.daysRemaining,
      projectedValue: projectedMonthAdSpend,
      willReachTarget: projectedMonthAdSpend <= targetAdSpend, // For ad spend, we want to stay under target
      gapToTarget: targetAdSpend - currentAdSpend
    });
    
    // Case goal (derived from revenue target and case payout)
    const currentCases = currentMetrics.cases || 0;
    const targetCases = campaign.targets.casePayoutAmount > 0 ?
      campaign.targets.monthlyIncome / campaign.targets.casePayoutAmount : 0;
    const casesPercentComplete = targetCases > 0 ? (currentCases / targetCases) * 100 : 0;
    
    // Calculate daily case rate
    const dailyCaseRate = daysInfo.daysElapsed > 0 ? currentCases / daysInfo.daysElapsed : currentCases;
    const projectedMonthCases = dailyCaseRate * daysInfo.totalDaysInMonth;
    
    goals.push({
      metric: 'Cases',
      current: currentCases,
      target: targetCases,
      percentComplete: casesPercentComplete,
      daysRemaining: daysInfo.daysRemaining,
      projectedValue: projectedMonthCases,
      willReachTarget: projectedMonthCases >= targetCases,
      gapToTarget: targetCases - currentCases
    });
    
    // Retainer goal
    const currentRetainers = campaign.manualStats.retainers;
    const targetRetainers = campaign.targets.monthlyRetainers;
    const retainersPercentComplete = targetRetainers > 0 ? (currentRetainers / targetRetainers) * 100 : 0;
    
    // Calculate daily retainer rate
    const dailyRetainerRate = daysInfo.daysElapsed > 0 ? currentRetainers / daysInfo.daysElapsed : currentRetainers;
    const projectedMonthRetainers = dailyRetainerRate * daysInfo.totalDaysInMonth;
    
    goals.push({
      metric: 'Retainers',
      current: currentRetainers,
      target: targetRetainers,
      percentComplete: retainersPercentComplete,
      daysRemaining: daysInfo.daysRemaining,
      projectedValue: projectedMonthRetainers,
      willReachTarget: projectedMonthRetainers >= targetRetainers,
      gapToTarget: targetRetainers - currentRetainers
    });
    
    return goals;
  }, [campaign.targets, campaign.manualStats.retainers, currentMetrics, daysInfo]);

  // Calculate overall progress
  const overallProgress = useMemo(() => {
    if (goalProgress.length === 0) {
      return {
        percentComplete: 0,
        onTrack: false,
        percentOnTrack: 0
      };
    }
    
    // Don't include ad spend in overall progress
    const relevantGoals = goalProgress.filter(goal => goal.metric !== 'Ad Spend');
    const totalPercentComplete = relevantGoals.reduce((sum, goal) => sum + goal.percentComplete, 0);
    const averagePercentComplete = relevantGoals.length > 0 ? totalPercentComplete / relevantGoals.length : 0;
    
    const onTrackGoals = relevantGoals.filter(goal => goal.willReachTarget);
    const percentOnTrack = relevantGoals.length > 0 ? (onTrackGoals.length / relevantGoals.length) * 100 : 0;
    const onTrack = percentOnTrack >= 50; // At least half of goals are on track
    
    return {
      percentComplete: averagePercentComplete,
      onTrack,
      percentOnTrack
    };
  }, [goalProgress]);
  
  const formatMetricValue = (metric: string, value: number) => {
    switch (metric) {
      case 'Revenue':
      case 'Profit':
      case 'Ad Spend':
        return formatCurrency(value);
      case 'Cases':
      case 'Retainers':
        return formatNumber(value);
      default:
        return value.toString();
    }
  };
  
  const getProgressBarColor = (goal: GoalProgress) => {
    // For ad spend, lower is better (we want to be under budget)
    if (goal.metric === 'Ad Spend') {
      // If over budget, show red
      if (goal.current > goal.target) {
        return "bg-error-DEFAULT";
      }
      // If close to budget (within 90%), show amber
      if (goal.percentComplete > 90) {
        return "bg-amber-500";
      }
      // Otherwise show green
      return "bg-success-DEFAULT";
    }
    
    // For all other metrics, higher is better
    if (goal.percentComplete >= 100) {
      return "bg-success-DEFAULT";
    }
    
    // If we're behind where we should be based on days elapsed
    if (goal.percentComplete < daysInfo.percentOfMonthElapsed) {
      return "bg-error-DEFAULT";
    }
    
    // Otherwise, we're on track
    return "bg-primary";
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress Card */}
      <Card className={overallProgress.onTrack ? "bg-success-DEFAULT/5 border-success-DEFAULT/30" : "bg-error-DEFAULT/5 border-error-DEFAULT/30"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {overallProgress.onTrack ? (
              <CheckCircle2 className="h-5 w-5 text-success-DEFAULT" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-error-DEFAULT" />
            )}
            Monthly Goal Progress
          </CardTitle>
          <CardDescription>
            {overallProgress.onTrack 
              ? `You're on track to meet ${Math.round(overallProgress.percentOnTrack)}% of your monthly goals.`
              : `You're at risk of missing ${Math.round(100 - overallProgress.percentOnTrack)}% of your monthly goals.`
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">
              Overall Progress: {Math.round(overallProgress.percentComplete)}%
            </span>
            <span className="text-sm text-muted-foreground">
              Month Elapsed: {Math.round(daysInfo.percentOfMonthElapsed)}%
            </span>
          </div>
          <div className="relative w-full h-4 bg-muted rounded-full overflow-hidden">
            {/* Month progress marker */}
            <div 
              className="absolute h-full w-px bg-foreground z-10"
              style={{ left: `${daysInfo.percentOfMonthElapsed}%` }}
            ></div>
            
            {/* Goal progress bar */}
            <div 
              className={`h-full ${overallProgress.onTrack ? 'bg-success-DEFAULT' : 'bg-error-DEFAULT'}`}
              style={{ width: `${Math.min(100, overallProgress.percentComplete)}%` }}
            ></div>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {daysInfo.daysElapsed} days elapsed, {daysInfo.daysRemaining} days remaining
          </div>
        </CardContent>
      </Card>
      
      {/* Individual Goal Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goalProgress.map((goal) => (
          <Card key={goal.metric}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex justify-between items-center">
                <span>{goal.metric} Goal</span>
                <BadgeDelta 
                  value={goal.willReachTarget ? 'increase' : 'decrease'} 
                  text={goal.willReachTarget ? 'On Track' : 'At Risk'} 
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Progress</span>
                  <span className="text-sm font-medium">{Math.round(goal.percentComplete)}%</span>
                </div>
                <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
                  {/* Month progress marker */}
                  <div 
                    className="absolute h-full w-px bg-foreground z-10"
                    style={{ left: `${daysInfo.percentOfMonthElapsed}%` }}
                  ></div>
                  
                  {/* Goal progress bar */}
                  <div 
                    className={getProgressBarColor(goal)}
                    style={{ width: `${Math.min(100, goal.percentComplete)}%`, height: '100%' }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Current</div>
                  <div className="font-medium">{formatMetricValue(goal.metric, goal.current)}</div>
                </div>
                <div className="border-l border-r px-2">
                  <div className="text-xs text-muted-foreground mb-1">Target</div>
                  <div className="font-medium">{formatMetricValue(goal.metric, goal.target)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Projected</div>
                  <div className={`font-medium ${
                    goal.metric === 'Ad Spend' 
                      ? (goal.projectedValue <= goal.target ? 'text-success-DEFAULT' : 'text-error-DEFAULT')
                      : (goal.projectedValue >= goal.target ? 'text-success-DEFAULT' : 'text-error-DEFAULT')
                  }`}>
                    {formatMetricValue(goal.metric, goal.projectedValue)}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex items-center gap-2 text-sm">
                {goal.willReachTarget ? (
                  <div className="flex items-center gap-1 text-success-DEFAULT">
                    <TrendingUp className="h-4 w-4" />
                    <span>
                      Projected to {goal.metric === 'Ad Spend' ? 'stay under' : 'exceed'} {formatMetricValue(goal.metric, goal.target)} by month end
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-error-DEFAULT">
                    <TrendingDown className="h-4 w-4" />
                    <span>
                      {goal.metric === 'Ad Spend' 
                        ? `Projected to exceed budget by ${formatMetricValue(goal.metric, goal.projectedValue - goal.target)}`
                        : `${formatMetricValue(goal.metric, goal.target - goal.projectedValue)} short of target`} by month end
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Recommendations */}
      {!overallProgress.onTrack && (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Action Required
          </AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-2">To meet your monthly targets, consider making the following adjustments:</p>
            <ul className="list-disc pl-5 space-y-1">
              {goalProgress
                .filter(goal => !goal.willReachTarget)
                .map(goal => {
                  if (goal.metric === 'Ad Spend' && goal.projectedValue > goal.target) {
                    const dailyReduction = (goal.projectedValue - goal.target) / goal.daysRemaining;
                    return (
                      <li key={goal.metric}>
                        Reduce daily ad spend by {formatCurrency(dailyReduction)} to stay within budget
                      </li>
                    );
                  } else if (goal.metric !== 'Ad Spend' && goal.projectedValue < goal.target) {
                    const dailyIncrease = (goal.target - goal.projectedValue) / goal.daysRemaining;
                    return (
                      <li key={goal.metric}>
                        Increase daily {goal.metric.toLowerCase()} by {
                          goal.metric === 'Revenue' || goal.metric === 'Profit' 
                            ? formatCurrency(dailyIncrease)
                            : formatNumber(dailyIncrease)
                        } to meet target
                      </li>
                    );
                  }
                  return null;
                })
                .filter(Boolean)}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
