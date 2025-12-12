import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { DatePicker } from "@/components/ui/date-picker";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Target, 
  Edit2, 
  Check, 
  X,
  Calendar
} from "lucide-react";
import { formatCurrency } from "@/utils/campaignUtils";
import { useBuyerBudgetCapacity, BuyerWithCapacity } from "@/hooks/useBuyerBudgetCapacity";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";

const BUDGET_GOAL = 10_000_000; // $10M/month

interface EditingState {
  buyerId: string | null;
  value: string;
}

const BudgetCapacityTab: React.FC = () => {
  const { 
    buyersWithCapacity, 
    loading, 
    totalCapacity, 
    updateBuyerCapacity,
    getUtilization,
    fetchBuyersWithCapacity
  } = useBuyerBudgetCapacity();

  const [editing, setEditing] = useState<EditingState>({ buyerId: null, value: "" });
  const [utilization, setUtilization] = useState<number>(0);
  const [utilizationLoading, setUtilizationLoading] = useState(false);
  
  // Date range for utilization
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Calculate utilization when date range changes
  useEffect(() => {
    const fetchUtilization = async () => {
      setUtilizationLoading(true);
      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');
      const spend = await getUtilization(start, end);
      setUtilization(spend);
      setUtilizationLoading(false);
    };
    fetchUtilization();
  }, [startDate, endDate, getUtilization]);

  const handleEditStart = (buyer: BuyerWithCapacity) => {
    setEditing({ buyerId: buyer.id, value: buyer.monthly_capacity.toString() });
  };

  const handleEditSave = async (buyerId: string) => {
    const numValue = parseFloat(editing.value) || 0;
    await updateBuyerCapacity(buyerId, numValue);
    setEditing({ buyerId: null, value: "" });
  };

  const handleEditCancel = () => {
    setEditing({ buyerId: null, value: "" });
  };

  const capacityPercentage = BUDGET_GOAL > 0 ? (totalCapacity / BUDGET_GOAL) * 100 : 0;
  const utilizationPercentage = totalCapacity > 0 ? (utilization / totalCapacity) * 100 : 0;

  // Quick date range presets
  const setCurrentMonth = () => {
    setStartDate(startOfMonth(new Date()));
    setEndDate(new Date());
  };

  const setLast30Days = () => {
    setStartDate(subDays(new Date(), 30));
    setEndDate(new Date());
  };

  const setLast7Days = () => {
    setStartDate(subDays(new Date(), 7));
    setEndDate(new Date());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-2 animate-pulse" />
          <p>Loading budget capacity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Capacity Card */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Total Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCapacity)}</div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress to $10M Goal</span>
                <span>{capacityPercentage.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(capacityPercentage, 100)} 
                className="h-2"
                indicatorColor={capacityPercentage >= 100 ? "bg-success-DEFAULT" : "bg-primary"}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {formatCurrency(BUDGET_GOAL - totalCapacity)} remaining to goal
            </p>
          </CardContent>
        </Card>

        {/* Utilization Card */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Budget Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {utilizationLoading ? "..." : formatCurrency(utilization)}
            </div>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Spend vs Capacity</span>
                <span>{utilizationPercentage.toFixed(1)}%</span>
              </div>
              <Progress 
                value={Math.min(utilizationPercentage, 100)} 
                className="h-2"
                indicatorColor={
                  utilizationPercentage >= 90 ? "bg-success-DEFAULT" : 
                  utilizationPercentage >= 70 ? "bg-warning-DEFAULT" : 
                  "bg-error-DEFAULT"
                }
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')}
            </p>
          </CardContent>
        </Card>

        {/* Active Buyers Card */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Active Buyers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buyersWithCapacity.length}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {buyersWithCapacity.filter(b => b.monthly_capacity > 0).length} with capacity set
            </p>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(buyersWithCapacity.length > 0 ? totalCapacity / buyersWithCapacity.length : 0)}/buyer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Date Range Selector for Utilization */}
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Utilization Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <DatePicker date={startDate} setDate={(d) => d && setStartDate(d)} />
              <span className="text-muted-foreground">to</span>
              <DatePicker date={endDate} setDate={(d) => d && setEndDate(d)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={setLast7Days}>
                Last 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={setLast30Days}>
                Last 30 Days
              </Button>
              <Button variant="outline" size="sm" onClick={setCurrentMonth}>
                This Month
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Buyers Table */}
      <Card className="shadow-md">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Buyer Capacity Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Buyer</th>
                  <th className="text-right p-2">Monthly Capacity</th>
                  <th className="text-right p-2">% of Goal</th>
                  <th className="text-right p-2">% of Total</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {buyersWithCapacity.map((buyer) => {
                  const percentOfGoal = (buyer.monthly_capacity / BUDGET_GOAL) * 100;
                  const percentOfTotal = totalCapacity > 0 ? (buyer.monthly_capacity / totalCapacity) * 100 : 0;
                  const isEditing = editing.buyerId === buyer.id;

                  return (
                    <tr key={buyer.id} className="border-b hover:bg-accent/5">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{buyer.name}</span>
                          {buyer.monthly_capacity === 0 && (
                            <Badge variant="outline" className="text-xs">No capacity set</Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-right p-2">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editing.value}
                            onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                            className="w-32 text-right ml-auto"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave(buyer.id);
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                          />
                        ) : (
                          <span className="font-medium">{formatCurrency(buyer.monthly_capacity)}</span>
                        )}
                      </td>
                      <td className="text-right p-2">
                        <span className="text-muted-foreground">{percentOfGoal.toFixed(2)}%</span>
                      </td>
                      <td className="text-right p-2">
                        <div className="flex items-center justify-end gap-2">
                          <Progress 
                            value={percentOfTotal} 
                            className="w-16 h-2" 
                          />
                          <span className="text-muted-foreground w-12 text-right">
                            {percentOfTotal.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center p-2">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={() => handleEditSave(buyer.id)}
                            >
                              <Check className="h-4 w-4 text-success-DEFAULT" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-8 w-8"
                              onClick={handleEditCancel}
                            >
                              <X className="h-4 w-4 text-error-DEFAULT" />
                            </Button>
                          </div>
                        ) : (
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8"
                            onClick={() => handleEditStart(buyer)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-accent/10 font-semibold">
                  <td className="p-2">Total</td>
                  <td className="text-right p-2">{formatCurrency(totalCapacity)}</td>
                  <td className="text-right p-2">{capacityPercentage.toFixed(2)}%</td>
                  <td className="text-right p-2">100%</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetCapacityTab;
