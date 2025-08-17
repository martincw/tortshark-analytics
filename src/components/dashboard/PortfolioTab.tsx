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
  const { cases, isLoading, fetchCases } = useBackendCases();
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

  const totalValue = cases.reduce((sum, case_) => sum + case_.estimated_value, 0);
  const activeCases = cases.filter(case_ => case_.status !== 'Closed').length;

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
              {cases.length}
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Cases
            </CardTitle>
            <CardDescription className="text-2xl font-bold text-green-600">
              {activeCases}
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
              <CardTitle>Backend Cases</CardTitle>
              <CardDescription>
                Track and manage your backend case portfolio
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Case
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <p className="text-muted-foreground">Loading cases...</p>
            </div>
          ) : cases.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-32 text-center">
              <p className="text-muted-foreground mb-4">No backend cases found</p>
              <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Case
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Opened</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Est. Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((case_) => (
                  <TableRow key={case_.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-primary">
                      {case_.case_number}
                    </TableCell>
                    <TableCell>{case_.client_name}</TableCell>
                    <TableCell>{case_.case_type}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {case_.campaigns?.name || 'No Campaign'}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={getStatusBadge(case_.status)}
                      >
                        {case_.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(case_.date_opened).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all" 
                            style={{ width: `${case_.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground min-w-[3rem]">
                          {case_.progress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(case_.estimated_value)}
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
        onCaseAdded={fetchCases}
      />
    </div>
  );
};

export default PortfolioTab;