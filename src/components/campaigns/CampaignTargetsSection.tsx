
import React, { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/campaignUtils";

interface CampaignTargetsSectionProps {
  targetMonthlyRetainers: string;
  setTargetMonthlyRetainers: (value: string) => void;
  casePayoutAmount: string;
  setCasePayoutAmount: (value: string) => void;
  targetProfit: string;
  setTargetProfit: (value: string) => void;
  targetROAS: string;
  setTargetROAS: (value: string) => void;
  targetMonthlyIncome: string;
  targetMonthlySpend: string;
}

const CampaignTargetsSection: React.FC<CampaignTargetsSectionProps> = ({
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
}) => {
  // Calculate target monthly retainers based on target profit and case payout amount
  useEffect(() => {
    if (targetProfit && casePayoutAmount) {
      const profit = parseFloat(targetProfit) || 0;
      const payoutAmount = parseFloat(casePayoutAmount) || 0;
      
      if (payoutAmount > 0) {
        // Calculate how many cases needed to reach target profit
        const casesNeeded = Math.ceil(profit / payoutAmount);
        setTargetMonthlyRetainers(casesNeeded.toString());
      }
    }
  }, [targetProfit, casePayoutAmount, setTargetMonthlyRetainers]);

  return (
    <div className="border-t pt-4">
      <h3 className="text-md font-medium mb-4">Campaign Targets</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="targetProfit" className="text-sm font-medium">
            Target Monthly Profit ($)
          </label>
          <Input
            id="targetProfit"
            type="number"
            min="0"
            step="0.01"
            value={targetProfit}
            onChange={(e) => setTargetProfit(e.target.value)}
            placeholder="e.g., 25000"
          />
          <p className="text-xs text-muted-foreground">
            Your target monthly profit from this campaign
          </p>
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
          <label htmlFor="targetMonthlyRetainers" className="text-sm font-medium">
            Target Monthly Cases
          </label>
          <Input
            id="targetMonthlyRetainers"
            type="number"
            min="0"
            value={targetMonthlyRetainers}
            readOnly
            className="bg-muted/30"
          />
          {targetMonthlyRetainers && targetProfit && casePayoutAmount && (
            <p className="text-xs text-muted-foreground">
              Estimated {targetMonthlyRetainers} cases needed to reach ${targetProfit} profit
            </p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="targetROAS" className="text-sm font-medium">
            Target ROAS (%)
          </label>
          <Input
            id="targetROAS"
            type="number"
            min="101"
            step="0.1"
            value={targetROAS}
            onChange={(e) => setTargetROAS(e.target.value)}
            placeholder="e.g., 300"
          />
          <p className="text-xs text-muted-foreground">
            Return on ad spend (ROAS) target percentage (must be &gt;100%)
          </p>
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
            readOnly
            className="bg-muted/30"
          />
          {targetMonthlyIncome && targetMonthlyRetainers && casePayoutAmount && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(targetMonthlyIncome))} income needed based on profit and ROAS targets
            </p>
          )}
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
            readOnly
            className="bg-muted/30"
          />
          {targetMonthlySpend && targetROAS && (
            <p className="text-xs text-muted-foreground">
              {formatCurrency(parseFloat(targetMonthlySpend))} ad spend needed to achieve {targetROAS}% ROAS
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignTargetsSection;
