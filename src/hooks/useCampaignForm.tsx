import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { AccountConnection } from "@/types/campaign";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

export const useCampaignForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addCampaign, accountConnections } = useCampaign();
  
  const [id, setId] = useState<string>(uuidv4());
  
  const [campaignName, setCampaignName] = useState("");
  const [platform, setPlatform] = useState<"google">("google");
  const [accountId, setAccountId] = useState("");
  
  const [targetMonthlyRetainers, setTargetMonthlyRetainers] = useState("");
  const [casePayoutAmount, setCasePayoutAmount] = useState("");
  const [targetProfit, setTargetProfit] = useState("");
  const [targetROAS, setTargetROAS] = useState("");
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState("");
  const [targetMonthlySpend, setTargetMonthlySpend] = useState("");
  
  const availableAccounts: AccountConnection[] = accountConnections;

  useEffect(() => {
    if (targetProfit && targetROAS && casePayoutAmount && targetMonthlyRetainers) {
      const profit = parseFloat(targetProfit) || 0;
      const roas = parseFloat(targetROAS) || 0;
      
      if (roas > 0) {
        const spend = profit / ((roas / 100) - 1);
        
        if (isFinite(spend) && spend > 0) {
          setTargetMonthlySpend(spend.toFixed(2));
          
          const income = profit + spend;
          setTargetMonthlyIncome(income.toFixed(2));
        } else {
          setTargetMonthlySpend("");
          setTargetMonthlyIncome("");
          if (roas <= 100) {
            toast.warning("ROAS must be greater than 100% for valid profit calculation");
          }
        }
      }
    }
  }, [targetProfit, targetROAS, casePayoutAmount, targetMonthlyRetainers]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const preselectedAccountId = params.get('accountId');
    
    if (accountConnections.length === 0) {
      setAccountId("manual");
      return;
    }
    
    if (preselectedAccountId) {
      const account = accountConnections.find(acc => acc.id === preselectedAccountId);
      if (account) {
        setAccountId(preselectedAccountId);
        setPlatform("google");
        toast.info(`Using account: ${account.name}`);
      } else {
        setAccountId("manual");
        toast.warning("Selected account not found, using manual entry");
      }
    } else if (accountConnections.length > 0) {
      setAccountId(accountConnections[0].id);
    } else {
      setAccountId("manual");
    }
  }, [location.search, accountConnections]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    
    let selectedAccount;
    if (accountId === "manual") {
      selectedAccount = {
        id: "manual",
        name: "Manual Entry",
        platform: "google",
        isConnected: false
      };
    } else {
      selectedAccount = accountConnections.find(acc => acc.id === accountId);
      
      if (!selectedAccount) {
        toast.error("Google Ads account not found. Please connect an account or select Manual Entry.");
        setAccountId("manual");
        return;
      }
    }
    
    const currentDate = new Date().toISOString().split("T")[0];
    
    try {
      const newCampaign = {
        id,
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
        statsHistory: [],
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
      
      toast.success("Campaign added successfully");
      navigate("/campaigns");
    } catch (error) {
      console.error("Error adding campaign:", error);
      toast.error("Failed to add campaign. Please try again.");
    }
  };

  return {
    id,
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
