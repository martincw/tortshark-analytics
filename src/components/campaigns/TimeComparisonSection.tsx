
import React from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getWeeklyComparison, getMonthlyComparison, calculatePercentageChange, getTrendColor } from "@/utils/timeComparisonUtils";
import { formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TimeComparisonSectionProps {
  campaign: Campaign;
}

export function TimeComparisonSection({ campaign }: TimeComparisonSectionProps) {
  const weeklyData = getWeeklyComparison(campaign);
  const monthlyData = getMonthlyComparison(campaign);

  const renderTrendIcon = (change: number) => {
    if (change > 5) return <TrendingUp className="h-3 w-3 text-success-DEFAULT" />;
    if (change < -5) return <TrendingDown className="h-3 w-3 text-error-DEFAULT" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const renderWeeklyTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Ad Spend</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Cases</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">CPL</TableHead>
            <TableHead className="text-right">EPL</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {weeklyData.map((week, index) => {
            const previousWeek = weeklyData[index + 1];
            
            return (
              <TableRow key={week.period}>
                <TableCell className="font-medium">{week.period}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(week.adSpend)}
                    {previousWeek && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(week.adSpend, previousWeek.adSpend))}
                        <span className={getTrendColor(calculatePercentageChange(week.adSpend, previousWeek.adSpend))}>
                          {Math.abs(calculatePercentageChange(week.adSpend, previousWeek.adSpend)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {week.leads}
                    {previousWeek && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(week.leads, previousWeek.leads))}
                        <span className={getTrendColor(calculatePercentageChange(week.leads, previousWeek.leads))}>
                          {Math.abs(calculatePercentageChange(week.leads, previousWeek.leads)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {week.cases}
                    {previousWeek && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(week.cases, previousWeek.cases))}
                        <span className={getTrendColor(calculatePercentageChange(week.cases, previousWeek.cases))}>
                          {Math.abs(calculatePercentageChange(week.cases, previousWeek.cases)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(week.revenue)}
                    {previousWeek && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(week.revenue, previousWeek.revenue))}
                        <span className={getTrendColor(calculatePercentageChange(week.revenue, previousWeek.revenue))}>
                          {Math.abs(calculatePercentageChange(week.revenue, previousWeek.revenue)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(week.cpl)}
                    {previousWeek && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(-calculatePercentageChange(week.cpl, previousWeek.cpl))} {/* Inverted for CPL */}
                        <span className={getTrendColor(-calculatePercentageChange(week.cpl, previousWeek.cpl))}>
                          {Math.abs(calculatePercentageChange(week.cpl, previousWeek.cpl)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(week.epl)}
                    {previousWeek && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(week.epl, previousWeek.epl))}
                        <span className={getTrendColor(calculatePercentageChange(week.epl, previousWeek.epl))}>
                          {Math.abs(calculatePercentageChange(week.epl, previousWeek.epl)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className={week.profit >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                      {formatCurrency(week.profit)}
                    </span>
                    {previousWeek && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(week.profit, previousWeek.profit))}
                        <span className={getTrendColor(calculatePercentageChange(week.profit, previousWeek.profit))}>
                          {Math.abs(calculatePercentageChange(week.profit, previousWeek.profit)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className={week.roi >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                      {formatPercent(week.roi)}
                    </span>
                    {previousWeek && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(week.roi, previousWeek.roi))}
                        <span className={getTrendColor(calculatePercentageChange(week.roi, previousWeek.roi))}>
                          {Math.abs(calculatePercentageChange(week.roi, previousWeek.roi)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  const renderMonthlyTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Ad Spend</TableHead>
            <TableHead className="text-right">Leads</TableHead>
            <TableHead className="text-right">Cases</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">CPL</TableHead>
            <TableHead className="text-right">EPL</TableHead>
            <TableHead className="text-right">Profit</TableHead>
            <TableHead className="text-right">ROI</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthlyData.map((month, index) => {
            const previousMonth = monthlyData[index + 1];
            
            return (
              <TableRow key={month.period}>
                <TableCell className="font-medium">{month.period}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(month.adSpend)}
                    {previousMonth && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(month.adSpend, previousMonth.adSpend))}
                        <span className={getTrendColor(calculatePercentageChange(month.adSpend, previousMonth.adSpend))}>
                          {Math.abs(calculatePercentageChange(month.adSpend, previousMonth.adSpend)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {month.leads}
                    {previousMonth && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(month.leads, previousMonth.leads))}
                        <span className={getTrendColor(calculatePercentageChange(month.leads, previousMonth.leads))}>
                          {Math.abs(calculatePercentageChange(month.leads, previousMonth.leads)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {month.cases}
                    {previousMonth && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(month.cases, previousMonth.cases))}
                        <span className={getTrendColor(calculatePercentageChange(month.cases, previousMonth.cases))}>
                          {Math.abs(calculatePercentageChange(month.cases, previousMonth.cases)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(month.revenue)}
                    {previousMonth && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(month.revenue, previousMonth.revenue))}
                        <span className={getTrendColor(calculatePercentageChange(month.revenue, previousMonth.revenue))}>
                          {Math.abs(calculatePercentageChange(month.revenue, previousMonth.revenue)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(month.cpl)}
                    {previousMonth && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(-calculatePercentageChange(month.cpl, previousMonth.cpl))} {/* Inverted for CPL */}
                        <span className={getTrendColor(-calculatePercentageChange(month.cpl, previousMonth.cpl))}>
                          {Math.abs(calculatePercentageChange(month.cpl, previousMonth.cpl)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {formatCurrency(month.epl)}
                    {previousMonth && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(month.epl, previousMonth.epl))}
                        <span className={getTrendColor(calculatePercentageChange(month.epl, previousMonth.epl))}>
                          {Math.abs(calculatePercentageChange(month.epl, previousMonth.epl)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className={month.profit >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                      {formatCurrency(month.profit)}
                    </span>
                    {previousMonth && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(month.profit, previousMonth.profit))}
                        <span className={getTrendColor(calculatePercentageChange(month.profit, previousMonth.profit))}>
                          {Math.abs(calculatePercentageChange(month.profit, previousMonth.profit)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className={month.roi >= 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                      {formatPercent(month.roi)}
                    </span>
                    {previousMonth && (
                      <div className="flex items-center gap-1 text-xs">
                        {renderTrendIcon(calculatePercentageChange(month.roi, previousMonth.roi))}
                        <span className={getTrendColor(calculatePercentageChange(month.roi, previousMonth.roi))}>
                          {Math.abs(calculatePercentageChange(month.roi, previousMonth.roi)).toFixed(0)}%
                        </span>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <Card className="shadow-md border-accent/30">
      <CardHeader className="bg-gradient-to-r from-accent/10 to-background border-b pb-3">
        <CardTitle className="text-lg font-medium">Performance Comparison</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="weekly">Week over Week</TabsTrigger>
            <TabsTrigger value="monthly">Month over Month</TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly" className="mt-4">
            {renderWeeklyTable()}
          </TabsContent>
          
          <TabsContent value="monthly" className="mt-4">
            {renderMonthlyTable()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
