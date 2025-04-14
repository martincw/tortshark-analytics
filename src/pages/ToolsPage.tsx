
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { InfoIcon, UploadCloud, FileText, Database, RefreshCw, Server } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCampaign } from "@/contexts/CampaignContext";

const ToolsPage = () => {
  const [localStorageData, setLocalStorageData] = useState<Record<string, any>>({});
  const [supabaseData, setSupabaseData] = useState<Record<string, any>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { migrateFromLocalStorage } = useCampaign();
  
  useEffect(() => {
    refreshLocalStorageData();
    checkAuth();
  }, []);
  
  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      
      if (session) {
        loadSupabaseData();
      }
    } catch (error) {
      console.error("Error checking auth:", error);
    }
  };
  
  const refreshLocalStorageData = () => {
    const data: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || "null");
        } catch (e) {
          data[key] = localStorage.getItem(key);
        }
      }
    }
    setLocalStorageData(data);
  };
  
  const loadSupabaseData = async () => {
    setIsLoading(true);
    try {
      const data: Record<string, any> = {};
      
      // Fetch campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .limit(100);
      
      if (campaignsError) {
        console.error("Error fetching campaigns:", campaignsError);
      } else {
        data.campaigns = campaigns;
      }
      
      // Fetch account connections
      const { data: connections, error: connectionsError } = await supabase
        .from('account_connections')
        .select('*')
        .limit(100);
      
      if (connectionsError) {
        console.error("Error fetching account connections:", connectionsError);
      } else {
        data.account_connections = connections;
      }
      
      // Fetch campaign stats
      const { data: stats, error: statsError } = await supabase
        .from('campaign_stats')
        .select('*')
        .limit(100);
      
      if (statsError) {
        console.error("Error fetching campaign stats:", statsError);
      } else {
        data.campaign_stats = stats;
      }
      
      // Fetch campaign manual stats
      const { data: manualStats, error: manualStatsError } = await supabase
        .from('campaign_manual_stats')
        .select('*')
        .limit(100);
      
      if (manualStatsError) {
        console.error("Error fetching campaign manual stats:", manualStatsError);
      } else {
        data.campaign_manual_stats = manualStats;
      }
      
      // Fetch campaign stats history
      const { data: statsHistory, error: statsHistoryError } = await supabase
        .from('campaign_stats_history')
        .select('*')
        .limit(100);
      
      if (statsHistoryError) {
        console.error("Error fetching campaign stats history:", statsHistoryError);
      } else {
        data.campaign_stats_history = statsHistory;
      }
      
      // Fetch campaign targets
      const { data: targets, error: targetsError } = await supabase
        .from('campaign_targets')
        .select('*')
        .limit(100);
      
      if (targetsError) {
        console.error("Error fetching campaign targets:", targetsError);
      } else {
        data.campaign_targets = targets;
      }
      
      setSupabaseData(data);
    } catch (error) {
      console.error("Error loading Supabase data:", error);
      toast.error("Failed to load Supabase data");
    } finally {
      setIsLoading(false);
    }
  };
  
  const clearAllLocalStorage = () => {
    if (window.confirm("Are you sure you want to clear all localStorage data? This will delete all your local campaigns and settings.")) {
      localStorage.clear();
      refreshLocalStorageData();
      toast.success("All localStorage data has been cleared");
    }
  };
  
  const clearItem = (key: string) => {
    if (window.confirm(`Are you sure you want to delete ${key} from localStorage?`)) {
      localStorage.removeItem(key);
      refreshLocalStorageData();
      toast.success(`${key} has been removed from localStorage`);
    }
  };
  
  const fixCampaignsData = async () => {
    try {
      // Check if user is authenticated
      if (!isAuthenticated) {
        toast.error("Please sign in first");
        return;
      }
      
      // Create test campaigns in Supabase
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to create test campaigns");
        return;
      }
      
      // First create account connection
      const { data: account, error: accountError } = await supabase
        .from('account_connections')
        .insert({
          name: "Test Google Ads Account",
          platform: "google",
          is_connected: true,
          customer_id: "123456789",
          credentials: { customerId: "123456789" },
          user_id: session.user.id
        })
        .select()
        .single();
        
      if (accountError || !account) {
        console.error("Error creating test account:", accountError);
        toast.error("Failed to create test account");
        return;
      }
      
      // Create Birth Control campaign
      const { data: birthControlCampaign, error: campaignError1 } = await supabase
        .from('campaigns')
        .insert({
          name: "Test Campaign - Birth Control",
          platform: "google",
          account_id: account.id,
          account_name: account.name,
          user_id: session.user.id
        })
        .select()
        .single();
        
      if (campaignError1 || !birthControlCampaign) {
        console.error("Error creating birth control campaign:", campaignError1);
        toast.error("Failed to create test campaign");
        return;
      }
      
      // Add stats for Birth Control campaign
      await supabase.from('campaign_stats').insert({
        campaign_id: birthControlCampaign.id,
        ad_spend: 5000,
        impressions: 25000,
        clicks: 1250,
        cpc: 4,
        date: new Date().toISOString()
      });
      
      // Add manual stats for Birth Control campaign
      await supabase.from('campaign_manual_stats').insert({
        campaign_id: birthControlCampaign.id,
        leads: 100,
        cases: 25,
        retainers: 10,
        revenue: 50000,
        date: new Date().toISOString()
      });
      
      // Add targets for Birth Control campaign
      await supabase.from('campaign_targets').insert({
        campaign_id: birthControlCampaign.id,
        monthly_retainers: 20,
        case_payout_amount: 2500,
        monthly_income: 100000,
        monthly_spend: 20000,
        target_roas: 5,
        target_profit: 80000
      });
      
      // Create Camp Lejeune campaign
      const { data: campLejeuneC, error: campaignError2 } = await supabase
        .from('campaigns')
        .insert({
          name: "Test Campaign - Camp Lejeune",
          platform: "google",
          account_id: account.id,
          account_name: account.name,
          user_id: session.user.id
        })
        .select()
        .single();
        
      if (campaignError2 || !campLejeuneC) {
        console.error("Error creating Camp Lejeune campaign:", campaignError2);
        toast.error("Failed to create test campaign");
        return;
      }
      
      // Add stats for Camp Lejeune campaign
      await supabase.from('campaign_stats').insert({
        campaign_id: campLejeuneC.id,
        ad_spend: 8000,
        impressions: 40000,
        clicks: 2000,
        cpc: 4,
        date: new Date().toISOString()
      });
      
      // Add manual stats for Camp Lejeune campaign
      await supabase.from('campaign_manual_stats').insert({
        campaign_id: campLejeuneC.id,
        leads: 150,
        cases: 40,
        retainers: 15,
        revenue: 75000,
        date: new Date().toISOString()
      });
      
      // Add targets for Camp Lejeune campaign
      await supabase.from('campaign_targets').insert({
        campaign_id: campLejeuneC.id,
        monthly_retainers: 30,
        case_payout_amount: 3000,
        monthly_income: 150000,
        monthly_spend: 30000,
        target_roas: 5,
        target_profit: 120000
      });
      
      // Refresh Supabase data
      await loadSupabaseData();
      
      toast.success("Test campaigns created successfully. Please refresh the page.");
    } catch (e) {
      console.error("Error fixing campaigns data:", e);
      toast.error("Failed to fix campaigns data");
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground mt-1">
          Utilities and developer tools to help manage your TortShark account
        </p>
      </div>

      <Tabs defaultValue="storage">
        <TabsList>
          <TabsTrigger value="storage">LocalStorage</TabsTrigger>
          <TabsTrigger value="database">Supabase Data</TabsTrigger>
          <TabsTrigger value="upload">Upload Tools</TabsTrigger>
          <TabsTrigger value="debug">Debug Tools</TabsTrigger>
        </TabsList>
        
        <TabsContent value="storage" className="space-y-4">
          <Alert className="bg-amber-50 border-amber-200">
            <InfoIcon className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700">
              This page allows you to view and manage the data stored in your browser's local storage.
              Be careful when modifying this data as it could affect your campaign data.
            </AlertDescription>
          </Alert>
          
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">LocalStorage Data</h2>
            <div className="flex gap-2">
              <Button onClick={refreshLocalStorageData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh
              </Button>
              <Button onClick={clearAllLocalStorage} variant="destructive" size="sm">
                Clear All
              </Button>
              {isAuthenticated && (
                <Button onClick={() => migrateFromLocalStorage()} variant="default" size="sm">
                  <Database className="h-4 w-4 mr-1" /> Migrate to Supabase
                </Button>
              )}
            </div>
          </div>
          
          <div className="grid gap-4">
            {Object.keys(localStorageData).length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No data found in localStorage
                </CardContent>
              </Card>
            ) : (
              Object.entries(localStorageData).map(([key, value]) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">{key}</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => clearItem(key)}
                        className="h-8 text-destructive hover:text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                    <CardDescription>
                      {typeof value === 'object' && value !== null ? 
                        Array.isArray(value) ? 
                          `Array (${value.length} items)` : 
                          `Object (${Object.keys(value).length} properties)` : 
                        typeof value}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 p-3 rounded-md overflow-auto max-h-[300px]">
                      <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="database" className="space-y-4">
          {!isAuthenticated ? (
            <Alert>
              <InfoIcon className="h-4 w-4 mr-2" />
              <AlertDescription>
                Please sign in to view your Supabase data.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Supabase Data</h2>
                <div className="flex gap-2">
                  <Button onClick={loadSupabaseData} variant="outline" size="sm" disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} /> Refresh
                  </Button>
                  <Button onClick={fixCampaignsData} variant="default" size="sm" disabled={isLoading}>
                    <Database className="h-4 w-4 mr-1" /> Create Test Data
                  </Button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {Object.keys(supabaseData).length === 0 ? (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No data found in Supabase
                      </CardContent>
                    </Card>
                  ) : (
                    Object.entries(supabaseData).map(([key, value]) => (
                      <Card key={key}>
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-base">{key}</CardTitle>
                            <span className="text-xs text-muted-foreground">
                              {Array.isArray(value) ? `${value.length} rows` : '0 rows'}
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-muted/50 p-3 rounded-md overflow-auto max-h-[300px]">
                            <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Tools</CardTitle>
              <CardDescription>
                Upload files and assets for your TortShark account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-dashed rounded-lg p-8 text-center">
                <UploadCloud className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Upload Files</h3>
                <p className="text-muted-foreground mb-4">
                  Drag and drop files here or click to upload
                </p>
                <Button>
                  <UploadCloud className="h-4 w-4 mr-2" /> Select Files
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>Debug Tools</CardTitle>
              <CardDescription>
                Tools for debugging and troubleshooting your TortShark account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Refresh Application
                </Button>
                <Button variant="outline" onClick={() => console.clear()}>
                  Clear Console Logs
                </Button>
                <Button variant="outline" onClick={() => {
                  console.log("Application state:", {
                    localStorage: Object.keys(localStorage),
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    authenticated: isAuthenticated
                  });
                  toast.success("Debug information logged to console");
                }}>
                  Log Debug Information
                </Button>
                <Button variant="outline" onClick={() => {
                  const a = document.createElement("a");
                  const data = {
                    localStorage: localStorageData,
                    supabaseData: supabaseData,
                    url: window.location.href,
                    date: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    authenticated: isAuthenticated
                  };
                  const file = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                  a.href = URL.createObjectURL(file);
                  a.download = "tortshark-debug-data.json";
                  a.click();
                }}>
                  <FileText className="h-4 w-4 mr-2" /> Export Debug Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ToolsPage;
