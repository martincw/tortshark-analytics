import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea
} from "recharts";
import { Campaign, ForecastedMetrics, ProjectionParams } from "@/types/campaign";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon, TrendingUp, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ProfitForecastingProps {
  campaign: Campaign;
  forecastModel: string;
  forecastPeriod: string;
  projectionParams: ProjectionParams;
}

export const ProfitForecasting: React.FC<ProfitForecastingProps> = ({
  campaign,
  forecastModel,
  forecastPeriod,
  projectionParams
}) => {
  // Generate forecast data based on historical data
  const forecastData = useMemo(() => {
    if (!campaign.statsHistory || campaign.statsHistory.length === 0) {
      return [];
    }

    // Get the latest date from stats history
    const sortedHistory = [...campaign.statsHistory].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const latestDate = new Date(sortedHistory[0].date);
    
    // Calculate averages from history
    let totalRevenue = 0;
    let totalAdSpend = 0;
    let totalLeads = 0;
    let totalCases = 0;
    let entryCount = 0;
    
    sortedHistory.forEach((entry, index) => {
      if (index < 14) { // Use last 14 entries for average if available
        totalRevenue += entry.revenue || 0;
        totalAdSpend += entry.adSpend || 0;
        totalLeads += entry.leads || 0;
        totalCases += entry.cases || 0;
        entryCount++;
      }
    });
    
    const avgRevenue = entryCount > 0 ? totalRevenue / entryCount : 0;
    const avgAdSpend = entryCount > 0 ? totalAdSpend / entryCount : 0;
    const avgLeads = entryCount > 0 ? totalLeads / entryCount : 0;
    const avgCases = entryCount > 0 ? totalCases / entryCount : 0;
    
    // Apply projection parameters
    const adSpendMultiplier = 1 + (projectionParams.adSpendGrowth / 100);
    const conversionMultiplier = 1 + (projectionParams.conversionRateGrowth / 100);
    const revenueMultiplier = 1 + (projectionParams.revenuePerCaseGrowth / 100);
    
    // Determine forecast days based on period
    let forecastDays = 7; // default to a week
    
    if (forecastPeriod === "month") {
      forecastDays = 30;
    } else if (forecastPeriod === "quarter") {
      forecastDays = 90;
    }
    
    // Create forecast data points
    const forecast: ForecastedMetrics[] = [];
    
    for (let i = 0; i < forecastDays; i++) {
      const forecastDate = addDays(latestDate, i + 1);
      const dayNumber = i + 1;
      
      // Apply different forecasting models
      let growthFactor = 1;
      
      if (forecastModel === "linear") {
        growthFactor = 1 + (i * 0.01); // Linear 1% growth per day
      } else if (forecastModel === "exponential") {
        growthFactor = Math.pow(1.01, i); // Exponential 1% compound growth
      } else if (forecastModel === "weighted") {
        // Weighted average - more recent days have higher weight in the trend
        const weightFactor = Math.min(0.5 + (i * 0.01), 1.5);
        growthFactor = weightFactor;
      }
      
      // Calculate forecast metrics for this day with projection parameters applied
      const dailyAdSpend = avgAdSpend * growthFactor * adSpendMultiplier;
      const dailyLeads = avgLeads * growthFactor;
      const dailyCases = dailyLeads * (avgLeads > 0 ? avgCases / avgLeads : 0) * conversionMultiplier;
      const revenuePerCase = avgCases > 0 ? avgRevenue / avgCases : 0;
      const dailyRevenue = dailyCases * revenuePerCase * revenueMultiplier;
      const dailyProfit = dailyRevenue - dailyAdSpend;
      const dailyROI = dailyAdSpend > 0 ? (dailyProfit / dailyAdSpend) * 100 : 0;
      
      forecast.push({
        date: format(forecastDate, "MMM dd"),
        revenue: dailyRevenue,
        adSpend: dailyAdSpend,
        profit: dailyProfit,
        leads: dailyLeads,
        cases: dailyCases,
        roi: dailyROI
      });
    }
    
    return forecast;
  }, [campaign.statsHistory, forecastModel, forecastPeriod, projectionParams]);
  
  // Calculate forecast summary
  const forecastSummary = useMemo(() => {
    if (forecastData.length === 0) {
      return {
        totalRevenue: 0,
        totalAdSpend: 0,
        totalProfit: 0,
        totalROI: 0,
        averageROI: 0,
        totalLeads: 0,
        totalCases: 0,
        isProfitable: false
      };
    }
    
    const totalRevenue = forecastData.reduce((sum, day) => sum + day.revenue, 0);
    const totalAdSpend = forecastData.reduce((sum, day) => sum + day.adSpend, 0);
    const totalProfit = totalRevenue - totalAdSpend;
    const totalROI = totalAdSpend > 0 ? (totalProfit / totalAdSpend) * 100 : 0;
    const averageROI = forecastData.reduce((sum, day) => sum + day.roi, 0) / forecastData.length;
    const totalLeads = forecastData.reduce((sum, day) => sum + day.leads, 0);
    const totalCases = forecastData.reduce((sum, day) => sum + day.cases, 0);
    const isProfitable = totalProfit > 0;
    
    return {
      totalRevenue,
      totalAdSpend,
      totalProfit,
      totalROI,
      averageROI,
      totalLeads,
      totalCases,
      isProfitable
    };
  }, [forecastData]);

  // Goal achievement projection
  const goalProjection = useMemo(() => {
    if (!campaign.targets || forecastData.length === 0) {
      return {
        reachesSpendTarget: false,
        reachesRevenueTarget: false,
        reachesROASTarget: false,
        reachesProfitTarget: false,
        daysToSpendTarget: 0,
        daysToRevenueTarget: 0,
        daysToROASTarget: 0,
        daysToProfitTarget: 0
      };
    }
    
    // Calculate monthly targets since targets are monthly
    const monthlySpendTarget = campaign.targets.monthlySpend;
    const monthlyRevenueTarget = campaign.targets.monthlyIncome;
    const targetROAS = campaign.targets.targetROAS;
    const targetProfit = campaign.targets.targetProfit;
    
    // Check if targets will be hit based on forecast
    let cumulativeAdSpend = 0;
    let cumulativeRevenue = 0;
    let cumulativeProfit = 0;
    let daysToSpendTarget = 0;
    let daysToRevenueTarget = 0;
    let daysToROASTarget = 0;
    let daysToProfitTarget = 0;
    
    for (let i = 0; i < forecastData.length; i++) {
      cumulativeAdSpend += forecastData[i].adSpend;
      cumulativeRevenue += forecastData[i].revenue;
      cumulativeProfit += forecastData[i].profit;
      
      // Find first day we hit each target
      if (daysToSpendTarget === 0 && cumulativeAdSpend >= monthlySpendTarget) {
        daysToSpendTarget = i + 1;
      }
      
      if (daysToRevenueTarget === 0 && cumulativeRevenue >= monthlyRevenueTarget) {
        daysToRevenueTarget = i + 1;
      }
      
      if (daysToROASTarget === 0 && cumulativeAdSpend > 0 && 
          (cumulativeRevenue / cumulativeAdSpend) >= targetROAS) {
        daysToROASTarget = i + 1;
      }
      
      if (daysToProfitTarget === 0 && cumulativeProfit >= targetProfit) {
        daysToProfitTarget = i + 1;
      }
    }
    
    return {
      reachesSpendTarget: daysToSpendTarget > 0,
      reachesRevenueTarget: daysToRevenueTarget > 0,
      reachesROASTarget: daysToROASTarget > 0,
      reachesProfitTarget: daysToProfitTarget > 0,
      daysToSpendTarget,
      daysToRevenueTarget,
      daysToROASTarget,
      daysToProfitTarget
    };
  }, [campaign.targets, forecastData]);

  const tooltipFormatter = (value: number, name: string) => {
    switch (name) {
      case 'revenue':
      case 'adSpend':
      case 'profit':
        return [formatCurrency(value), name];
      case 'roi':
        return [formatPercent(value), name];
      default:
        return [formatNumber(value), name];
    }
  };

  return (
    <div className="space-y-6">
      {/* Forecast Summary */}
      <Card className={forecastSummary.isProfitable ? 
        "border-success-DEFAULT/40 bg-success-DEFAULT/5" : 
        "border-error-DEFAULT/40 bg-error-DEFAULT/5"
      }>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Forecast Summary for {forecastPeriod === "week" ? "Next Week" : 
                       forecastPeriod === "month" ? "Next Month" : "Next Quarter"}
          </CardTitle>
          <CardDescription>
            Projected metrics based on historical data and current settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Projected Revenue</h3>
              <p className="text-2xl font-semibold">{formatCurrency(forecastSummary.totalRevenue)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Projected Profit</h3>
              <p className={`text-2xl font-semibold ${forecastSummary.totalProfit >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`}>
                {formatCurrency(forecastSummary.totalProfit)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Projected Spend</h3>
              <p className="text-2xl font-semibold">{formatCurrency(forecastSummary.totalAdSpend)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Projected ROI</h3>
              <p className={`text-2xl font-semibold ${forecastSummary.totalROI >= 0 ? 'text-success-DEFAULT' : 'text-error-DEFAULT'}`}>
                {formatPercent(forecastSummary.totalROI)}
              </p>
            </div>
          </div>

          {/* Goal achievement */}
          {campaign.targets && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-medium mb-4">Target Achievement Projection</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TargetCard 
                  title="Revenue Target" 
                  target={formatCurrency(campaign.targets.monthlyIncome)} 
                  projected={formatCurrency(forecastSummary.totalRevenue)} 
                  willReach={goalProjection.reachesRevenueTarget}
                  daysToReach={goalProjection.daysToRevenueTarget}
                />
                <TargetCard 
                  title="ROI Target" 
                  target={`${campaign.targets.targetROAS}x`} 
                  projected={formatPercent(forecastSummary.totalROI)} 
                  willReach={goalProjection.reachesROASTarget}
                  daysToReach={goalProjection.daysToROASTarget}
                />
                <TargetCard 
                  title="Profit Target" 
                  target={formatCurrency(campaign.targets.targetProfit)} 
                  projected={formatCurrency(forecastSummary.totalProfit)} 
                  willReach={goalProjection.reachesProfitTarget}
                  daysToReach={goalProjection.daysToProfitTarget}
                />
                <TargetCard 
                  title="Ad Spend Budget" 
                  target={formatCurrency(campaign.targets.monthlySpend)} 
                  projected={formatCurrency(forecastSummary.totalAdSpend)} 
                  willReach={goalProjection.reachesSpendTarget}
                  daysToReach={goalProjection.daysToSpendTarget}
                  isSpendTarget={true}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Profit & ROI Forecast</CardTitle>
          <CardDescription>
            Projected profit and ROI for the coming {forecastPeriod}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {forecastData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={forecastData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    yAxisId="left" 
                    orientation="left"
                    tickFormatter={(value) => `$${value}`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={tooltipFormatter}
                    labelFormatter={(value) => `Date: ${value}`} 
                  />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={0} stroke="#000" strokeDasharray="3 3" />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="profit" 
                    name="Profit" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="roi" 
                    name="ROI %" 
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No historical data available to generate forecast.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Revenue/Spend Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue vs Ad Spend Forecast</CardTitle>
          <CardDescription>
            Projected revenue and ad spend for the coming {forecastPeriod}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {forecastData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={forecastData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis 
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    formatter={tooltipFormatter}
                    labelFormatter={(value) => `Date: ${value}`} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    name="Revenue" 
                    stroke="#8884d8" 
                    activeDot={{ r: 8 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="adSpend" 
                    name="Ad Spend" 
                    stroke="#82ca9d" 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                No historical data available to generate forecast.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Forecast Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Forecast Data</CardTitle>
          <CardDescription>
            Day-by-day forecast for the coming period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Ad Spend</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>ROI</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Cases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {forecastData.map((day, index) => (
                  <TableRow key={index}>
                    <TableCell>{day.date}</TableCell>
                    <TableCell>{formatCurrency(day.revenue)}</TableCell>
                    <TableCell>{formatCurrency(day.adSpend)}</TableCell>
                    <TableCell className={day.profit >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                      {formatCurrency(day.profit)}
                    </TableCell>
                    <TableCell className={day.roi >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                      {formatPercent(day.roi)}
                    </TableCell>
                    <TableCell>{formatNumber(day.leads)}</TableCell>
                    <TableCell>{formatNumber(day.cases)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Disclaimer */}
      <Alert variant="default" className="bg-muted/50">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>About This Forecast</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          Forecasts are based on historical performance data and the parameters you've set. 
          Actual results may vary based on market conditions, seasonality, and other external factors.
          This forecast uses the {forecastModel === 'linear' ? 'linear trend' : 
                                forecastModel === 'exponential' ? 'exponential growth' : 
                                'weighted average'} model.
        </AlertDescription>
      </Alert>
    </div>
  );
};

interface TargetCardProps {
  title: string;
  target: string;
  projected: string;
  willReach: boolean;
  daysToReach: number;
  isSpendTarget?: boolean;
}

const TargetCard: React.FC<TargetCardProps> = ({ 
  title, 
  target, 
  projected, 
  willReach, 
  daysToReach,
  isSpendTarget = false
}) => {
  // For spend targets, "reaching" the target is actually negative if we're over budget
  const isPositiveOutcome = isSpendTarget ? 
    (!willReach || (willReach && daysToReach > 14)) : // Not reaching spend target or reaching it late is good
    willReach; // Reaching other targets is good
  
  return (
    <div className={`p-4 rounded-lg border ${
      isPositiveOutcome ? 'bg-success-DEFAULT/5 border-success-DEFAULT/40' : 
                           'bg-error-DEFAULT/5 border-error-DEFAULT/40'
    }`}>
      <h4 className="text-sm font-medium mb-2">{title}</h4>
      
      <div className="flex justify-between mb-2">
        <span className="text-sm text-muted-foreground">Target</span>
        <span className="font-medium">{target}</span>
      </div>
      
      <div className="flex justify-between mb-3">
        <span className="text-sm text-muted-foreground">Projected</span>
        <span className="font-medium">{projected}</span>
      </div>
      
      <div className="flex items-center gap-2">
        {isPositiveOutcome ? (
          <Badge variant="outline" className="bg-success-DEFAULT/20 text-success-DEFAULT border-success-DEFAULT">
            {willReach ? `Will reach in ${daysToReach} days` : isSpendTarget ? "Under budget" : "Target not reached"}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-error-DEFAULT/20 text-error-DEFAULT border-error-DEFAULT">
            {isSpendTarget ? `Over budget in ${daysToReach} days` : willReach ? `Will reach in ${daysToReach} days` : "Target not reached"}
          </Badge>
        )}
      </div>
    </div>
  );
};
