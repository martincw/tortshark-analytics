
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet, ArrowDown } from "lucide-react";
import { Campaign } from "@/types/campaign";
import { formatCurrency } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { isDateInRange } from "@/lib/utils/ManualDateUtils";
import { cn } from "@/lib/utils";
import { useCampaignReturns } from "@/hooks/useCampaignReturns";

interface CampaignFinancialOverviewProps {
  campaign: Campaign;
}

const CampaignFinancialOverview: React.FC<CampaignFinancialOverviewProps> = ({ campaign }) => {
  const { dateRange } = useCampaign();
  const { getTotalReturns } = useCampaignReturns(campaign.id);
  
  const financialData = useMemo(() => {
    if (!dateRange.startDate || !dateRange.endDate) {
      return {
        revenue: 0,
        cost: 0,
        profit: 0,
        returns: 0,
        netProfit: 0
      };
    }
    
    // Calculate totals for the selected date range
    let totalRevenue = 0;
    let totalCost = 0;
    
    campaign.statsHistory.forEach(entry => {
      if (isDateInRange(entry.date, dateRange.startDate!, dateRange.endDate!)) {
        // Ensure values are valid numbers 
        const revenue = typeof entry.revenue === 'number' ? entry.revenue : 0;
        const adSpend = typeof entry.adSpend === 'number' ? entry.adSpend : 0;
        
        totalRevenue += revenue;
        totalCost += adSpend;
      }
    });
    
    // Calculate returns for the date range
    const totalReturns = getTotalReturns(new Date(dateRange.startDate), new Date(dateRange.endDate));
    
    // Ensure profit is calculated correctly
    const profit = totalRevenue - totalCost;
    const netProfit = profit - totalReturns;
    
    // Log the values for debugging
    console.log(`CampaignFinancialOverview - Campaign ${campaign.name} - Revenue: ${totalRevenue}, Cost: ${totalCost}, Profit: ${profit}, Returns: ${totalReturns}, Net Profit: ${netProfit}`);
    
    return {
      revenue: totalRevenue,
      cost: totalCost,
      profit,
      returns: totalReturns,
      netProfit
    };
  }, [campaign, dateRange, getTotalReturns]);

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div 
            className={cn(
              "p-4 rounded-lg shadow-sm",
              "bg-gradient-to-br from-sky-50 to-sky-100",
              "hover:shadow-md transition-shadow duration-300"
            )}
          >
            <div className="flex items-center gap-2 mb-1 text-sky-700 text-sm">
              <Wallet className="h-4 w-4" />
              Revenue
            </div>
            <div className="text-2xl font-bold text-sky-900">
              {formatCurrency(financialData.revenue)}
            </div>
          </div>
          
          <div 
            className={cn(
              "p-4 rounded-lg shadow-sm",
              "bg-gradient-to-br from-rose-50 to-rose-100",
              "hover:shadow-md transition-shadow duration-300"
            )}
          >
            <div className="flex items-center gap-2 mb-1 text-rose-700 text-sm">
              <DollarSign className="h-4 w-4" />
              Cost
            </div>
            <div className="text-2xl font-bold text-rose-900">
              {formatCurrency(financialData.cost)}
            </div>
          </div>
          
          <div 
            className={cn(
              "p-4 rounded-lg shadow-sm",
              financialData.profit >= 0 
                ? "bg-gradient-to-br from-emerald-50 to-emerald-100" 
                : "bg-gradient-to-br from-red-50 to-red-100",
              "hover:shadow-md transition-shadow duration-300"
            )}
          >
            <div className={cn(
              "flex items-center gap-2 mb-1 text-sm",
              financialData.profit >= 0 ? "text-emerald-700" : "text-red-700"
            )}>
              <TrendingUp className="h-4 w-4" />
              Profit
            </div>
            <div className={cn(
              "text-2xl font-bold",
              financialData.profit >= 0 ? "text-emerald-900" : "text-red-900"
            )}>
              {formatCurrency(financialData.profit)}
            </div>
          </div>
        </div>
        
        {/* Returns and Net Profit Section */}
        {financialData.returns > 0 && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div 
                className={cn(
                  "p-4 rounded-lg shadow-sm",
                  "bg-gradient-to-br from-orange-50 to-orange-100",
                  "hover:shadow-md transition-shadow duration-300"
                )}
              >
                <div className="flex items-center gap-2 mb-1 text-orange-700 text-sm">
                  <ArrowDown className="h-4 w-4" />
                  Returns
                </div>
                <div className="text-2xl font-bold text-orange-900">
                  {formatCurrency(financialData.returns)}
                </div>
              </div>
              
              <div 
                className={cn(
                  "p-4 rounded-lg shadow-sm",
                  financialData.netProfit >= 0 
                    ? "bg-gradient-to-br from-indigo-50 to-indigo-100" 
                    : "bg-gradient-to-br from-red-50 to-red-100",
                  "hover:shadow-md transition-shadow duration-300"
                )}
              >
                <div className={cn(
                  "flex items-center gap-2 mb-1 text-sm",
                  financialData.netProfit >= 0 ? "text-indigo-700" : "text-red-700"
                )}>
                  <TrendingUp className="h-4 w-4" />
                  Net Profit
                </div>
                <div className={cn(
                  "text-2xl font-bold",
                  financialData.netProfit >= 0 ? "text-indigo-900" : "text-red-900"
                )}>
                  {formatCurrency(financialData.netProfit)}
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              Net Profit = Profit - Returns
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignFinancialOverview;
