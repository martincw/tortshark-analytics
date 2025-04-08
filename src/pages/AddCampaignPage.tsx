
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCampaign } from "@/contexts/CampaignContext";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Campaign } from "@/types/campaign";

const AddCampaignPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addCampaign, accountConnections } = useCampaign();
  
  // Campaign basic details
  const [campaignName, setCampaignName] = useState("");
  const [platform, setPlatform] = useState<"google">("google");
  const [accountId, setAccountId] = useState("");
  
  // Campaign targets
  const [targetMonthlyRetainers, setTargetMonthlyRetainers] = useState("");
  const [casePayoutAmount, setCasePayoutAmount] = useState("");
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState("");
  const [targetMonthlySpend, setTargetMonthlySpend] = useState("");
  const [targetROAS, setTargetROAS] = useState("");
  
  // Campaign stats
  const [adSpend, setAdSpend] = useState("");
  const [leads, setLeads] = useState("");
  const [cases, setCases] = useState("");
  const [retainers, setRetainers] = useState("");
  const [revenue, setRevenue] = useState("");
  
  // Include all accounts or create a manual account option
  const availableAccounts = accountConnections.length > 0 
    ? accountConnections 
    : [{ id: "manual", name: "Manual Entry", platform: "google" as any, isConnected: true, lastSynced: null }];

  // Parse query parameters to set initial values
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const preselectedAccountId = params.get('accountId');
    
    if (preselectedAccountId) {
      const account = accountConnections.find(acc => acc.id === preselectedAccountId);
      if (account) {
        setAccountId(preselectedAccountId);
        setPlatform(account.platform);
        toast.info(`Using account: ${account.name}`);
      }
    } else if (accountConnections.length > 0) {
      // Default to the first account if no account is pre-selected
      setAccountId(accountConnections[0].id);
    }
  }, [location.search, accountConnections]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }
    
    // Use selected account or create a manual one
    let selectedAccount = availableAccounts.find(acc => acc.id === accountId);
    
    if (!selectedAccount) {
      // Create a manual account if none selected
      selectedAccount = {
        id: "manual-" + Date.now(),
        name: "Manual Entry",
        platform: platform,
        isConnected: true,
        lastSynced: null
      };
    }
    
    const currentDate = new Date().toISOString().split("T")[0];
    
    const newCampaign: Omit<Campaign, "id"> = {
      name: campaignName,
      platform,
      accountId: selectedAccount.id,
      accountName: selectedAccount.name,
      stats: {
        adSpend: parseFloat(adSpend) || 0,
        impressions: 0,
        clicks: parseFloat(adSpend) ? Math.floor(parseFloat(adSpend) / 2) : 0, // Rough estimate
        cpc: parseFloat(adSpend) && parseFloat(adSpend) > 0 ? 2 : 0, // Default CPC as $2
        date: currentDate,
      },
      manualStats: {
        leads: parseInt(leads) || 0,
        cases: parseInt(cases) || 0,
        retainers: parseInt(retainers) || 0,
        revenue: parseFloat(revenue) || 0,
        date: currentDate,
      },
      targets: {
        monthlyRetainers: parseInt(targetMonthlyRetainers) || 0,
        casePayoutAmount: parseFloat(casePayoutAmount) || 0,
        monthlyIncome: parseFloat(targetMonthlyIncome) || 0,
        monthlySpend: parseFloat(targetMonthlySpend) || 0,
        targetROAS: parseFloat(targetROAS) || 0,
      },
    };
    
    try {
      console.log("Adding campaign:", newCampaign);
      const campaignId = addCampaign(newCampaign);
      console.log("Campaign added with ID:", campaignId);
      toast.success("Campaign added successfully");
      navigate("/campaigns");
    } catch (error) {
      console.error("Error adding campaign:", error);
      toast.error("Failed to add campaign. Please try again.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          onClick={() => navigate("/campaigns")}
          variant="outline"
          size="icon"
          className="h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Add New Campaign</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
          <CardDescription>
            Enter the details for your new advertising campaign
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Campaign Name *
                </label>
                <Input
                  id="name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g., Rideshare - Search"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Start with the tort type, e.g., "Rideshare", "LDS", "MD", or "Wildfire"
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="platform" className="text-sm font-medium">
                  Platform *
                </label>
                <div className="w-full p-2 border rounded-md bg-muted/30 text-sm">
                  Google Ads
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="account" className="text-sm font-medium">
                  Account 
                </label>
                <Select
                  value={accountId}
                  onValueChange={setAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Entry (No Account)</SelectItem>
                    {availableAccounts.filter(acc => acc.id !== "manual").map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} (Google Ads)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Manual account creation only. No automatic syncing available.
                </p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-md font-medium mb-4">Campaign Targets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="targetMonthlyRetainers" className="text-sm font-medium">
                    Target Monthly Retainers
                  </label>
                  <Input
                    id="targetMonthlyRetainers"
                    type="number"
                    min="0"
                    value={targetMonthlyRetainers}
                    onChange={(e) => setTargetMonthlyRetainers(e.target.value)}
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="casePayoutAmount" className="text-sm font-medium">
                    Case Payout Amount ($)
                  </label>
                  <Input
                    id="casePayoutAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={casePayoutAmount}
                    onChange={(e) => setCasePayoutAmount(e.target.value)}
                    placeholder="e.g., 5000.00"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="targetMonthlyIncome" className="text-sm font-medium">
                    Target Monthly Income ($)
                  </label>
                  <Input
                    id="targetMonthlyIncome"
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetMonthlyIncome}
                    onChange={(e) => setTargetMonthlyIncome(e.target.value)}
                    placeholder="e.g., 50000.00"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="targetMonthlySpend" className="text-sm font-medium">
                    Target Monthly Ad Spend ($)
                  </label>
                  <Input
                    id="targetMonthlySpend"
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetMonthlySpend}
                    onChange={(e) => setTargetMonthlySpend(e.target.value)}
                    placeholder="e.g., 10000.00"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="targetROAS" className="text-sm font-medium">
                    Target ROAS (%)
                  </label>
                  <Input
                    id="targetROAS"
                    type="number"
                    min="0"
                    step="0.1"
                    value={targetROAS}
                    onChange={(e) => setTargetROAS(e.target.value)}
                    placeholder="e.g., 300"
                  />
                  <p className="text-xs text-muted-foreground">
                    Return on ad spend (ROAS) target percentage
                  </p>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-md font-medium mb-4">Current Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="adSpend" className="text-sm font-medium">
                    Ad Spend ($)
                  </label>
                  <Input
                    id="adSpend"
                    type="number"
                    min="0"
                    step="0.01"
                    value={adSpend}
                    onChange={(e) => setAdSpend(e.target.value)}
                    placeholder="e.g., 1000.00"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="leads" className="text-sm font-medium">
                    Number of Leads
                  </label>
                  <Input
                    id="leads"
                    type="number"
                    min="0"
                    value={leads}
                    onChange={(e) => setLeads(e.target.value)}
                    placeholder="e.g., 50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="cases" className="text-sm font-medium">
                    Number of Cases
                  </label>
                  <Input
                    id="cases"
                    type="number"
                    min="0"
                    value={cases}
                    onChange={(e) => setCases(e.target.value)}
                    placeholder="e.g., 10"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="retainers" className="text-sm font-medium">
                    Number of Retainers
                  </label>
                  <Input
                    id="retainers"
                    type="number"
                    min="0"
                    value={retainers}
                    onChange={(e) => setRetainers(e.target.value)}
                    placeholder="e.g., 5"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="revenue" className="text-sm font-medium">
                    Revenue ($)
                  </label>
                  <Input
                    id="revenue"
                    type="number"
                    min="0"
                    step="0.01"
                    value={revenue}
                    onChange={(e) => setRevenue(e.target.value)}
                    placeholder="e.g., 25000.00"
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/campaigns")}
            >
              Cancel
            </Button>
            <Button type="submit">Create Campaign</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default AddCampaignPage;
