import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Briefcase, DollarSign, TrendingUp, PieChart } from "lucide-react";
import { PortfolioSummary } from "@/hooks/usePortfolio";

interface PortfolioSummaryCardsProps {
  summary: PortfolioSummary;
}

export function PortfolioSummaryCards({ summary }: PortfolioSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cases
            </CardTitle>
          </div>
          <CardDescription className="text-3xl font-bold text-foreground">
            {summary.totalCases.toLocaleString()}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-green-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total NAV
            </CardTitle>
          </div>
          <CardDescription className="text-3xl font-bold text-green-600">
            {formatCurrency(summary.totalNAV)}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Settlement
            </CardTitle>
          </div>
          <CardDescription className="text-3xl font-bold text-blue-600">
            {formatCurrency(summary.avgSettlement)}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Torts
            </CardTitle>
          </div>
          <CardDescription className="text-3xl font-bold text-purple-600">
            {summary.campaignCount}
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
