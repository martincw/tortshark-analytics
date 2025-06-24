
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { Calendar, Save, Filter, CheckCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ContractorSubmission {
  id: string;
  contractor_email: string;
  contractor_name: string;
  campaign_id: string;
  submission_date: string;
  ad_spend: number;
  leads: number;
  cases: number;
  revenue: number;
  status: string;
  campaigns: {
    name: string;
  };
}

interface UpdateData {
  [key: string]: {
    cases: number;
    revenue: number;
    changed: boolean;
  };
}

export default function CasesRevenueEntryPage() {
  const [submissions, setSubmissions] = useState<ContractorSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<ContractorSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateData>({});
  const [dateFilter, setDateFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("needs-data");
  const { user } = useAuth();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [submissions, dateFilter, statusFilter]);

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
        .eq('status', 'approved')
        .order('submission_date', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...submissions];

    // Date filter
    if (dateFilter !== "all") {
      const daysAgo = parseInt(dateFilter);
      const cutoffDate = subDays(new Date(), daysAgo);
      filtered = filtered.filter(sub => 
        new Date(sub.submission_date) >= cutoffDate
      );
    }

    // Status filter
    if (statusFilter === "needs-data") {
      filtered = filtered.filter(sub => sub.cases === 0 && sub.revenue === 0);
    } else if (statusFilter === "completed") {
      filtered = filtered.filter(sub => sub.cases > 0 || sub.revenue > 0);
    }

    setFilteredSubmissions(filtered);
  };

  const handleCasesChange = (submissionId: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value);
    setUpdateData(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        cases: numValue,
        changed: true
      }
    }));
  };

  const handleRevenueChange = (submissionId: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    setUpdateData(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        revenue: numValue,
        changed: true
      }
    }));
  };

  const saveChanges = async () => {
    if (!user) return;
    
    const changedSubmissions = Object.entries(updateData).filter(([_, data]) => data.changed);
    
    if (changedSubmissions.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setIsSaving(true);
    
    try {
      for (const [submissionId, data] of changedSubmissions) {
        const submission = submissions.find(s => s.id === submissionId);
        if (!submission) continue;

        // Update contractor_submissions table
        const { error: submissionError } = await supabase
          .from('contractor_submissions')
          .update({
            cases: data.cases,
            revenue: data.revenue,
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId);

        if (submissionError) throw submissionError;

        // Update campaign_stats_history table
        const { error: statsError } = await supabase
          .from('campaign_stats_history')
          .update({
            cases: data.cases,
            revenue: data.revenue
          })
          .eq('campaign_id', submission.campaign_id)
          .eq('date', submission.submission_date);

        if (statsError) throw statsError;
      }

      toast.success(`Updated ${changedSubmissions.length} submission${changedSubmissions.length > 1 ? 's' : ''}`);
      setUpdateData({});
      fetchSubmissions();
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (submission: ContractorSubmission) => {
    const hasData = submission.cases > 0 || submission.revenue > 0;
    const hasChanges = updateData[submission.id]?.changed;
    
    if (hasChanges) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        Pending Save
      </Badge>;
    }
    
    if (hasData) {
      return <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Completed
      </Badge>;
    }
    
    return <Badge variant="outline">Needs Data</Badge>;
  };

  const needsDataCount = filteredSubmissions.filter(sub => sub.cases === 0 && sub.revenue === 0).length;
  const completedCount = filteredSubmissions.filter(sub => sub.cases > 0 || sub.revenue > 0).length;
  const changedCount = Object.values(updateData).filter(data => data.changed).length;

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
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Cases & Revenue Entry
          </CardTitle>
          <CardDescription>
            Add cases and revenue data to approved contractor submissions
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{filteredSubmissions.length}</div>
              <div className="text-sm text-muted-foreground">Total Submissions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{needsDataCount}</div>
              <div className="text-sm text-muted-foreground">Need Data</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{completedCount}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{changedCount}</div>
              <div className="text-sm text-muted-foreground">Pending Save</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Submissions</SelectItem>
                <SelectItem value="needs-data">Needs Data</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              onClick={saveChanges} 
              disabled={isSaving || changedCount === 0}
              className="ml-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : `Save Changes (${changedCount})`}
            </Button>
          </div>

          {/* Data Table */}
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No submissions found matching your filters
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Contractor</TableHead>
                  <TableHead>Ad Spend</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Cases</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => {
                  const currentCases = updateData[submission.id]?.cases ?? submission.cases;
                  const currentRevenue = updateData[submission.id]?.revenue ?? submission.revenue;
                  
                  return (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.campaigns?.name}</TableCell>
                      <TableCell>{format(new Date(submission.submission_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{submission.contractor_name}</div>
                          <div className="text-sm text-muted-foreground">{submission.contractor_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(submission.ad_spend)}</TableCell>
                      <TableCell>{submission.leads}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={currentCases || ''}
                          onChange={(e) => handleCasesChange(submission.id, e.target.value)}
                          className="w-20"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={currentRevenue || ''}
                          onChange={(e) => handleRevenueChange(submission.id, e.target.value)}
                          className="w-24"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>{getStatusBadge(submission)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
