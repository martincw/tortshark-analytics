
import React, { useState, useEffect } from "react";
import { Campaign } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency } from "@/utils/campaignUtils";
import { ArrowRight, Calculator, DollarSign, Target, Calendar, Percent, BarChart3, Briefcase } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatDateForStorage, parseStoredDate } from "@/lib/utils/ManualDateUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface ProfitProjectionsCalculatorProps {
  selectedCampaignId: string;
  campaigns: Campaign[];
}

export function ProfitProjectionsCalculator({ selectedCampaignId, campaigns }: ProfitProjectionsCalculatorProps) {
  const campaign = campaigns.find(c => c.id === selectedCampaignId);
  
  // Get initial values from campaign data or use defaults
  const [targetProfit, setTargetProfit] = useState<number>(1000);
  const [caseValue, setCaseValue] = useState<number>(campaign?.targets.casePayoutAmount || 0);
  const [dateRange, setDateRange] = useState<{ start: Date | undefined; end: Date | undefined }>({
    start: new Date(),
    end: new Date(new Date().setDate(new Date().getDate() + 30)) // Default to 30 days
  });
  const [conversionRate, setConversionRate] = useState<number>(5);
  const [costPerLead, setCostPerLead] = useState<number>(0);
  
  // Calculated fields
  const [requiredCases, setRequiredCases] = useState<number>(0);
  const [requiredLeads, setRequiredLeads] = useState<number>(0);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalAdSpend, setTotalAdSpend] = useState<number>(0);
  const [dailyAdSpend, setDailyAdSpend] = useState<number>(0);
  const [projectionsCalculated, setProjectionsCalculated] = useState<boolean>(false);
  
  // Load initial values from campaign data
  useEffect(() => {
    if (campaign) {
      setCaseValue(campaign.targets.casePayoutAmount || 0);
      
      // Calculate conversion rate from campaign data if available
      if (campaign.manualStats.leads > 0) {
        const calcConversionRate = (campaign.manualStats.cases / campaign.manualStats.leads) * 100;
        setConversionRate(parseFloat(calcConversionRate.toFixed(1)));
      }
      
      // Calculate cost per lead from campaign data if available
      if (campaign.manualStats.leads > 0) {
        const calcCostPerLead = campaign.stats.adSpend / campaign.manualStats.leads;
        setCostPerLead(parseFloat(calcCostPerLead.toFixed(2)));
      } else {
        setCostPerLead(50); // Default value
      }
    }
  }, [campaign]);
  
  const calculateProjections = () => {
    if (!campaign) return;
    
    // Calculate days in range
    const daysDiff = dateRange.start && dateRange.end 
      ? Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 30;
    
    // Calculate required cases to reach target profit
    const profitPerCase = caseValue - (costPerLead * (100 / conversionRate));
    const calculatedRequiredCases = profitPerCase > 0 ? Math.ceil(targetProfit / profitPerCase) : 0;
    
    // Calculate required leads based on conversion rate
    const calculatedRequiredLeads = Math.ceil(calculatedRequiredCases * (100 / conversionRate));
    
    // Calculate total revenue
    const calculatedTotalRevenue = calculatedRequiredCases * caseValue;
    
    // Calculate total ad spend
    const calculatedTotalAdSpend = calculatedRequiredLeads * costPerLead;
    
    // Calculate daily ad spend
    const calculatedDailyAdSpend = daysDiff > 0 ? calculatedTotalAdSpend / daysDiff : 0;
    
    // Update state
    setRequiredCases(calculatedRequiredCases);
    setRequiredLeads(calculatedRequiredLeads);
    setTotalRevenue(calculatedTotalRevenue);
    setTotalAdSpend(calculatedTotalAdSpend);
    setDailyAdSpend(calculatedDailyAdSpend);
    setProjectionsCalculated(true);
    
    toast.success("Projections calculated successfully");
  };
  
  const handleStartDateChange = (date: Date | undefined) => {
    setDateRange(prev => ({ ...prev, start: date }));
  };
  
  const handleEndDateChange = (date: Date | undefined) => {
    setDateRange(prev => ({ ...prev, end: date }));
  };
  
  const getDaysInRange = () => {
    return dateRange.start && dateRange.end 
      ? Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : 0;
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Profit Projections Calculator
          </CardTitle>
          <CardDescription>
            Calculate required ad spend and metrics to achieve your target profit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="inputs" className="w-full">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="inputs">Inputs</TabsTrigger>
              <TabsTrigger value="results" disabled={!projectionsCalculated}>Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="inputs" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="target-profit" className="flex items-center gap-1">
                      <Target className="h-4 w-4" /> Target Profit
                    </Label>
                    <div className="flex mt-1.5">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        $
                      </span>
                      <Input
                        id="target-profit"
                        type="number"
                        value={targetProfit}
                        onChange={(e) => setTargetProfit(Number(e.target.value))}
                        className="rounded-l-none"
                        min={0}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="case-value" className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" /> Case Value
                    </Label>
                    <div className="flex mt-1.5">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        $
                      </span>
                      <Input
                        id="case-value"
                        type="number"
                        value={caseValue}
                        onChange={(e) => setCaseValue(Number(e.target.value))}
                        className="rounded-l-none"
                        min={0}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="conversion-rate" className="flex items-center gap-1">
                      <Percent className="h-4 w-4" /> Lead to Case Conversion Rate
                    </Label>
                    <div className="space-y-2 mt-1.5">
                      <Slider
                        id="conversion-rate"
                        value={[conversionRate]}
                        max={20}
                        step={0.1}
                        onValueChange={(value) => setConversionRate(value[0])}
                      />
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{conversionRate.toFixed(1)}%</span>
                        <span>of leads become cases</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cost-per-lead" className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" /> Cost Per Lead
                    </Label>
                    <div className="flex mt-1.5">
                      <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                        $
                      </span>
                      <Input
                        id="cost-per-lead"
                        type="number"
                        value={costPerLead}
                        onChange={(e) => setCostPerLead(Number(e.target.value))}
                        className="rounded-l-none"
                        min={0}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> Start Date
                    </Label>
                    <div className="mt-1.5">
                      <DatePicker
                        date={dateRange.start}
                        onSelect={handleStartDateChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" /> End Date
                    </Label>
                    <div className="mt-1.5">
                      <DatePicker
                        date={dateRange.end}
                        onSelect={handleEndDateChange}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <Button onClick={calculateProjections} className="w-full md:w-auto">
                  <Calculator className="mr-2 h-4 w-4" /> Calculate Projections
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="results">
              {projectionsCalculated && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Daily Ad Spend</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(dailyAdSpend)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          For {getDaysInRange()} days
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Ad Spend</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(totalAdSpend)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          For entire period
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="bg-primary/5 border-primary/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Target Profit</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{formatCurrency(targetProfit)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Net profit after ad spend
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Metric</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">Required Cases</TableCell>
                        <TableCell>{requiredCases}</TableCell>
                        <TableCell className="text-muted-foreground">Cases needed to hit target profit</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Required Leads</TableCell>
                        <TableCell>{requiredLeads}</TableCell>
                        <TableCell className="text-muted-foreground">Leads needed based on conversion rate</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Total Revenue</TableCell>
                        <TableCell>{formatCurrency(totalRevenue)}</TableCell>
                        <TableCell className="text-muted-foreground">Gross revenue before ad spend</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Conversion Rate</TableCell>
                        <TableCell>{conversionRate.toFixed(1)}%</TableCell>
                        <TableCell className="text-muted-foreground">Lead to case percentage</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Cost Per Lead</TableCell>
                        <TableCell>{formatCurrency(costPerLead)}</TableCell>
                        <TableCell className="text-muted-foreground">Average cost to acquire one lead</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Cost Per Case</TableCell>
                        <TableCell>{formatCurrency(costPerLead * (100 / conversionRate))}</TableCell>
                        <TableCell className="text-muted-foreground">Average cost to acquire one case</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Profit Per Case</TableCell>
                        <TableCell>{formatCurrency(caseValue - (costPerLead * (100 / conversionRate)))}</TableCell>
                        <TableCell className="text-muted-foreground">Net profit per case after ad spend</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Strategy Options</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Strategy</TableHead>
                          <TableHead>Daily Ad Spend</TableHead>
                          <TableHead>Days to Target</TableHead>
                          <TableHead>Profit Potential</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Conservative</TableCell>
                          <TableCell>{formatCurrency(dailyAdSpend * 0.75)}</TableCell>
                          <TableCell>{Math.ceil(getDaysInRange() / 0.75)}</TableCell>
                          <TableCell>{formatCurrency(targetProfit)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-primary/5">
                          <TableCell className="font-medium">Recommended</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(dailyAdSpend)}</TableCell>
                          <TableCell className="font-semibold">{getDaysInRange()}</TableCell>
                          <TableCell className="font-semibold">{formatCurrency(targetProfit)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Aggressive</TableCell>
                          <TableCell>{formatCurrency(dailyAdSpend * 1.5)}</TableCell>
                          <TableCell>{Math.ceil(getDaysInRange() / 1.5)}</TableCell>
                          <TableCell>{formatCurrency(targetProfit * 1.2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={() => setProjectionsCalculated(false)}>
                      Edit Inputs
                    </Button>
                    <Button onClick={calculateProjections}>
                      Recalculate
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
