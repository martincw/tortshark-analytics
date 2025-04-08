import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { Campaign, AccountConnection } from "@/types/campaign";
import { toast } from "sonner";

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
  
  // Include all accounts or create a manual account option
  const availableAccounts = accountConnections.length > 0 
    ? accountConnections 
    : [{ id: "manual", name: "Manual Entry", platform: "google" as any, isConnected: true, lastSynced: null }];

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
      statsHistory: [], // Explicitly initialize with empty array
      targets: {
        monthlyRetainers: parseInt(targetMonthlyRetainers) || 0,
        casePayoutAmount: parseFloat(casePayoutAmount) || 0,
        monthlyIncome: parseFloat(targetMonthlyIncome) || 0,
        monthlySpend: parseFloat(targetMonthlySpend) || 0,
        targetROAS: parseFloat(targetROAS) || 0,
        targetProfit: parseFloat(targetProfit) || 0,
      },
    };
    
    try {
      console.log("Adding campaign with statsHistory:", newCampaign);
      const campaignId = addCampaign(newCampaign);
      console.log("Campaign added with ID:", campaignId);
      toast.success("Campaign added successfully");
      navigate(`/campaign/${campaignId}`); // Navigate to campaign detail page
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
