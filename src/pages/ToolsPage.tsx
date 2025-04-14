
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { InfoIcon, UploadCloud, FileText, Database, RefreshCw } from "lucide-react";

const ToolsPage = () => {
  const [localStorageData, setLocalStorageData] = useState<Record<string, any>>({});
  
  useEffect(() => {
    refreshLocalStorageData();
  }, []);
  
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
  
  const clearAllLocalStorage = () => {
    if (window.confirm("Are you sure you want to clear all localStorage data? This will delete all your campaigns and settings.")) {
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
  
  const fixCampaignsData = () => {
    try {
      // Create a test campaign if none exist
      const campaigns = [];
      
      // Add a test campaign
      campaigns.push({
        id: "test-campaign-1",
        name: "Test Campaign - Birth Control",
        platform: "google",
        accountId: "123456789",
        accountName: "Test Google Ads Account",
        stats: {
          adSpend: 5000,
          impressions: 25000,
          clicks: 1250,
          cpc: 4,
          date: new Date().toISOString()
        },
        manualStats: {
          leads: 100,
          cases: 25,
          retainers: 10,
          revenue: 50000,
          date: new Date().toISOString()
        },
        statsHistory: [],
        targets: {
          monthlyRetainers: 20,
          casePayoutAmount: 2500,
          monthlyIncome: 100000,
          monthlySpend: 20000,
          targetROAS: 5,
          targetProfit: 80000
        }
      });
      
      // Add another test campaign
      campaigns.push({
        id: "test-campaign-2",
        name: "Test Campaign - Camp Lejeune",
        platform: "google",
        accountId: "123456789",
        accountName: "Test Google Ads Account",
        stats: {
          adSpend: 8000,
          impressions: 40000,
          clicks: 2000,
          cpc: 4,
          date: new Date().toISOString()
        },
        manualStats: {
          leads: 150,
          cases: 40,
          retainers: 15,
          revenue: 75000,
          date: new Date().toISOString()
        },
        statsHistory: [],
        targets: {
          monthlyRetainers: 30,
          casePayoutAmount: 3000,
          monthlyIncome: 150000,
          monthlySpend: 30000,
          targetROAS: 5,
          targetProfit: 120000
        }
      });
      
      localStorage.setItem("campaigns", JSON.stringify(campaigns));
      refreshLocalStorageData();
      
      // Create a sample account connection
      const accountConnections = [{
        id: "test-account-1",
        name: "Test Google Ads Account",
        platform: "google",
        isConnected: true,
        lastSynced: new Date().toISOString(),
        customerId: "123456789",
        credentials: {
          customerId: "123456789"
        }
      }];
      
      localStorage.setItem("accountConnections", JSON.stringify(accountConnections));
      
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
              <Button onClick={fixCampaignsData} variant="default" size="sm">
                <Database className="h-4 w-4 mr-1" /> Fix Campaign Data
              </Button>
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
                    userAgent: navigator.userAgent
                  });
                  toast.success("Debug information logged to console");
                }}>
                  Log Debug Information
                </Button>
                <Button variant="outline" onClick={() => {
                  const a = document.createElement("a");
                  const file = new Blob([JSON.stringify(localStorageData, null, 2)], { type: "application/json" });
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
