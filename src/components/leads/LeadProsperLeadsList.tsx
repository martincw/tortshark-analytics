
import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DatePicker } from '@/components/ui/date-picker';
import { Loader2, Search, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCampaign } from '@/contexts/CampaignContext';
import { leadProsperApi } from '@/integrations/leadprosper/client';

interface LeadProsperLeadsListProps {
  campaignId?: string;
}

export default function LeadProsperLeadsList({ campaignId }: LeadProsperLeadsListProps) {
  const { campaigns } = useCampaign();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [selectedCampaignId, setSelectedCampaignId] = useState(campaignId || 'all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Load leads on initial render and when filters change
  useEffect(() => {
    if (selectedCampaignId !== 'all') {
      loadLeads();
    } else {
      setIsLoading(false);
    }
  }, [selectedCampaignId, page, pageSize, selectedStatus, searchTerm, startDate, endDate]);

  // If campaignId prop changes, update the selected campaign
  useEffect(() => {
    if (campaignId && campaignId !== selectedCampaignId) {
      setSelectedCampaignId(campaignId);
    }
  }, [campaignId]);

  const loadLeads = async () => {
    if (!selectedCampaignId || selectedCampaignId === 'all') return;

    setIsLoading(true);
    setError(null);

    try {
      // Call the API with all our filters
      const result = await leadProsperApi.getLeadsList({
        page,
        pageSize,
        ts_campaign_id: selectedCampaignId,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        searchTerm: searchTerm || undefined,
        startDate: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        endDate: endDate ? format(endDate, 'yyyy-MM-dd') : undefined,
      });

      setLeads(result.leads);
      setTotalLeads(result.total);
    } catch (err) {
      console.error('Error loading leads:', err);
      setError('Failed to load leads. Please try again.');
      toast.error('Failed to load leads');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshLeads = async () => {
    if (!selectedCampaignId || selectedCampaignId === 'all') return;

    setIsRefreshing(true);
    setError(null);

    try {
      // Get today's leads from Lead Prosper
      const syncResult = await leadProsperApi.fetchTodayLeads();
      
      if (syncResult.success) {
        toast.success('Successfully refreshed leads data', {
          description: `Retrieved ${syncResult.total_leads} leads from ${syncResult.campaigns_processed} campaigns`,
        });
      } else {
        toast.warning('Lead refresh completed with issues', {
          description: syncResult.error || 'Unknown issue occurred during synchronization',
        });
      }

      // Reload leads list to show new data
      await loadLeads();
    } catch (error) {
      console.error('Error refreshing leads:', error);
      setError('Failed to refresh leads data. Please try again.');
      toast.error('Lead refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearch = () => {
    setPage(1); // Reset to first page when search changes
    loadLeads();
  };

  const renderPageLinks = () => {
    const totalPages = Math.ceil(totalLeads / pageSize);
    const maxDisplayPages = 5;
    let startPage = Math.max(1, page - Math.floor(maxDisplayPages / 2));
    const endPage = Math.min(totalPages, startPage + maxDisplayPages - 1);
    
    startPage = Math.max(1, endPage - maxDisplayPages + 1);

    const pages = [];
    
    // Previous button
    pages.push(
      <PaginationItem key="prev">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={page === 1 || isLoading}
          className="h-8 w-8"
          aria-label="Previous page"
        >
          <PaginationPrevious className="h-4 w-4" />
        </Button>
      </PaginationItem>
    );
    
    // Page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <PaginationItem key={i}>
          <Button
            variant={page === i ? "outline" : "ghost"}
            size="icon"
            onClick={() => handlePageChange(i)}
            disabled={isLoading}
            className="h-8 w-8"
            aria-label={`Page ${i}`}
          >
            {i}
          </Button>
        </PaginationItem>
      );
    }
    
    // Next button
    pages.push(
      <PaginationItem key="next">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages || totalPages === 0 || isLoading}
          className="h-8 w-8"
          aria-label="Next page"
        >
          <PaginationNext className="h-4 w-4" />
        </Button>
      </PaginationItem>
    );
    
    return pages;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'sold':
        return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'duplicate':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-100';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800 hover:bg-red-100';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Lead Prosper Leads</span>
          <Button 
            size="sm" 
            variant="outline"
            onClick={refreshLeads}
            disabled={isRefreshing || !selectedCampaignId || selectedCampaignId === 'all'}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh Leads
          </Button>
        </CardTitle>
        <CardDescription>
          View and analyze leads imported from Lead Prosper
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/3">
              <label className="text-sm font-medium mb-1 block">Campaign</label>
              <Select
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
                disabled={!!campaignId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns?.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>{campaign.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/3">
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select
                value={selectedStatus}
                onValueChange={setSelectedStatus}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-1/3">
              <label className="text-sm font-medium mb-1 block">Search</label>
              <div className="flex">
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-r-none"
                />
                <Button
                  type="button"
                  onClick={handleSearch}
                  className="rounded-l-none"
                  variant="secondary"
                  disabled={isLoading}
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <label className="text-sm font-medium mb-1 block">From Date</label>
              <DatePicker
                date={startDate}
                setDate={setStartDate}
                className="w-full"
              />
            </div>
            <div className="w-full md:w-1/2">
              <label className="text-sm font-medium mb-1 block">To Date</label>
              <DatePicker
                date={endDate}
                setDate={setEndDate}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !selectedCampaignId || selectedCampaignId === 'all' ? (
          <div className="text-center py-12 text-muted-foreground">
            Please select a campaign to view leads
          </div>
        ) : leads.length > 0 ? (
          <>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-mono text-xs">{lead.id}</TableCell>
                      <TableCell>
                        {lead.lead_date_ms 
                          ? new Date(lead.lead_date_ms).toLocaleDateString() 
                          : 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={getStatusBadgeColor(lead.status)}
                        >
                          {lead.status || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell>${lead.cost?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>${lead.revenue?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        {lead.json_payload && (
                          <details className="cursor-pointer">
                            <summary className="text-xs text-blue-600 hover:text-blue-800">Show details</summary>
                            <pre className="text-xs mt-2 p-2 bg-gray-50 rounded overflow-x-auto max-w-xs">
                              {JSON.stringify(lead.json_payload, null, 2)}
                            </pre>
                          </details>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, totalLeads)} to {Math.min(page * pageSize, totalLeads)} of {totalLeads} leads
              </div>
              
              <Pagination>
                <PaginationContent>
                  {renderPageLinks()}
                </PaginationContent>
              </Pagination>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No leads found for the selected criteria
          </div>
        )}
      </CardContent>
    </Card>
  );
}
