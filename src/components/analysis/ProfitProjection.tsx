
import React, { useMemo } from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateMetrics, formatCurrency } from "@/utils/campaignUtils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProfitProjectionProps {
  campaign: Campaign;
  targetProfit: number;
}

export function ProfitProjection({ campaign, targetProfit }: ProfitProjectionProps) {
  const metrics = calculateMetrics(campaign);
  
  // Calculate all the projection metrics
  const projectionData = useMemo(() => {
    const recentStats = campaign.statsHistory.slice(-7);
    // Get average daily values from recent history
    const avgDailyLeads = recentStats.length > 0 
      ? recentStats.reduce((sum, day) => sum + day.leads, 0) / recentStats.length
      : 0;
    
    const avgDailyAdSpend = recentStats.length > 0 && recentStats.some(s => s.adSpend)
      ? recentStats.reduce((sum, day) => sum + (day.adSpend || 0), 0) / recentStats.length
      : campaign.stats.adSpend / 30; // Fallback to monthly average
    
    const conversion = campaign.manualStats.leads > 0 
      ? campaign.manualStats.cases / campaign.manualStats.leads 
      : 0;
    
    const averageRevenue = campaign.manualStats.cases > 0 
      ? campaign.manualStats.revenue / campaign.manualStats.cases 
      : campaign.targets.casePayoutAmount;
    
    // Projection calculations
    const costPerLead = avgDailyLeads > 0 ? avgDailyAdSpend / avgDailyLeads : 0;
    const profitPerCase = averageRevenue - metrics.cpa;
    
    // How many cases needed to hit target profit
    const casesNeeded = profitPerCase > 0 ? Math.ceil(targetProfit / profitPerCase) : 0;
    
    // How many leads needed based on conversion rate
    const leadsNeeded = conversion > 0 ? Math.ceil(casesNeeded / conversion) : 0;
    
    // Daily ad spend needed to generate enough leads
    const dailyAdSpendNeeded = costPerLead > 0 ? leadsNeeded * costPerLead : 0;
    
    // Weekly ad spend needed (daily * 7)
    const weeklyAdSpendNeeded = dailyAdSpendNeeded * 7;
    
    // Days to hit target based on current performance
    const daysToTarget = avgDailyLeads > 0 && conversion > 0
      ? Math.ceil(casesNeeded / (avgDailyLeads * conversion))
      : 0;
    
    // Projected revenue
    const projectedRevenue = casesNeeded * averageRevenue;
    
    // Projected cost
    const projectedCost = leadsNeeded * costPerLead;
    
    return {
      targetProfit,
      avgDailyLeads,
      conversion: conversion * 100, // Convert to percentage
      costPerLead,
      profitPerCase,
      casesNeeded,
      leadsNeeded,
      dailyAdSpendNeeded,
      weeklyAdSpendNeeded,
      daysToTarget,
      projectedRevenue,
      projectedCost,
      avgDailyAdSpend,
      averageRevenue
    };
  }, [campaign, targetProfit, metrics.cpa]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Profit Projection</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Historical Performance (7-day avg)</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Daily Leads</div>
                <div className="text-sm font-medium">{projectionData.avgDailyLeads.toFixed(1)}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Daily Ad Spend</div>
                <div className="text-sm font-medium">{formatCurrency(projectionData.avgDailyAdSpend)}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Cost Per Lead</div>
                <div className="text-sm font-medium">{formatCurrency(projectionData.costPerLead)}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Lead-to-Case Rate</div>
                <div className="text-sm font-medium">{projectionData.conversion.toFixed(1)}%</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Average Revenue/Case</div>
                <div className="text-sm font-medium">{formatCurrency(projectionData.averageRevenue)}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Cost Per Case</div>
                <div className="text-sm font-medium">{formatCurrency(metrics.cpa)}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Profit Per Case</div>
                <div className="text-sm font-medium">{formatCurrency(projectionData.profitPerCase)}</div>
              </div>
            </div>
          </div>
          
          <div className="bg-accent/10 p-4 rounded-lg">
            <h3 className="text-sm font-medium mb-3">To Achieve ${targetProfit.toLocaleString()} Profit</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Cases Needed</div>
                <div className="text-sm font-medium">{projectionData.casesNeeded}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Leads Needed</div>
                <div className="text-sm font-medium">{projectionData.leadsNeeded}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Daily Ad Budget</div>
                <div className="text-sm font-semibold">{formatCurrency(projectionData.dailyAdSpendNeeded)}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Weekly Ad Budget</div>
                <div className="text-sm font-semibold">{formatCurrency(projectionData.weeklyAdSpendNeeded)}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Days to Target</div>
                <div className="text-sm font-medium">{projectionData.daysToTarget}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Projected Revenue</div>
                <div className="text-sm font-medium">{formatCurrency(projectionData.projectedRevenue)}</div>
              </div>
              <div className="grid grid-cols-2">
                <div className="text-sm text-muted-foreground">Projected Ad Cost</div>
                <div className="text-sm font-medium">{formatCurrency(projectionData.projectedCost)}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Budget Strategy</TableHead>
                <TableHead>Daily Budget</TableHead>
                <TableHead>Weekly Budget</TableHead>
                <TableHead>Projected Profit</TableHead>
                <TableHead>Days to Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Conservative</TableCell>
                <TableCell>{formatCurrency(projectionData.dailyAdSpendNeeded * 0.8)}</TableCell>
                <TableCell>{formatCurrency(projectionData.weeklyAdSpendNeeded * 0.8)}</TableCell>
                <TableCell>{formatCurrency(targetProfit * 0.8)}</TableCell>
                <TableCell>{Math.ceil(projectionData.daysToTarget / 0.8)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Recommended</TableCell>
                <TableCell className="font-semibold">{formatCurrency(projectionData.dailyAdSpendNeeded)}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(projectionData.weeklyAdSpendNeeded)}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(targetProfit)}</TableCell>
                <TableCell className="font-semibold">{projectionData.daysToTarget}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Aggressive</TableCell>
                <TableCell>{formatCurrency(projectionData.dailyAdSpendNeeded * 1.2)}</TableCell>
                <TableCell>{formatCurrency(projectionData.weeklyAdSpendNeeded * 1.2)}</TableCell>
                <TableCell>{formatCurrency(targetProfit * 1.2)}</TableCell>
                <TableCell>{Math.ceil(projectionData.daysToTarget / 1.2)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
