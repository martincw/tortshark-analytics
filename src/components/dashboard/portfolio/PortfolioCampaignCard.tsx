import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, DollarSign, Briefcase, TrendingUp, Percent } from "lucide-react";
import { CampaignPortfolio } from "@/hooks/usePortfolio";

interface PortfolioCampaignCardProps {
  portfolio: CampaignPortfolio;
  isEnabled: boolean;
  onToggle: (campaignId: string, enabled: boolean) => void;
  onSettingsUpdate: (campaignId: string, settlement: number, split: number) => void;
}

export function PortfolioCampaignCard({ 
  portfolio, 
  isEnabled, 
  onToggle,
  onSettingsUpdate 
}: PortfolioCampaignCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editSettlement, setEditSettlement] = useState(portfolio.settlementValue.toString());
  const [editSplit, setEditSplit] = useState(portfolio.splitPercentage?.toString() || "42.5");
  const [isToggling, setIsToggling] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleToggle = () => {
    setIsToggling(true);
    onToggle(portfolio.campaignId, !isEnabled);
    setTimeout(() => setIsToggling(false), 300);
  };

  const handleSave = () => {
    const settlement = parseFloat(editSettlement) || 0;
    const split = Math.min(100, Math.max(0, parseFloat(editSplit) || 100));
    onSettingsUpdate(portfolio.campaignId, settlement, split);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditSettlement(portfolio.settlementValue.toString());
    setEditSplit(portfolio.splitPercentage.toString());
    setIsEditing(false);
  };

  const calculatedShare = portfolio.settlementValue * (portfolio.splitPercentage / 100);
  const totalProjectedValue = portfolio.totalCases * calculatedShare;

  return (
    <Card 
      className={`overflow-hidden transition-all duration-300 transform border border-border/80
                 ${isEnabled ? 'bg-[#F2FCE2]/40' : 'opacity-60'} 
                 ${isToggling ? (isEnabled ? 'scale-[1.02]' : 'scale-[0.98]') : ''}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold truncate pr-2">
            {portfolio.campaignName}
          </CardTitle>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs transition-colors duration-200 ${isEnabled ? 'text-green-600' : 'text-muted-foreground'}`}>
              {isEnabled ? 'Active' : 'Inactive'}
            </span>
            <Switch 
              checked={isEnabled} 
              onCheckedChange={handleToggle}
              className={`transition-all ${isToggling ? 'scale-110' : ''}`}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Cases Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span className="text-sm">Cases</span>
          </div>
          <span className="font-semibold text-lg">{portfolio.totalCases.toLocaleString()}</span>
        </div>

        {isEditing ? (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            {/* Settlement Value Edit */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Settlement</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={editSettlement}
                  onChange={(e) => setEditSettlement(e.target.value)}
                  className="w-24 h-8 text-right"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Split Percentage Edit */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">Your Split</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={editSplit}
                  onChange={(e) => setEditSplit(e.target.value)}
                  className="w-20 h-8 text-right"
                  min="0"
                  max="100"
                />
                <span className="text-muted-foreground">%</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-1 pt-1">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSave}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Settlement Value */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Avg Settlement</span>
              </div>
              <div className="flex items-center gap-1">
                <span className={`font-semibold ${portfolio.settlementValue > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {portfolio.settlementValue > 0 ? formatCurrency(portfolio.settlementValue) : 'Not set'}
                </span>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Split Percentage */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Percent className="h-4 w-4" />
                <span className="text-sm">Your Split</span>
              </div>
              <span className="font-semibold">{portfolio.splitPercentage}%</span>
            </div>

            {/* Your Share (calculated) */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Your Share/Case</span>
              </div>
              <span className="font-bold text-lg text-green-600">
                {calculatedShare > 0 ? formatCurrency(calculatedShare) : '-'}
              </span>
            </div>
          </>
        )}

        {/* NAV */}
        <div className="flex items-center justify-between pt-2 border-t bg-muted/20 -mx-6 px-6 py-2">
          <span className="text-sm font-medium text-muted-foreground">Current NAV</span>
          <span className="font-bold text-green-600">{formatCurrency(portfolio.totalValue)}</span>
        </div>

        {/* Total Projected Value */}
        <div className="flex items-center justify-between bg-primary/10 -mx-6 px-6 py-3 -mb-3">
          <span className="text-sm font-semibold">Total Projected</span>
          <span className="font-bold text-lg text-primary">
            {totalProjectedValue > 0 ? formatCurrency(totalProjectedValue) : '-'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
