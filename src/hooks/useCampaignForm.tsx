
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { AccountConnection } from "@/types/campaign";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const useCampaignForm = () => {
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
  const [targetProfit, setTargetProfit] = useState("");
  const [targetROAS, setTargetROAS] = useState("");
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState("");
  const [targetMonthlySpend, setTargetMonthlySpend] = useState("");
  
  // Only use imported account connections
  const availableAccounts: AccountConnection[] = accountConnections;

  // Calculate target income and spend based on profit and ROAS
  useEffect(() => {
    if (targetProfit && targetROAS && casePayoutAmount && targetMonthlyRetainers) {
      // Convert inputs to numbers
      const profit = parseFloat(targetProfit) || 0;
      const roas = parseFloat(targetROAS) || 0;
      
      if (roas > 0) {
        // Calculate monthly spend based on profit and ROAS
        // If Profit = Income - Spend and ROAS = Income/Spend * 100
        // Then Spend = Profit / (ROAS/100 - 1)
        const spend = profit / ((roas / 100) - 1);
        
        // Ensure we don't divide by zero or negative numbers
        if (isFinite(spend) && spend > 0) {
          setTargetMonthlySpend(spend.toFixed(2));
          
          // Calculate monthly income (Profit + Spend)
          const income = profit + spend;
          setTargetMonthlyIncome(income.toFixed(2));
        } else {
          // Invalid calculation, reset values
          setTargetMonthlySpend("");
          setTargetMonthlyIncome("");
          if (roas <= 100) {
            toast.warning("ROAS must be greater than 100% for valid profit calculation");
          }
        }
      }
    }
  }, [targetProfit, targetROAS, casePayoutAmount, targetMonthlyRetainers]);

  // Parse query parameters to set initial values
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const preselectedAccountId = params.get('accountId');
    
    // Set default to manual entry if no accounts are available
    if (accountConnections.length === 0) {
      setAccountId("manual");
      return;
    }
    
    if (preselectedAccountId) {
      const account = accountConnections.find(acc => acc.id === preselectedAccountId);
      if (account) {
        setAccountId(preselectedAccountId);
        // Make sure we only set platform to "google" since that's the only supported value for campaigns
        setPlatform("google");
        toast.info(`Using account: ${account.name}`);
      } else {
        // If preselected account not found, default to manual entry
        setAccountId("manual");
        toast.warning("Selected account not found, using manual entry");
      }
    } else if (accountConnections.length > 0) {
      // Default to the first account if no account is pre-selected
      setAccountId(accountConnections[0].id);
    } else {
      // Fallback to manual entry if no accounts available
      setAccountId("manual");
    }
  }, [location.search, accountConnections]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Please sign in to add a campaign");
      navigate("/auth");
      return;
    }
    
    if (!campaignName) {
      toast.error("Please enter a campaign name");
      return;
    }
    
    // Always allow manual entry, even if no accounts are connected
    let selectedAccount;
    if (accountId === "manual") {
      // Create a dummy account for manual entries
      selectedAccount = {
        id: "manual",
        name: "Manual Entry",
        platform: "google",
        isConnected: false
      };
    } else {
      // For non-manual entries, verify the selected account exists
      selectedAccount = accountConnections.find(acc => acc.id === accountId);
      
      if (!selectedAccount) {
        toast.error("Google Ads account not found. Please connect an account or select Manual Entry.");
        // Automatically switch to manual entry as a fallback
        setAccountId("manual");
        return;
      }
    }
    
    const currentDate = new Date().toISOString().split("T")[0];
    
    try {
      const newCampaign = {
        name: campaignName,
        platform,
        accountId: selectedAccount.id,
        accountName: selectedAccount.name,
        stats: {
          adSpend: 0,
          impressions: 0,
          clicks: 0,
          cpc: 0,
          date: currentDate,
        },
        manualStats: {
          leads: 0,
          cases: 0,
          retainers: 0,
          revenue: 0,
          date: currentDate,
        },
        statsHistory: [], // Explicitly ensure statsHistory is an empty array
        targets: {
          monthlyRetainers: parseInt(targetMonthlyRetainers) || 0,
          casePayoutAmount: parseFloat(casePayoutAmount) || 0,
          monthlyIncome: parseFloat(targetMonthlyIncome) || 0,
          monthlySpend: parseFloat(targetMonthlySpend) || 0,
          targetROAS: parseFloat(targetROAS) || 0,
          targetProfit: parseFloat(targetProfit) || 0,
        },
      };
      
      console.log("Adding campaign with data:", newCampaign);
      await addCampaign(newCampaign);
      
      // Instead of navigating directly to a specific campaign, go back to the campaigns list
      // This ensures we're not trying to access a campaign that might not be fully loaded yet
      toast.success("Campaign added successfully");
      navigate("/campaigns");
    } catch (error) {
      console.error("Error adding campaign:", error);
      toast.error("Failed to add campaign. Please try again.");
    }
  };

  return {
    campaignName,
    setCampaignName,
    platform,
    accountId,
    setAccountId,
    targetMonthlyRetainers,
    setTargetMonthlyRetainers,
    casePayoutAmount,
    setCasePayoutAmount,
    targetProfit,
    setTargetProfit,
    targetROAS,
    setTargetROAS,
    targetMonthlyIncome,
    targetMonthlySpend,
    availableAccounts,
    handleSubmit
  };
};
