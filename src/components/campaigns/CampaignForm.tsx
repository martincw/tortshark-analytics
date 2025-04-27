
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCampaignForm } from "@/hooks/useCampaignForm";
import CampaignDetailsSection from "./CampaignDetailsSection";
import CampaignTargetsSection from "./CampaignTargetsSection";
import { CampaignMappingSection } from "./CampaignMappingSection";
import { BuyerStackSection } from "./BuyerStackSection";
import { toast } from "sonner";

interface CampaignFormProps {
  onCancel: () => void;
}

const CampaignForm: React.FC<CampaignFormProps> = ({ onCancel }) => {
  const {
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
    handleSubmit,
    id
  } = useCampaignForm();

  const onSubmitWithLogging = (e: React.FormEvent) => {
    console.log("Form submission initiated with data:", {
      campaignName,
      platform,
      accountId,
      targetMonthlyRetainers,
      casePayoutAmount,
      targetProfit,
      targetROAS,
      targetMonthlyIncome,
      targetMonthlySpend
    });
    
    if (!campaignName) {
      console.warn("Form submission prevented - missing campaign name");
      toast.error("Please enter a campaign name");
      return;
    }
    
    handleSubmit(e);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Details</CardTitle>
        <CardDescription>
          Enter the details for your new advertising campaign
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmitWithLogging}>
        <CardContent className="space-y-6">
          <CampaignDetailsSection
            campaignName={campaignName}
            setCampaignName={setCampaignName}
            platform={platform}
            accountId={accountId}
            setAccountId={setAccountId}
            availableAccounts={availableAccounts}
          />
          
          <CampaignTargetsSection
            targetMonthlyRetainers={targetMonthlyRetainers}
            setTargetMonthlyRetainers={setTargetMonthlyRetainers}
            casePayoutAmount={casePayoutAmount}
            setCasePayoutAmount={setCasePayoutAmount}
            targetProfit={targetProfit}
            setTargetProfit={setTargetProfit}
            targetROAS={targetROAS}
            setTargetROAS={setTargetROAS}
            targetMonthlyIncome={targetMonthlyIncome}
            targetMonthlySpend={targetMonthlySpend}
          />
          
          {id && <BuyerStackSection campaignId={id} />}

          <CampaignMappingSection
            campaignId={id || ''}
            availableAccounts={availableAccounts}
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit">{id ? 'Update' : 'Create'} Campaign</Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CampaignForm;
