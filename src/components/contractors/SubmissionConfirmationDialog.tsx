
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download, Calendar, User, Mail } from "lucide-react";
import { format } from "date-fns";

interface Campaign {
  id: string;
  name: string;
}

type DailyStats = {
  leads: number;
  cases: number;
  revenue: number;
  youtubeSpend: number;
  metaSpend: number;
  newsbreakSpend: number;
};

interface SubmissionConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractorInfo: {
    contractorEmail: string;
    contractorName: string;
    submissionDate: string;
    notes: string;
  };
  campaigns: Campaign[];
  statsData: Record<string, DailyStats>;
  selectedCampaigns: Set<string>;
}

export function SubmissionConfirmationDialog({
  open,
  onOpenChange,
  contractorInfo,
  campaigns,
  statsData,
  selectedCampaigns,
}: SubmissionConfirmationDialogProps) {
  const submittedCampaigns = campaigns.filter(campaign => 
    selectedCampaigns.has(campaign.id)
  );

  const totals = submittedCampaigns.reduce(
    (acc, campaign) => {
      const stats = statsData[campaign.id] || { leads: 0, cases: 0, revenue: 0, youtubeSpend: 0, metaSpend: 0, newsbreakSpend: 0 };
      const totalAdSpend = (stats.youtubeSpend || 0) + (stats.metaSpend || 0) + (stats.newsbreakSpend || 0);
      return {
        adSpend: acc.adSpend + totalAdSpend,
        leads: acc.leads + (stats.leads || 0),
        cases: acc.cases + (stats.cases || 0),
        revenue: acc.revenue + (stats.revenue || 0),
      };
    },
    { adSpend: 0, leads: 0, cases: 0, revenue: 0 }
  );

  const handlePrint = () => {
    window.print();
  };

  const submissionTimestamp = new Date().toLocaleString();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <DialogTitle className="text-2xl text-green-600">
            Submission Successful!
          </DialogTitle>
          <DialogDescription className="text-lg">
            Your campaign statistics have been submitted and are pending admin approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contractor Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <User className="h-5 w-5 mr-2" />
                Submission Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Name:</span>
                  <span className="ml-2">{contractorInfo.contractorName}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span className="ml-2">{contractorInfo.contractorEmail}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="font-medium">Data Date:</span>
                  <span className="ml-2">{format(new Date(contractorInfo.submissionDate), 'MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium">Submitted:</span>
                  <span className="ml-2">{submissionTimestamp}</span>
                </div>
              </div>
              {contractorInfo.notes && (
                <div className="mt-4">
                  <span className="font-medium">Notes:</span>
                  <p className="mt-1 text-muted-foreground">{contractorInfo.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Totals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Summary Totals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">{selectedCampaigns.size}</div>
                  <div className="text-sm text-muted-foreground">Campaigns</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">${totals.adSpend.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Ad Spend</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">{totals.leads.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Leads</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">{totals.cases.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Cases</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">${totals.revenue.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Revenue</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Campaign Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Statistics Submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                 <TableHeader>
                   <TableRow>
                     <TableHead>Campaign</TableHead>
                     <TableHead className="text-right">YouTube</TableHead>
                     <TableHead className="text-right">Meta</TableHead>
                     <TableHead className="text-right">Newsbreak</TableHead>
                     <TableHead className="text-right">Total Ad Spend</TableHead>
                     <TableHead className="text-right">Leads</TableHead>
                     <TableHead className="text-right">Cases</TableHead>
                     <TableHead className="text-right">Revenue</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {submittedCampaigns.map((campaign) => {
                     const stats = statsData[campaign.id] || { leads: 0, cases: 0, revenue: 0, youtubeSpend: 0, metaSpend: 0, newsbreakSpend: 0 };
                     const totalAdSpend = (stats.youtubeSpend || 0) + (stats.metaSpend || 0) + (stats.newsbreakSpend || 0);
                     return (
                       <TableRow key={campaign.id}>
                         <TableCell className="font-medium">{campaign.name}</TableCell>
                         <TableCell className="text-right">${(stats.youtubeSpend || 0).toLocaleString()}</TableCell>
                         <TableCell className="text-right">${(stats.metaSpend || 0).toLocaleString()}</TableCell>
                         <TableCell className="text-right">${(stats.newsbreakSpend || 0).toLocaleString()}</TableCell>
                         <TableCell className="text-right font-medium">${totalAdSpend.toLocaleString()}</TableCell>
                         <TableCell className="text-right">{(stats.leads || 0).toLocaleString()}</TableCell>
                         <TableCell className="text-right">{(stats.cases || 0).toLocaleString()}</TableCell>
                         <TableCell className="text-right">${(stats.revenue || 0).toLocaleString()}</TableCell>
                       </TableRow>
                     );
                   })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Important Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your submission is pending admin review and approval</li>
              <li>• You will be notified once your stats have been reviewed</li>
              <li>• Keep this confirmation for your records</li>
              <li>• Contact support if you notice any errors in the data above</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={handlePrint} className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Print Confirmation
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
