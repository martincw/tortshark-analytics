import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CalendarIcon, Pencil, Check, X, TrendingUp, Briefcase, DollarSign, PieChart } from "lucide-react";
import { usePortfolio } from "@/hooks/usePortfolio";
import { AddBackendCaseDialog } from "./AddBackendCaseDialog";
import { useCampaign } from "@/contexts/CampaignContext";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const PortfolioTab = () => {
  const { 
    portfolioData, 
    summary, 
    isLoading, 
    dateRange, 
    setDateRange, 
    fetchPortfolioData,
    updateSettlementValue 
  } = usePortfolio();
  const { campaigns } = useCampaign();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleEditStart = (campaignId: string, currentValue: number) => {
    setEditingCampaignId(campaignId);
    setEditValue(currentValue.toString());
  };

  const handleEditSave = async (campaignId: string) => {
    const value = parseFloat(editValue) || 0;
    await updateSettlementValue(campaignId, value);
    setEditingCampaignId(null);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setEditingCampaignId(null);
    setEditValue("");
  };

  const clearDateRange = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cases
              </CardTitle>
            </div>
            <CardDescription className="text-3xl font-bold text-foreground">
              {summary.totalCases.toLocaleString()}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total NAV
              </CardTitle>
            </div>
            <CardDescription className="text-3xl font-bold text-green-600">
              {formatCurrency(summary.totalNAV)}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Settlement
              </CardTitle>
            </div>
            <CardDescription className="text-3xl font-bold text-blue-600">
              {formatCurrency(summary.avgSettlement)}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-purple-600" />
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Torts
              </CardTitle>
            </div>
            <CardDescription className="text-3xl font-bold text-purple-600">
              {summary.campaignCount}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Portfolio Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Case Portfolio</CardTitle>
              <CardDescription>
                Campaign-level portfolio overview with settlement values
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Range Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn(
                    "justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Date Range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange.from}
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                    numberOfMonths={2}
                  />
                  {(dateRange.from || dateRange.to) && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" onClick={clearDateRange} className="w-full">
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Cases
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">Loading portfolio data...</p>
            </div>
          ) : portfolioData.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-32 text-center">
              <p className="text-muted-foreground mb-4">No portfolio data found</p>
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Cases
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign / Tort</TableHead>
                  <TableHead className="text-center"># of Cases</TableHead>
                  <TableHead className="text-right">Avg Settlement</TableHead>
                  <TableHead className="text-right">NAV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolioData.map((item) => (
                  <TableRow key={item.campaignId} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-primary">
                      {item.campaignName}
                    </TableCell>
                    <TableCell className="text-center">
                      {item.totalCases.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingCampaignId === item.campaignId ? (
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-24 h-8 text-right"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave(item.campaignId);
                              if (e.key === 'Escape') handleEditCancel();
                            }}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleEditSave(item.campaignId)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={handleEditCancel}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <span className={item.settlementValue > 0 ? "" : "text-muted-foreground"}>
                            {item.settlementValue > 0 ? formatCurrency(item.settlementValue) : "Not set"}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => handleEditStart(item.campaignId, item.settlementValue)}
                          >
                            <Pencil className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(item.totalValue)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals Row */}
                <TableRow className="bg-muted/30 font-bold border-t-2">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-center">{summary.totalCases.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatCurrency(summary.avgSettlement)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(summary.totalNAV)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddBackendCaseDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        campaigns={campaigns}
        onCaseAdded={fetchPortfolioData}
      />
    </div>
  );
};

export default PortfolioTab;
