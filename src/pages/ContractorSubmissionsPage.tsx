
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { CheckCircle, XCircle, Trash2, Edit } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EditSubmissionDialog } from "@/components/contractors/EditSubmissionDialog";

interface ContractorSubmission {
  id: string;
  contractor_email: string;
  contractor_name: string;
  campaign_id: string;
  submission_date: string;
  ad_spend: number;
  youtube_spend?: number;
  meta_spend?: number;
  newsbreak_spend?: number;
  leads: number;
  cases: number;
  revenue: number;
  status: string;
  notes: string;
  created_at: string;
  campaigns: {
    name: string;
  };
}

export default function ContractorSubmissionsPage() {
  const [submissions, setSubmissions] = useState<ContractorSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<ContractorSubmission | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('contractor_submissions')
        .select(`
          *,
          campaigns (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSubmission = async (submissionId: string, data: {
    submission_date: string;
    ad_spend: number;
    youtube_spend?: number;
    meta_spend?: number; 
    newsbreak_spend?: number;
    leads: number;
    cases: number;
    revenue: number;
    notes: string;
  }) => {
    setProcessingId(submissionId);
    
    try {
      console.log('Updating submission with data:', data);
      
      const { data: updatedData, error } = await supabase
        .from('contractor_submissions')
        .update({
          submission_date: data.submission_date,
          ad_spend: data.ad_spend,
          youtube_spend: data.youtube_spend || 0,
          meta_spend: data.meta_spend || 0,
          newsbreak_spend: data.newsbreak_spend || 0,
          leads: data.leads,
          cases: data.cases,
          revenue: data.revenue,
          notes: data.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .select('*, campaigns(name)')
        .single();

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Database update successful:', updatedData);

      // If this submission was already approved, also update the campaign_stats_history
      if (updatedData.status === 'approved') {
        console.log('Submission is approved, updating campaign_stats_history...');
        
        const { error: historyError } = await supabase
          .from('campaign_stats_history')
          .update({
            ad_spend: data.ad_spend,
            youtube_spend: data.youtube_spend || 0,
            meta_spend: data.meta_spend || 0,
            newsbreak_spend: data.newsbreak_spend || 0,
            leads: data.leads,
            cases: data.cases,
            revenue: data.revenue
          })
          .eq('campaign_id', updatedData.campaign_id)
          .eq('date', data.submission_date);

        if (historyError) {
          console.error('Error updating campaign stats history:', historyError);
          toast.error('Updated submission but failed to sync with campaign stats');
        } else {
          console.log('Successfully synced with campaign stats history');
        }
      }

      toast.success('Submission updated successfully');
      setIsEditDialogOpen(false);
      setEditingSubmission(null);
      
      // Force refresh from database
      await fetchSubmissions();
      
    } catch (error) {
      console.error('Error updating submission:', error);
      toast.error('Failed to update submission');
    } finally {
      setProcessingId(null);
    }
  };

  const approveSubmission = async (submission: ContractorSubmission) => {
    if (!user) return;
    
    setProcessingId(submission.id);
    
    try {
      // First, add the stats to campaign_stats_history
      const { error: statsError } = await supabase
        .from('campaign_stats_history')
        .insert({
          campaign_id: submission.campaign_id,
          date: submission.submission_date,
          ad_spend: submission.ad_spend,
          youtube_spend: submission.youtube_spend || 0,
          meta_spend: submission.meta_spend || 0,
          newsbreak_spend: submission.newsbreak_spend || 0,
          leads: submission.leads,
          cases: submission.cases,
          revenue: submission.revenue
        });

      if (statsError) throw statsError;

      // Then update the submission status
      const { error: updateError } = await supabase
        .from('contractor_submissions')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      toast.success('Submission approved and added to campaign stats');
      fetchSubmissions();
    } catch (error) {
      console.error('Error approving submission:', error);
      toast.error('Failed to approve submission');
    } finally {
      setProcessingId(null);
    }
  };

  const rejectSubmission = async (submissionId: string) => {
    if (!user) return;
    
    setProcessingId(submissionId);
    
    try {
      const { error } = await supabase
        .from('contractor_submissions')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Submission rejected');
      fetchSubmissions();
    } catch (error) {
      console.error('Error rejecting submission:', error);
      toast.error('Failed to reject submission');
    } finally {
      setProcessingId(null);
    }
  };

  const deleteSubmission = async (submissionId: string) => {
    setProcessingId(submissionId);
    
    try {
      const { error } = await supabase
        .from('contractor_submissions')
        .delete()
        .eq('id', submissionId);

      if (error) throw error;

      toast.success('Submission deleted');
      fetchSubmissions();
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Failed to delete submission');
    } finally {
      setProcessingId(null);
    }
  };

  const handleEditSubmission = (submission: ContractorSubmission) => {
    setEditingSubmission(submission);
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Contractor Submissions</CardTitle>
          <CardDescription>
            Review and manage stats submissions from contractors
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contractor submissions found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Ad Spend</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Cost Per Lead</TableHead>
                  <TableHead>Cases</TableHead>
                  <TableHead>CVR</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{submission.contractor_name}</div>
                        <div className="text-sm text-muted-foreground">{submission.contractor_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{submission.campaigns?.name}</TableCell>
                    <TableCell>{format(new Date(submission.submission_date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{formatCurrency(submission.ad_spend)}</TableCell>
                    <TableCell>{submission.leads}</TableCell>
                    <TableCell>
                      {submission.leads > 0 
                        ? formatCurrency(submission.ad_spend / submission.leads)
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>{submission.cases}</TableCell>
                    <TableCell>
                      {submission.leads > 0 
                        ? `${((submission.cases / submission.leads) * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>{formatCurrency(submission.revenue)}</TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>{format(new Date(submission.created_at), 'MMM d, HH:mm')}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {submission.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSubmission(submission)}
                              disabled={processingId === submission.id}
                              title="Edit submission"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveSubmission(submission)}
                              disabled={processingId === submission.id}
                              title="Approve submission"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectSubmission(submission.id)}
                              disabled={processingId === submission.id}
                              title="Reject submission"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={processingId === submission.id}
                              title="Delete submission"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Submission</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this submission? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSubmission(submission.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditSubmissionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        submission={editingSubmission}
        onSave={updateSubmission}
        isLoading={processingId !== null}
      />
    </div>
  );
}
