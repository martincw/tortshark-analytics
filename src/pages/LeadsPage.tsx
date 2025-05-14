
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Search, Filter, RefreshCcw, AlertCircle, BarChart3, List } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCampaign } from '@/contexts/CampaignContext';
import { hyrosApi } from '@/integrations/hyros/client';
import { HyrosSyncResult } from '@/integrations/hyros/types';
import HyrosLeadsList from '@/components/leads/HyrosLeadsList';
import { localDateToUTCNoon, formatDateForStorage, parseStoredDate } from '@/lib/utils/ManualDateUtils';
import { debounce } from '@/lib/utils';

export default function LeadsPage() {
  const { campaigns } = useCampaign();
  const { toast: uiToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // View mode (aggregate or individual leads)
  const [viewMode, setViewMode] = useState<'aggregate' | 'individual'>(searchParams.get('viewMode') as any || 'individual');
  
  // Get today's date for default
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Get filters from URL params or set defaults
  const [filters, setFilters] = useState({
    campaignId: searchParams.get('campaignId') || '',
    status: searchParams.get('status') || '',
    startDate: searchParams.get('startDate') || today,
    endDate: searchParams.get('endDate') || today,
    searchTerm: searchParams.get('search') || '',
  });
  
  // Selected dates for the date picker
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(
    filters.startDate ? parseStoredDate(filters.startDate) : new Date()
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(
    filters.endDate ? parseStoredDate(filters.endDate) : new Date()
  );
  
  // Pagination
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [pageSize] = useState(20);
  const [totalLeads, setTotalLeads] = useState(0);
  
  // Data
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);
  
  // Filter popover state
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Last synced timestamp and date fetched
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [dateFetched, setDateFetched] = useState<string | null>(null);
  
  // Create a debounced version of the URL params update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateUrlParams = useCallback(
    debounce((newFilters, newPage, newViewMode) => {
      const params = new URLSearchParams();
      
      params.set('viewMode', newViewMode);
      if (newFilters.campaignId) params.set('campaignId', newFilters.campaignId);
      if (newFilters.status) params.set('status', newFilters.status);
      if (newFilters.startDate) params.set('startDate', newFilters.startDate);
      if (newFilters.endDate) params.set('endDate', newFilters.endDate);
      if (newFilters.searchTerm) params.set('search', newFilters.searchTerm);
      if (newPage > 1) params.set('page', newPage.toString());
      
      setSearchParams(params);
    }, 400),
    []
  );
  
  // Update URL when filters change
  useEffect(() => {
    debouncedUpdateUrlParams(filters, page, viewMode);
  }, [filters, page, viewMode, debouncedUpdateUrlParams]);
  
  // Handle date changes
  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    // Format date for storage and update filters
    const formattedDate = formatDateForStorage(date);
    
    // Only update if the formatted date is different
    if (formattedDate !== filters.startDate) {
      setFilters(prev => ({ ...prev, startDate: formattedDate }));
      setSelectedStartDate(date);
    }
  };
  
  const handleEndDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    // Format date for storage and update filters
    const formattedDate = formatDateForStorage(date);
    
    // Only update if the formatted date is different
    if (formattedDate !== filters.endDate) {
      setFilters(prev => ({ ...prev, endDate: formattedDate }));
      setSelectedEndDate(date);
    }
  };
  
  // Load leads based on current filters
  const loadLeads = async () => {
    if (viewMode === 'aggregate') {
      try {
        setLoading(true);
        setRefreshError(null);
        
        const result = await hyrosApi.getLeadsList({
          page,
          pageSize,
          startDate: filters.startDate,
          endDate: filters.endDate,
          tsCampaignId: filters.campaignId || undefined,
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
    }
  };
  
  // Initial load and reload when filters change
  useEffect(() => {
    if (viewMode === 'aggregate') {
      loadLeads();
    }
  }, [filters.campaignId, filters.status, filters.startDate, filters.endDate, page, viewMode]);
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset page when searching
    setPage(1);
    loadLeads();
  };
  
  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch {
      return '';
    }
  };
  
  // Refresh yesterday's leads with improved error handling
  const refreshYesterdaysLeads = async () => {
    try {
      setRefreshing(true);
      setRefreshError(null);
      setDebugInfo([]);
      
      // Get the HYROS API Key
      const apiKeyResponse = await hyrosApi.getApiCredentials();
      
      if (!apiKeyResponse?.api_key) {
        throw new Error('No HYROS API key found. Please connect your account first.');
      }
      
      // Call the edge function to fetch yesterday's leads
      const result = await hyrosApi.fetchYesterdayStats();
      
      // Store debug info for troubleshooting
      if (result.debug_info) {
        setDebugInfo(result.debug_info);
      }
      
      // Store date fetched
      if (result.date_fetched) {
        setDateFetched(result.date_fetched);
      }
      
      if (result.success) {
        // Store the last synced timestamp
        if (result.last_synced) {
          setLastSynced(result.last_synced);
        }
        
        if (result.total_leads && result.total_leads > 0) {
          toast.success(`Lead refresh succeeded`, {
            description: `Retrieved ${result.total_leads} leads from ${result.campaigns_processed} campaign${result.campaigns_processed !== 1 ? 's' : ''}`,
            duration: 5000,
          });
        } else {
          toast.info(`No new leads found`, {
            description: `Checked ${result.campaigns_processed} campaign${result.campaigns_processed !== 1 ? 's' : ''} but found no new leads for yesterday`,
            duration: 4000,
          });
        }
        
        // Reload the leads list to show the new data
        await loadLeads();
      } else {
        // Special handling for rate limit errors
        const isRateLimitError = result.error?.includes('rate limit') || result.error?.includes('429');
        
        const errorMessage = result.error || 'Failed to refresh leads';
        setRefreshError(errorMessage);
        
        if (isRateLimitError) {
          toast.error('API Rate Limit Exceeded', {
            description: 'The HYROS API is rate limited. Please wait a few minutes and try again.',
            duration: 8000,
          });
        } else {
          toast.error('Lead refresh failed', {
            description: errorMessage,
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Error refreshing leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRefreshError(errorMessage);
      
      // Special handling for rate limit errors
      if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
        toast.error('API Rate Limit Exceeded', {
          description: 'Please wait a few minutes before trying again.',
          duration: 8000,
        });
      } else {
        toast.error('Error refreshing leads', {
          description: errorMessage,
          duration: 5000,
        });
      }
    } finally {
      setRefreshing(false);
    }
  };
  
  // Helper to format lead date
  const formatLeadDate = (date: string) => {
    try {
      return format(new Date(date), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    const today = new Date();
    const formattedToday = formatDateForStorage(today);
    
    setFilters({
      campaignId: '',
      status: '',
      startDate: formattedToday,
      endDate: formattedToday,
      searchTerm: '',
    });
    
    setSelectedStartDate(today);
    setSelectedEndDate(today);
    setPage(1);
  };
  
  // Calculate pagination
  const totalPages = Math.ceil(totalLeads / pageSize);
  const showPagination = totalPages > 1;
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">HYROS Leads</h1>
          <p className="text-muted-foreground">
            View and manage leads from HYROS campaigns
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshYesterdaysLeads}
            disabled={refreshing}
          >
            <RefreshCcw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh Yesterday's Leads"}
          </Button>
        </div>
      </div>
      
      {/* Date Selector at the top */}
      <div className="flex flex-col sm:flex-row gap-3 items-center p-4 border rounded-md bg-background">
        <div className="font-medium">Date Range:</div>
        <div className="flex gap-2 items-center">
          <DatePicker
            date={selectedStartDate}
            setDate={handleStartDateChange}
            className="w-[180px]"
          />
          <span className="text-muted-foreground">to</span>
          <DatePicker
            date={selectedEndDate}
            setDate={handleEndDateChange}
            className="w-[180px]"
          />
        </div>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => {
            const today = new Date();
            const formattedToday = formatDateForStorage(today);
            
            setSelectedStartDate(today);
            setSelectedEndDate(today);
            setFilters(prev => ({
              ...prev, 
              startDate: formattedToday,
              endDate: formattedToday
            }));
          }}
        >
          Today
        </Button>
        <Button 
          variant="outline"
          size="sm" 
          onClick={clearFilters}
        >
          Clear All Filters
        </Button>
      </div>
      
      {lastSynced && (
        <div className="text-sm text-muted-foreground">
          Last synchronized: {formatDate(lastSynced)}
          {dateFetched && <span> • Data for: {format(new Date(dateFetched), 'MMM d, yyyy')}</span>}
        </div>
      )}
      
      {refreshError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span>{refreshError}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshYesterdaysLeads} 
              className="ml-2"
              disabled={refreshing}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Debug information panel - only show if there's debug info */}
      {debugInfo && debugInfo.length > 0 && (
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Lead Retrieval Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 py-0">
            <div className="text-xs">
              {debugInfo.map((info, index) => (
                <div key={index} className="mb-1 p-2 bg-slate-100 rounded">
                  <div>Campaign ID: {info.campaign_id}</div>
                  <div>Endpoint used: {info.endpoint_used}</div>
                  <div>Leads retrieved: {info.leads_count}</div>
                  {info.stats_count > 0 && <div>Stats entries: {info.stats_count}</div>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex justify-between items-center">
            <span>Leads</span>
            <div className="flex items-center space-x-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'aggregate' | 'individual')} className="w-auto">
                <TabsList>
                  <TabsTrigger value="individual" className="flex items-center">
                    <List className="w-4 h-4 mr-1" /> Individual
                  </TabsTrigger>
                  <TabsTrigger value="aggregate" className="flex items-center">
                    <BarChart3 className="w-4 h-4 mr-1" /> Aggregate
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardTitle>
          <CardDescription>
            {viewMode === 'aggregate' 
              ? 'Aggregated leads imported from HYROS campaigns' 
              : 'Individual leads from HYROS API'}
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
                    placeholder={viewMode === 'aggregate' ? "Search leads..." : "Search by email..."}
                    className="pl-8"
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({...filters, searchTerm: e.target.value})}
                  />
                </div>
                <Button type="submit">Search</Button>
              </form>
              
              <Button
                variant="outline"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Campaigns
              </Button>
            </div>
          </div>
          
          {/* Campaign Filter */}
          {filtersOpen && (
            <div className="p-3 border rounded-md mb-3">
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
            </div>
          )}
          
          {/* Content based on view mode */}
          {viewMode === 'aggregate' ? (
            /* Aggregated Leads Table */
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Leads</TableHead>
                    <TableHead>Sales</TableHead>
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
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : leads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                        No leads found. Try adjusting your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leads.map((lead) => {
                      // Find campaign name
                      const campaign = campaigns?.find(c => c.id === lead.tsCampaignId);
                      
                      return (
                        <TableRow key={lead.id}>
                          <TableCell>{formatLeadDate(lead.date)}</TableCell>
                          <TableCell>
                            {campaign?.name || 'Unknown Campaign'}
                          </TableCell>
                          <TableCell>{lead.leads || 0}</TableCell>
                          <TableCell>{lead.sales || 0}</TableCell>
                          <TableCell>${lead.adSpend?.toFixed(2) || '0.00'}</TableCell>
                          <TableCell>${lead.revenue?.toFixed(2) || '0.00'}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          ) : (
            /* Individual Leads List */
            <HyrosLeadsList 
              startDate={filters.startDate}
              endDate={filters.endDate}
              campaignId={filters.campaignId}
              searchTerm={filters.searchTerm}
              pageSize={pageSize}
            />
          )}
          
          {/* Pagination for aggregate view */}
          {viewMode === 'aggregate' && showPagination && (
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
              <AlertDescription className="text-sm flex flex-wrap items-center gap-2">
                {refreshError}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={refreshYesterdaysLeads} 
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
