
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, Filter, RefreshCcw, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCampaign } from '@/contexts/CampaignContext';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function LeadsPage() {
  const { campaigns } = useCampaign();
  const { toast: uiToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get filters from URL params or set defaults
  const [filters, setFilters] = useState({
    campaignId: searchParams.get('campaignId') || '',
    status: searchParams.get('status') || '',
    startDate: searchParams.get('startDate') || format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'),
    endDate: searchParams.get('endDate') || format(new Date(), 'yyyy-MM-dd'),
    searchTerm: searchParams.get('search') || '',
  });
  
  // Pagination
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize] = useState(20);
  const [totalLeads, setTotalLeads] = useState(0);
  
  // Data
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  
  // Calendar states
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  
  // Filter and popover states
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (filters.campaignId) params.set('campaignId', filters.campaignId);
    if (filters.status) params.set('status', filters.status);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.searchTerm) params.set('search', filters.searchTerm);
    if (page > 1) params.set('page', page.toString());
    
    setSearchParams(params);
  }, [filters, page, setSearchParams]);
  
  // Load leads based on current filters
  const loadLeads = async () => {
    try {
      setLoading(true);
      setRefreshError(null);
      
      const result = await leadProsperApi.getLeadsList({
        page,
        pageSize,
        startDate: filters.startDate,
        endDate: filters.endDate,
        ts_campaign_id: filters.campaignId || undefined,
        status: filters.status || undefined,
        searchTerm: filters.searchTerm || undefined,
      });
      
      setLeads(result.leads);
      setTotalLeads(result.total);
      
    } catch (error) {
      console.error('Error loading leads:', error);
      uiToast({
        title: 'Error loading leads',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Initial load and reload when filters change
  useEffect(() => {
    loadLeads();
  }, [filters.campaignId, filters.status, filters.startDate, filters.endDate, page]);
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset page when searching
    setPage(1);
    loadLeads();
  };
  
  // Refresh today's leads
  const refreshTodaysLeads = async () => {
    try {
      setRefreshing(true);
      setRefreshError(null);
      
      // Get the Lead Prosper API Key
      const apiKeyResponse = await leadProsperApi.getApiCredentials();
      
      if (!apiKeyResponse?.apiKey) {
        throw new Error('No Lead Prosper API key found. Please connect your account first.');
      }
      
      // Call the edge function to fetch today's leads
      const result = await leadProsperApi.fetchTodayLeads();
      
      if (result.success) {
        toast.success(`Lead refresh succeeded`, {
          description: `Retrieved ${result.total_leads} leads from ${result.campaigns_processed} campaigns`,
          duration: 5000,
        });
        
        // Reload the leads list to show the new data
        await loadLeads();
      } else {
        setRefreshError(result.error || 'Failed to refresh leads');
        toast.error('Lead refresh failed', {
          description: result.error || 'Unknown error occurred',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error refreshing leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRefreshError(errorMessage);
      
      toast.error('Error refreshing leads', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setRefreshing(false);
    }
  };
  
  // Helper to format lead date
  const formatLeadDate = (timestamp: number) => {
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower === 'accepted') {
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>;
    } else if (statusLower === 'duplicate') {
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{status}</Badge>;
    } else if (statusLower === 'rejected' || statusLower === 'failed') {
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{status}</Badge>;
    }
    
    return <Badge variant="outline">{status || 'Unknown'}</Badge>;
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      campaignId: '',
      status: '',
      startDate: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      searchTerm: '',
    });
    setPage(1);
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(totalLeads / pageSize);
  const showPagination = totalPages > 1;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lead Prosper Leads</h1>
          <p className="text-muted-foreground">
            View and manage leads from Lead Prosper campaigns
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshTodaysLeads}
            disabled={refreshing}
          >
            <RefreshCcw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh Today's Leads"}
          </Button>
        </div>
      </div>
      
      {refreshError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {refreshError}
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Leads</CardTitle>
          <CardDescription>
            Leads imported from Lead Prosper campaigns
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="flex flex-1 gap-2">
              <form onSubmit={handleSearch} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search leads..."
                    className="pl-8"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  />
                </div>
                <Button type="submit">Search</Button>
              </form>
              
              <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" align="end">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Campaign</h4>
                      <Select 
                        value={filters.campaignId} 
                        onValueChange={(value) => {
                          setFilters({...filters, campaignId: value});
                          setPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Campaigns" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Campaigns</SelectItem>
                          {campaigns?.map((campaign) => (
                            <SelectItem key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Status</h4>
                      <Select 
                        value={filters.status} 
                        onValueChange={(value) => {
                          setFilters({...filters, status: value});
                          setPage(1);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Statuses</SelectItem>
                          <SelectItem value="ACCEPTED">Accepted</SelectItem>
                          <SelectItem value="DUPLICATE">Duplicate</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                          <SelectItem value="FAILED">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Date Range</h4>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.startDate ? format(new Date(filters.startDate), 'PP') : 'Start date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={filters.startDate ? new Date(filters.startDate) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    setFilters({...filters, startDate: format(date, 'yyyy-MM-dd')});
                                    setPage(1);
                                  }
                                  setStartDateOpen(false);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex-1">
                          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.endDate ? format(new Date(filters.endDate), 'PP') : 'End date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={filters.endDate ? new Date(filters.endDate) : undefined}
                                onSelect={(date) => {
                                  if (date) {
                                    setFilters({...filters, endDate: format(date, 'yyyy-MM-dd')});
                                    setPage(1);
                                  }
                                  setEndDateOpen(false);
                                }}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>
                    
                    <Button variant="outline" className="w-full" onClick={clearFilters}>
                      Clear Filters
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Leads Table */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : leads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      No leads found. Try adjusting your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>{formatLeadDate(lead.lead_date_ms)}</TableCell>
                      <TableCell>
                        {lead.campaign?.name || 'Unknown Campaign'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(lead.status)}
                      </TableCell>
                      <TableCell>${lead.cost?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>${lead.revenue?.toFixed(2) || '0.00'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {showPagination && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((page - 1) * pageSize + 1, totalLeads)} to {Math.min(page * pageSize, totalLeads)} of {totalLeads} leads
              </div>
              
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        
        {refreshError && (
          <CardFooter className="pb-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4 mr-2" />
              <AlertDescription className="text-sm">
                {refreshError}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshTodaysLeads} 
                  className="ml-2"
                  disabled={refreshing}
                >
                  Try Again
                </Button>
              </AlertDescription>
            </Alert>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
