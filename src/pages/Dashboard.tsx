import React, { useState, useEffect } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, TrendingUp, Users, Wallet, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatNumber } from "@/utils/campaignUtils";
import { useCampaign } from "@/contexts/CampaignContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { parseISO, isWithinInterval, format } from "date-fns";

// Converts a "YYYY-MM-DD" string to a local Date
function createLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // JavaScript months are 0-indexed
  return new Date(year, month - 1, day);
}

// Given a local date, returns the start and end of that day
function getDayRange(localDate: Date) {
  const start = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate() // midnight local time
  );
  const end = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate() + 1 // start of next day local time
  );
  return { start, end };
}

// Financial Overview Component
interface FinancialOverviewData {
  revenue: number;
  adSpend: number;
  profit: number;
  leads: number;
  cases: number;
  roi: number;
}

interface FinancialOverviewProps {
  selectedDate: Date;
  data: FinancialOverviewData | null;
  loading: boolean;
}

const FinancialOverview: React.FC<FinancialOverviewProps> = ({ selectedDate, data, loading }) => {
  if (loading) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 animate-pulse" />
              <p>Loading financial data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Financial Overview for {format(selectedDate, "MMMM d, yyyy")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {data ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 bg-background/50 p-4 rounded-lg shadow-sm border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="h-5 w-5 text-primary opacity-80" />
                <h3 className="text-sm font-semibold">Revenue & Spend</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-sm text-muted-foreground block">Revenue</span>
                  <span className="text-xl font-bold">{formatCurrency(data.revenue)}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block">Ad Spend</span>
                  <span className="text-xl font-bold">{formatCurrency(data.adSpend)}</span>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Profit</span>
                  <span className={`font-bold ${data.profit > 0 ? "text-success-DEFAULT" : "text-error-DEFAULT"}`}>
                    {formatCurrency(data.profit)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 bg-background/50 p-4 rounded-lg shadow-sm border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary opacity-80" />
                <h3 className="text-sm font-semibold">Leads & Cases</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-sm text-muted-foreground block">Leads</span>
                  <span className="text-xl font-bold">{formatNumber(data.leads)}</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block">Cases</span>
                  <span className="text-xl font-bold">{formatNumber(data.cases)}</span>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Conversion Rate</span>
                  <span className="font-bold">
                    {data.leads > 0 ? ((data.cases / data.leads) * 100).toFixed(1) : "0"}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 bg-background/50 p-4 rounded-lg shadow-sm border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary opacity-80" />
                <h3 className="text-sm font-semibold">Performance Metrics</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-sm text-muted-foreground block">ROI</span>
                  <span className={`text-xl font-bold ${data.roi > 0 ? "text-success-DEFAULT" : "text-warning-DEFAULT"}`}>
                    {data.roi.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground block">Cost Per Case</span>
                  <span className="text-xl font-bold">
                    {data.cases > 0 ? formatCurrency(data.adSpend / data.cases) : "$0"}
                  </span>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t">
                <div className="flex justify-between">
                  <span className="font-medium">Cost Per Lead</span>
                  <span className="font-bold">
                    {data.leads > 0 ? formatCurrency(data.adSpend / data.leads) : "$0"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
            <Info className="h-10 w-10 mb-4" />
            <h3 className="text-lg font-medium mb-2">No data available</h3>
            <p>There is no financial data available for this date.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Campaigns Component
interface Campaign {
  id: string;
  name: string;
  platform: string;
  adSpend: number;
  leads: number;
  cases: number;
  revenue: number;
}

interface CampaignListProps {
  selectedDate: Date;
  campaigns: Campaign[];
  loading: boolean;
}

const CampaignList: React.FC<CampaignListProps> = ({ selectedDate, campaigns, loading }) => {
  const isMobile = useIsMobile();
  
  if (loading) {
    return (
      <Card className="shadow-md mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Campaign Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="text-center text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 animate-pulse" />
              <p>Loading campaign data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md mt-6">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Campaign Performance for {format(selectedDate, "MMMM d, yyyy")}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Campaign</th>
                  <th className="text-right p-2">Platform</th>
                  <th className="text-right p-2">Spend</th>
                  <th className="text-right p-2">Leads</th>
                  <th className="text-right p-2">Cases</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(campaign => {
                  const roi = campaign.adSpend > 0 
                    ? ((campaign.revenue / campaign.adSpend) * 100).toFixed(1) 
                    : "N/A";
                  
                  return (
                    <tr key={campaign.id} className="border-b hover:bg-accent/5">
                      <td className="p-2 font-medium">{campaign.name}</td>
                      <td className="text-right p-2">
                        <Badge variant="outline">{campaign.platform}</Badge>
                      </td>
                      <td className="text-right p-2">{formatCurrency(campaign.adSpend)}</td>
                      <td className="text-right p-2">{campaign.leads}</td>
                      <td className="text-right p-2">{campaign.cases}</td>
                      <td className="text-right p-2">{formatCurrency(campaign.revenue)}</td>
                      <td className="text-right p-2">
                        <span className={campaign.revenue > campaign.adSpend ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                          {typeof roi === "string" ? roi : `${roi}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
            <Info className="h-10 w-10 mb-4" />
            <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
            <p>There are no campaigns with data for this date.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// All Campaigns Component
interface AllCampaignsProps {
  campaigns: Campaign[];
}

const AllCampaignsList: React.FC<AllCampaignsProps> = ({ campaigns }) => {
  return (
    <Card className="shadow-md mt-6">
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          All Campaigns ({campaigns.length} total)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {campaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Campaign</th>
                  <th className="text-right p-2">Platform</th>
                  <th className="text-right p-2">Total Spend</th>
                  <th className="text-right p-2">Total Leads</th>
                  <th className="text-right p-2">Total Cases</th>
                  <th className="text-right p-2">Total Revenue</th>
                  <th className="text-right p-2">ROI</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(campaign => {
                  const roi = campaign.adSpend > 0 
                    ? ((campaign.revenue / campaign.adSpend) * 100).toFixed(1) 
                    : "N/A";
                  
                  return (
                    <tr key={campaign.id} className="border-b hover:bg-accent/5">
                      <td className="p-2 font-medium">{campaign.name}</td>
                      <td className="text-right p-2">
                        <Badge variant="outline">{campaign.platform}</Badge>
                      </td>
                      <td className="text-right p-2">{formatCurrency(campaign.adSpend)}</td>
                      <td className="text-right p-2">{campaign.leads}</td>
                      <td className="text-right p-2">{campaign.cases}</td>
                      <td className="text-right p-2">{formatCurrency(campaign.revenue)}</td>
                      <td className="text-right p-2">
                        <span className={campaign.revenue > campaign.adSpend ? "text-success-DEFAULT" : "text-error-DEFAULT"}>
                          {typeof roi === "string" ? roi : `${roi}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
            <Info className="h-10 w-10 mb-4" />
            <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
            <p>There are no campaigns in the system.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [financialData, setFinancialData] = useState<FinancialOverviewData | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [allCampaigns, setAllCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { campaigns: contextCampaigns } = useCampaign();
  
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      console.log("Selected date:", date);
      console.log("Date boundaries:", getDayRange(date));
    }
  };

  // Fetch dashboard data whenever the selected date changes
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      
      try {
        // Get the date range for the selected date
        const { start, end } = getDayRange(selectedDate);
        const startISO = start.toISOString();
        const endISO = end.toISOString();
        
        // Debug logs: verify the boundaries match the selected date
        console.log('--- Dashboard Query Boundaries ---');
        console.log('Local Start:', start, '=> ISO:', startISO);
        console.log('Local End:', end, '=> ISO:', endISO);
        
        // Process campaign data from context instead of fetching from Supabase
        // This is a fallback approach since we're not using real Supabase data yet
        
        const filteredCampaigns = contextCampaigns.map(campaign => {
          // Filter stats for the selected date
          const dayStats = campaign.statsHistory.filter(stat => {
            const statDate = parseISO(stat.date);
            return isWithinInterval(statDate, { start, end });
          });
          
          // Sum up the stats for the day
          const adSpend = dayStats.reduce((sum, stat) => sum + (stat.adSpend || 0), 0);
          const leads = dayStats.reduce((sum, stat) => sum + (stat.leads || 0), 0);
          const cases = dayStats.reduce((sum, stat) => sum + (stat.cases || 0), 0);
          const revenue = dayStats.reduce((sum, stat) => sum + (stat.revenue || 0), 0);
          
          return {
            id: campaign.id,
            name: campaign.name,
            platform: campaign.platform,
            adSpend,
            leads,
            cases,
            revenue
          };
        }).filter(campaign => 
          // Only include campaigns with data for the selected date
          campaign.adSpend > 0 || campaign.leads > 0 || campaign.cases > 0 || campaign.revenue > 0
        );
        
        // Calculate aggregated financial data
        const totalAdSpend = filteredCampaigns.reduce((sum, camp) => sum + camp.adSpend, 0);
        const totalLeads = filteredCampaigns.reduce((sum, camp) => sum + camp.leads, 0);
        const totalCases = filteredCampaigns.reduce((sum, camp) => sum + camp.cases, 0);
        const totalRevenue = filteredCampaigns.reduce((sum, camp) => sum + camp.revenue, 0);
        const totalProfit = totalRevenue - totalAdSpend;
        const roi = totalAdSpend > 0 ? (totalRevenue / totalAdSpend) * 100 : 0;
        
        // Only set financial data if there's actual data for the day
        const hasData = totalAdSpend > 0 || totalLeads > 0 || totalCases > 0 || totalRevenue > 0;
        
        if (hasData) {
          setFinancialData({
            revenue: totalRevenue,
            adSpend: totalAdSpend,
            profit: totalProfit,
            leads: totalLeads,
            cases: totalCases,
            roi
          });
        } else {
          setFinancialData(null);
        }
        
        setCampaigns(filteredCampaigns);
        console.log("Filtered campaigns:", filteredCampaigns.length);
        
        // Calculate all-time stats for all campaigns
        const allCampaignsStats = contextCampaigns.map(campaign => {
          const adSpend = campaign.statsHistory.reduce((sum, stat) => sum + (stat.adSpend || 0), 0);
          const leads = campaign.statsHistory.reduce((sum, stat) => sum + (stat.leads || 0), 0);
          const cases = campaign.statsHistory.reduce((sum, stat) => sum + (stat.cases || 0), 0);
          const revenue = campaign.statsHistory.reduce((sum, stat) => sum + (stat.revenue || 0), 0);
          
          return {
            id: campaign.id,
            name: campaign.name,
            platform: campaign.platform,
            adSpend,
            leads,
            cases,
            revenue
          };
        });
        
        setAllCampaigns(allCampaignsStats);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setFinancialData(null);
        setCampaigns([]);
        setAllCampaigns([]);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, [selectedDate, contextCampaigns]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            View campaign performance data for a specific date
          </p>
        </div>
        <div className="w-full md:w-auto">
          <DatePicker
            date={selectedDate}
            setDate={handleDateChange}
            className="w-[180px]"
          />
        </div>
      </div>
      
      <FinancialOverview 
        selectedDate={selectedDate} 
        data={financialData} 
        loading={loading} 
      />
      
      <CampaignList 
        selectedDate={selectedDate} 
        campaigns={campaigns} 
        loading={loading} 
      />
      
      <AllCampaignsList campaigns={allCampaigns} />
    </div>
  );
};

export default Dashboard;
