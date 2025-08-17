import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";
import { useBackendCases } from "@/hooks/useBackendCases";
import { AddBackendCaseDialog } from "./AddBackendCaseDialog";
import { useCampaign } from "@/contexts/CampaignContext";

const PortfolioTab = () => {
  const { caseStats, isLoading, fetchCaseStats } = useBackendCases();
  const { campaigns } = useCampaign();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    const statusColors = {
      "Active": "bg-green-100 text-green-800 border-green-200",
      "Discovery": "bg-blue-100 text-blue-800 border-blue-200", 
      "Negotiation": "bg-orange-100 text-orange-800 border-orange-200",
      "Closed": "bg-gray-100 text-gray-800 border-gray-200"
    };
    
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalValue = caseStats.reduce((sum, stat) => sum + stat.total_value, 0);
  const totalCases = caseStats.reduce((sum, stat) => sum + stat.case_count, 0);

  return (
    <div className="space-y-6">
      {/* Portfolio Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cases
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-foreground">
              {totalCases}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg. Case Value
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-green-600">
              {totalCases > 0 ? formatCurrency(totalValue / totalCases) : formatCurrency(0)}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Portfolio Value
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-primary">
              {formatCurrency(totalValue)}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Backend Cases Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Backend Case Stats</CardTitle>
              <CardDescription>
                Daily backend case statistics by campaign
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Stats
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">Loading case stats...</p>
            </div>
          ) : caseStats.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-32 text-center">
              <p className="text-muted-foreground mb-4">No backend case stats found</p>
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Stats
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Campaign Type</TableHead>
                  <TableHead># of Cases</TableHead>
                  <TableHead>$/Case</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {caseStats.map((stat) => (
                  <TableRow key={stat.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {new Date(stat.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-primary">
                      {stat.campaigns?.name || 'Unknown Campaign'}
                    </TableCell>
                    <TableCell>{stat.case_count}</TableCell>
                    <TableCell>{formatCurrency(stat.price_per_case)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(stat.total_value)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddBackendCaseDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        campaigns={campaigns}
        onCaseAdded={fetchCaseStats}
      />
    </div>
  );
};

export default PortfolioTab;