import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const PortfolioTab = () => {
  // Mock data for backend cases - replace with actual data fetching
  const backendCases = [
    {
      id: 1,
      caseNumber: "BC-2024-001",
      client: "Johnson vs. MedCorp",
      type: "Medical Malpractice",
      status: "Active",
      dateOpened: "2024-01-15",
      estimatedValue: 250000,
      progress: 65
    },
    {
      id: 2,
      caseNumber: "BC-2024-002", 
      client: "Smith vs. AutoDealer",
      type: "Lemon Law",
      status: "Discovery",
      dateOpened: "2024-02-03",
      estimatedValue: 45000,
      progress: 30
    },
    {
      id: 3,
      caseNumber: "BC-2024-003",
      client: "Davis vs. Insurance Co",
      type: "Bad Faith",
      status: "Negotiation",
      dateOpened: "2024-01-28",
      estimatedValue: 180000,
      progress: 85
    }
  ];

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

  const totalValue = backendCases.reduce((sum, case_) => sum + case_.estimatedValue, 0);
  const activeCases = backendCases.filter(case_ => case_.status !== 'Closed').length;

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
              {backendCases.length}
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
          <CardTitle>Backend Cases</CardTitle>
          <CardDescription>
            Track and manage your backend case portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Opened</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Est. Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {backendCases.map((case_) => (
                <TableRow key={case_.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium text-blue-600">
                    {case_.caseNumber}
                  </TableCell>
                  <TableCell>{case_.client}</TableCell>
                  <TableCell>{case_.type}</TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={getStatusBadge(case_.status)}
                    >
                      {case_.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{case_.dateOpened}</TableCell>
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
                    {formatCurrency(case_.estimatedValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioTab;