import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, DollarSign, Briefcase, TrendingUp } from "lucide-react";
import { CampaignPortfolio } from "@/hooks/usePortfolio";

interface PortfolioCampaignCardProps {
  portfolio: CampaignPortfolio;
  isEnabled: boolean;
  onToggle: (campaignId: string, enabled: boolean) => void;
  onSettlementUpdate: (campaignId: string, value: number) => void;
}

export function PortfolioCampaignCard({ 
  portfolio, 
  isEnabled, 
  onToggle,
  onSettlementUpdate 
}: PortfolioCampaignCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(portfolio.settlementValue.toString());
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
    const value = parseFloat(editValue) || 0;
    onSettlementUpdate(portfolio.campaignId, value);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(portfolio.settlementValue.toString());
    setIsEditing(false);
  };

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

        {/* Settlement Value */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">Avg Settlement</span>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-24 h-8 text-right"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSave}>
                <Check className="h-4 w-4 text-green-600" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel}>
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className={`font-semibold ${portfolio.settlementValue > 0 ? 'text-blue-600' : 'text-muted-foreground'}`}>
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
          )}
        </div>

        {/* NAV */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span className="text-sm font-medium">NAV</span>
          </div>
          <span className="font-bold text-lg text-green-600">{formatCurrency(portfolio.totalValue)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
