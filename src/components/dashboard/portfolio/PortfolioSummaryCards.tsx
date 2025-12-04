import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, TrendingUp, PieChart, Percent } from "lucide-react";
import { PortfolioSummary } from "@/hooks/usePortfolio";

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary;
}

export function PortfolioSummaryCards({ summary }: PortfolioSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Cases
            </CardTitle>
          </div>
          <CardDescription className="text-2xl font-bold text-foreground">
            {summary.totalCases.toLocaleString()}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Settlement
            </CardTitle>
          </div>
          <CardDescription className="text-2xl font-bold text-blue-600">
            {formatCurrency(summary.avgSettlement)}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Avg Split
            </CardTitle>
          </div>
          <CardDescription className="text-2xl font-bold text-purple-600">
            {summary.avgSplit.toFixed(1)}%
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-green-600" />
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Projected Value
            </CardTitle>
          </div>
          <CardDescription className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.projectedValue)}
          </CardDescription>
          <p className="text-xs text-muted-foreground">Cases × Settlement × Split</p>
        </CardHeader>
      </Card>
    </div>
  );
}
