
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LabelList 
} from "recharts";
import { Campaign } from "@/types/campaign";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { AlertCircle, CheckCircle2, DollarSign, TrendingUp } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface BudgetOptimizationProps {
  campaign: Campaign;
  forecastPeriod: string;
}

export const BudgetOptimization: React.FC<BudgetOptimizationProps> = ({ 
  campaign,
  forecastPeriod 
}) => {
  // Get historical metrics for baseline
  const historicalMetrics = useMemo(() => {
    return calculateMetrics(campaign);
  }, [campaign]);

  // Extract key metrics from historical data
  const baselineMetrics = useMemo(() => {
    if (!campaign.statsHistory || campaign.statsHistory.length === 0) {
      return {
        averageAdSpend: 0,
        averageRevenue: 0,
        leadConversionRate: 0,
        costPerLead: 0,
        averageRevenuePerCase: 0,
        leadToCase: 0
      };
    }

    // Calculate averages from history
    let totalRevenue = 0;
    let totalAdSpend = 0;
    let totalLeads = 0;
    let totalCases = 0;
    
    campaign.statsHistory.forEach(entry => {
      totalRevenue += entry.revenue || 0;
      totalAdSpend += entry.adSpend || 0;
      totalLeads += entry.leads || 0;
      totalCases += entry.cases || 0;
    });
    
    const entryCount = campaign.statsHistory.length;
    const averageAdSpend = entryCount > 0 ? totalAdSpend / entryCount : 0;
    const averageRevenue = entryCount > 0 ? totalRevenue / entryCount : 0;
    const costPerLead = totalLeads > 0 ? totalAdSpend / totalLeads : 0;
    const averageRevenuePerCase = totalCases > 0 ? totalRevenue / totalCases : 0;
    const leadToCase = totalLeads > 0 ? totalCases / totalLeads : 0;
    
    return {
      averageAdSpend,
      averageRevenue,
      costPerLead,
      averageRevenuePerCase,
      leadToCase
    };
  }, [campaign.statsHistory]);

  // State for optimization variables
  const [dailyBudget, setDailyBudget] = useState<number>(() => {
    const avgDailySpend = baselineMetrics.averageAdSpend || 100;
    return Math.round(avgDailySpend);
  });
  
  const [targetROI, setTargetROI] = useState<number>(() => {
    const currentROI = historicalMetrics.roi;
    return Math.max(100, Math.round(currentROI));
  });

  const [revenuePerCase, setRevenuePerCase] = useState<number>(() => {
    return Math.round(baselineMetrics.averageRevenuePerCase || campaign.targets.casePayoutAmount);
  });
  
  // Calculate optimization metrics based on inputs
  const optimizationResults = useMemo(() => {
    // Get period multiplier based on forecast period
    let periodMultiplier = 7; // default to week
    if (forecastPeriod === "month") {
      periodMultiplier = 30;
    } else if (forecastPeriod === "quarter") {
      periodMultiplier = 90;
    }
    
    const periodBudget = dailyBudget * periodMultiplier;
    
    // Calculate expected leads based on cost per lead
    const expectedLeads = baselineMetrics.costPerLead > 0 ? 
      periodBudget / baselineMetrics.costPerLead : 0;
    
    // Calculate expected cases based on lead to case conversion
    const expectedCases = expectedLeads * baselineMetrics.leadToCase;
    
    // Calculate expected revenue
    const expectedRevenue = expectedCases * revenuePerCase;
    
    // Calculate profit and ROI
    const expectedProfit = expectedRevenue - periodBudget;
    const expectedROI = periodBudget > 0 ? (expectedProfit / periodBudget) * 100 : 0;
    
    // Calculate budget needed to hit target ROI
    const targetBudgetMultiplier = targetROI > 0 ? (100 / (targetROI)) : 1;
    const budgetForTargetROI = (expectedRevenue * targetBudgetMultiplier) / (1 + targetBudgetMultiplier);
    const dailyBudgetForTargetROI = budgetForTargetROI / periodMultiplier;
    
    // Calculate optimal budget for maximum profit while maintaining target ROI
    const optimalBudget = Math.min(
      periodBudget * 1.5, // Cap at 150% of current budget as safety
      budgetForTargetROI
    );
    const optimalDailyBudget = optimalBudget / periodMultiplier;
    
    // Calculate metrics for optimal budget
    const optimalLeads = baselineMetrics.costPerLead > 0 ? 
      optimalBudget / baselineMetrics.costPerLead : 0;
    const optimalCases = optimalLeads * baselineMetrics.leadToCase;
    const optimalRevenue = optimalCases * revenuePerCase;
    const optimalProfit = optimalRevenue - optimalBudget;
    const optimalROI = optimalBudget > 0 ? (optimalProfit / optimalBudget) * 100 : 0;
    
    // Check if current targets make sense
    const targetMonthlySpend = campaign.targets.monthlySpend;
    const budgetEfficiency = targetMonthlySpend > 0 ?
      (optimalBudget / targetMonthlySpend) * 100 : 0;
    const isCurrentBudgetOptimal = Math.abs(periodBudget - optimalBudget) / optimalBudget < 0.1;
    const isBudgetTooHigh = periodBudget > optimalBudget * 1.1;
    const isBudgetTooLow = periodBudget < optimalBudget * 0.9;
    
    // Create chart data for comparing scenarios
    const comparisonData = [
      {
        name: 'Current',
        budget: periodBudget,
        revenue: expectedRevenue,
        profit: expectedProfit,
        roi: expectedROI
      },
      {
        name: 'Optimal',
        budget: optimalBudget,
        revenue: optimalRevenue,
        profit: optimalProfit,
        roi: optimalROI
      }
    ];
    
    return {
      periodMultiplier,
      periodBudget,
      expectedLeads,
      expectedCases,
      expectedRevenue,
      expectedProfit,
      expectedROI,
      budgetForTargetROI,
      dailyBudgetForTargetROI,
      optimalBudget,
      optimalDailyBudget,
      optimalLeads,
      optimalCases,
      optimalRevenue,
      optimalProfit,
      optimalROI,
      budgetEfficiency,
      isCurrentBudgetOptimal,
      isBudgetTooHigh,
      isBudgetTooLow,
      comparisonData
    };
  }, [dailyBudget, targetROI, revenuePerCase, baselineMetrics, campaign.targets, forecastPeriod]);
  
  const handleBudgetChange = (value: number[]) => {
    setDailyBudget(value[0]);
  };

  const handleTargetROIChange = (value: number[]) => {
    setTargetROI(value[0]);
  };
  
  const resetToOptimalBudget = () => {
    setDailyBudget(Math.round(optimizationResults.optimalDailyBudget));
  };
  
  const recommendationMessage = useMemo(() => {
    if (optimizationResults.isCurrentBudgetOptimal) {
      return `Your current budget of ${formatCurrency(optimizationResults.periodBudget)} is within optimal range for your target ROI.`;
    } else if (optimizationResults.isBudgetTooHigh) {
      return `Your current budget is too high for optimal returns. Consider reducing daily spend to ${formatCurrency(optimizationResults.optimalDailyBudget)} to improve ROI while maintaining profit.`;
    } else if (optimizationResults.isBudgetTooLow) {
      return `Your current budget is too low to maximize potential profit. Consider increasing daily spend to ${formatCurrency(optimizationResults.optimalDailyBudget)} to scale results while maintaining your target ROI.`;
    }
    return "Adjust your daily budget and target ROI to see optimization recommendations.";
  }, [optimizationResults]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget Optimization
              </CardTitle>
              <CardDescription>
                Find the optimal budget allocation to maximize profit while meeting your ROI targets
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column: Inputs */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="daily-budget">Daily Ad Budget</Label>
                  <span className="font-medium">{formatCurrency(dailyBudget)}</span>
                </div>
                <Slider
                  id="daily-budget"
                  min={Math.max(10, Math.round(optimizationResults.optimalDailyBudget * 0.5))}
                  max={Math.round(optimizationResults.optimalDailyBudget * 2)}
                  step={10}
                  value={[dailyBudget]}
                  onValueChange={handleBudgetChange}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Min: {formatCurrency(Math.max(10, Math.round(optimizationResults.optimalDailyBudget * 0.5)))}</span>
                  <span>{forecastPeriod === "week" ? "Weekly" : forecastPeriod === "month" ? "Monthly" : "Quarterly"} total: {formatCurrency(optimizationResults.periodBudget)}</span>
                  <span>Max: {formatCurrency(Math.round(optimizationResults.optimalDailyBudget * 2))}</span>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="target-roi">Target ROI</Label>
                  <span className="font-medium">{formatPercent(targetROI)}</span>
                </div>
                <Slider
                  id="target-roi"
                  min={50}
                  max={500}
                  step={10}
                  value={[targetROI]}
                  onValueChange={handleTargetROIChange}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Low: 50%</span>
                  <span>High: 500%</span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="revenue-per-case">Revenue Per Case</Label>
                <Input
                  id="revenue-per-case"
                  type="number"
                  min={100}
                  value={revenuePerCase}
                  onChange={(e) => setRevenuePerCase(Number(e.target.value))}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Historical average: {formatCurrency(baselineMetrics.averageRevenuePerCase)} per case
                </p>
              </div>
              
              <Card className={
                optimizationResults.isCurrentBudgetOptimal ? "bg-success-DEFAULT/5 border-success-DEFAULT/30" : 
                "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
              }>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {optimizationResults.isCurrentBudgetOptimal ? (
                      <CheckCircle2 className="h-5 w-5 text-success-DEFAULT mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    )}
                    <div>
                      <h3 className="font-medium text-base mb-1">Budget Recommendation</h3>
                      <p className="text-sm">{recommendationMessage}</p>
                      
                      {!optimizationResults.isCurrentBudgetOptimal && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={resetToOptimalBudget}
                        >
                          Set Optimal Budget
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right column: Projected results */}
            <div className="space-y-5">
              <div>
                <h3 className="font-medium text-base mb-3">Projected Results</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Expected Revenue</div>
                    <div className="font-semibold">{formatCurrency(optimizationResults.expectedRevenue)}</div>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Expected Profit</div>
                    <div className={`font-semibold ${optimizationResults.expectedProfit >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`}>
                      {formatCurrency(optimizationResults.expectedProfit)}
                    </div>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Expected ROI</div>
                    <div className={`font-semibold ${optimizationResults.expectedROI >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`}>
                      {formatPercent(optimizationResults.expectedROI)}
                    </div>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Expected Cases</div>
                    <div className="font-semibold">{formatNumber(optimizationResults.expectedCases)}</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-base mb-3">Target vs. Current Budget</h3>
                <div className="relative pt-1">
                  <div className="flex mb-1 items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold inline-block text-primary">
                        Budget Utilization
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold inline-block">
                        {Math.round(optimizationResults.budgetEfficiency)}%
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={Math.min(100, optimizationResults.budgetEfficiency)} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Current: {formatCurrency(optimizationResults.periodBudget)}</span>
                    <span>Target: {formatCurrency(campaign.targets.monthlySpend)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-base mb-2">Optimal ROI Budget</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Maximum budget that maintains your {formatPercent(targetROI)} target ROI
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex-1">
                    <div className="text-sm text-muted-foreground mb-1">
                      Optimal Daily Budget
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(optimizationResults.optimalDailyBudget)}
                    </div>
                  </div>
                  <div className="text-center font-medium text-muted-foreground">
                    =
                  </div>
                  <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg flex-1">
                    <div className="text-sm text-muted-foreground mb-1">
                      {forecastPeriod === "week" ? "Weekly" : forecastPeriod === "month" ? "Monthly" : "Quarterly"} Total
                    </div>
                    <div className="font-semibold">
                      {formatCurrency(optimizationResults.optimalBudget)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Comparison chart */}
          <div className="mt-8">
            <h3 className="font-medium text-base mb-4">Current vs. Optimal Budget Comparison</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={optimizationResults.comparisonData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === "roi") return [formatPercent(value as number), "ROI"];
                      return [formatCurrency(value as number), name.charAt(0).toUpperCase() + name.slice(1)];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="budget" name="Budget" fill="#8884d8" />
                  <Bar dataKey="revenue" name="Revenue" fill="#82ca9d" />
                  <Bar dataKey="profit" name="Profit" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4 flex justify-between">
          <div className="text-sm text-muted-foreground">
            <p>All projections based on your historical campaign performance data.</p>
          </div>
          <Button variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Save Budget Recommendation
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
