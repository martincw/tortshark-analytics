
import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Filter, RefreshCcw, AlertCircle, BarChart3, List, Link2, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useCampaign } from '@/contexts/CampaignContext';
import { leadProsperApi } from '@/integrations/leadprosper/client';
import LeadProsperLeadsList from '@/components/leads/LeadProsperLeadsList';
import { formatDateForStorage, parseStoredDate } from '@/lib/utils/ManualDateUtils';
import { debounce } from '@/lib/utils';
import { supabase } from "@/integrations/supabase/client";

interface CampaignMapping {
  id: string;
  lp_campaign_id: string;
  ts_campaign_id: string;
  active: boolean;
  linked_at: string;
  lp_campaign?: {
    name: string;
    lp_campaign_id: number;
  };
}

export default function LeadsPage() {
  const { campaigns } = useCampaign();
  const { toast: uiToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Get today's date for default
  const today = format(new Date(), 'yyyy-MM-dd');
  
  // Get filters from URL params or set defaults
  const [filters, setFilters] = useState({
    campaignId: searchParams.get('campaignId') || 'all',
    startDate: searchParams.get('startDate') || today,
    endDate: searchParams.get('endDate') || today,
    searchTerm: searchParams.get('search') || '',
    status: searchParams.get('status') || 'all',
  });
  
  // Selected dates for the date picker
  const [selectedStartDate, setSelectedStartDate] = useState<Date | undefined>(
    filters.startDate ? parseStoredDate(filters.startDate) : new Date()
  );
  const [selectedEndDate, setSelectedEndDate] = useState<Date | undefined>(
    filters.endDate ? parseStoredDate(filters.endDate) : new Date()
  );
  
  // Lead Prosper specific state
  const [mappings, setMappings] = useState<Record<string, CampaignMapping>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  
  // Create a debounced version of the URL params update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdateUrlParams = useCallback(
    debounce((newFilters) => {
      const params = new URLSearchParams();
      
      if (newFilters.campaignId && newFilters.campaignId !== 'all') params.set('campaignId', newFilters.campaignId);
      if (newFilters.status && newFilters.status !== 'all') params.set('status', newFilters.status);
      if (newFilters.startDate) params.set('startDate', newFilters.startDate);
      if (newFilters.endDate) params.set('endDate', newFilters.endDate);
      if (newFilters.searchTerm) params.set('search', newFilters.searchTerm);
      
      setSearchParams(params);
    }, 400),
    []
  );
  
  // Update URL when filters change
  useEffect(() => {
    debouncedUpdateUrlParams(filters);
  }, [filters, debouncedUpdateUrlParams]);

  // Load campaign mappings on component mount
  useEffect(() => {
    loadMappings();
  }, []);
  
  // Handle date changes
  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    const formattedDate = formatDateForStorage(date);
    
    if (formattedDate !== filters.startDate) {
      setFilters(prev => ({ ...prev, startDate: formattedDate }));
      setSelectedStartDate(date);
    }
  };
  
  const handleEndDateChange = (date: Date | undefined) => {
    if (!date) return;
    
    const formattedDate = formatDateForStorage(date);
    
    if (formattedDate !== filters.endDate) {
      setFilters(prev => ({ ...prev, endDate: formattedDate }));
      setSelectedEndDate(date);
    }
  };

  const loadMappings = async () => {
    try {
      if (!campaigns || campaigns.length === 0) return;

      const mappingPromises = campaigns.map(async (campaign) => {
        const { data, error } = await supabase
          .from('lp_to_ts_map')
          .select(`
            id,
            lp_campaign_id,
            ts_campaign_id,
            active,
            linked_at,
            lp_campaign:external_lp_campaigns!inner(
              name,
              lp_campaign_id
            )
          `)
          .eq('ts_campaign_id', campaign.id)
          .eq('active', true)
          .single();

        return { campaignId: campaign.id, mapping: data };
      });

      const results = await Promise.all(mappingPromises);
      const mappingMap: Record<string, CampaignMapping> = {};
      
      results.forEach(({ campaignId, mapping }) => {
        if (mapping) {
          mappingMap[campaignId] = mapping;
        }
      });

      setMappings(mappingMap);
    } catch (err) {
      console.error("Error loading mappings:", err);
    }
  };
  
  // Refresh Lead Prosper leads with custom date range
  const refreshLeadProsperLeads = async () => {
    try {
      setRefreshing(true);
      setRefreshError(null);
      setDebugInfo([]);
      
      // Check connection first
      const connectionData = await leadProsperApi.checkConnection();
      
      if (!connectionData.isConnected) {
        throw new Error('No active Lead Prosper connection found. Please connect your account first.');
      }
      
      // Sync leads from Lead Prosper with the selected date range
      const result = await leadProsperApi.fetchLeadsWithDateRange(
        filters.startDate,
        filters.endDate
      );
      
      console.log('Lead fetch result:', result);
      
      if (result.debug_info) {
        setDebugInfo(result.debug_info);
      }
      
      if (result.success) {
        setLastSynced(new Date().toISOString());
        
        if (result.total_leads && result.total_leads > 0) {
          toast.success(`Lead refresh succeeded`, {
            description: `Retrieved ${result.total_leads} leads from ${result.campaigns_processed} campaign${result.campaigns_processed !== 1 ? 's' : ''} for ${filters.startDate} to ${filters.endDate}`,
            duration: 5000,
          });
        } else {
          toast.info(`No leads found for date range`, {
            description: `Checked ${result.campaigns_processed} campaign${result.campaigns_processed !== 1 ? 's' : ''} but found no leads for ${filters.startDate} to ${filters.endDate}`,
            duration: 4000,
          });
          
          // Show debug info if no leads found
          if (result.debug_info && result.debug_info.length > 0) {
            setShowDebug(true);
          }
        }
      } else {
        const errorMessage = result.error || 'Failed to refresh leads';
        setRefreshError(errorMessage);
        toast.error('Lead refresh failed', {
          description: errorMessage,
          duration: 5000,
        });
        
        // Show debug info on error
        if (result.debug_info && result.debug_info.length > 0) {
          setShowDebug(true);
        }
      }
    } catch (error) {
      console.error('Error refreshing leads:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setRefreshError(errorMessage);
      
      if (errorMessage.includes('connection')) {
        toast.error('Connection Error', {
          description: 'Please check your Lead Prosper connection in Data Sources.',
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
  
  // Handle search
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The LeadProsperLeadsList component will handle the search automatically
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
  
  // Clear all filters
  const clearFilters = () => {
    const today = new Date();
    const formattedToday = formatDateForStorage(today);
    
    setFilters({
      campaignId: 'all',
      status: 'all',
      startDate: formattedToday,
      endDate: formattedToday,
      searchTerm: '',
    });
    
    setSelectedStartDate(today);
    setSelectedEndDate(today);
  };

  // Get mapped campaigns only
  const mappedCampaigns = campaigns?.filter(campaign => mappings[campaign.id]) || [];
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Lead Prosper Leads</h1>
          <p className="text-muted-foreground">
            View and manage leads imported from Lead Prosper campaigns
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshLeadProsperLeads}
            disabled={refreshing}
          >
            <RefreshCcw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh Leads"}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => window.location.href = '/data-sources?source=leadprosper'}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Manage Connection
          </Button>
        </div>
      </div>
      
      {/* Campaign Mapping Status */}
      {campaigns && campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Mapping Status</CardTitle>
            <CardDescription>
              Lead Prosper campaigns must be mapped to TortShark campaigns to import lead data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((campaign) => {
                const isMapped = !!mappings[campaign.id];
                const mapping = mappings[campaign.id];
                
                return (
                  <div key={campaign.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{campaign.name}</h4>
                      {isMapped ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Mapped
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-orange-200 text-orange-800">
                          Not Mapped
                        </Badge>
                      )}
                    </div>
                    {isMapped && mapping && (
                      <p className="text-sm text-muted-foreground">
                        → {mapping.lp_campaign?.name || 'Lead Prosper Campaign'}
                      </p>
                    )}
                    {!isMapped && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/data-sources?source=leadprosper&tab=campaigns`}
                        className="mt-2"
                      >
                        <Link2 className="h-3 w-3 mr-1" />
                        Map Campaign
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Date Selector */}
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
              onClick={refreshLeadProsperLeads} 
              className="ml-2"
              disabled={refreshing}
            >
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Debug Information */}
      {debugInfo.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-5 w-5" />
                Debug Information
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
              >
                {showDebug ? 'Hide' : 'Show'} Details
              </Button>
            </div>
            <CardDescription>
              Troubleshooting information for lead import process
            </CardDescription>
          </CardHeader>
          {showDebug && (
            <CardContent>
              <div className="space-y-4">
                {debugInfo.map((info, index) => (
                  <div key={index} className="border rounded p-3 bg-gray-50">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(info, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Main Leads Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex justify-between items-center">
            <span>Leads from Lead Prosper</span>
          </CardTitle>
          <CardDescription>
            Leads imported from mapped Lead Prosper campaigns for {filters.startDate} to {filters.endDate}
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
              
              <Button
                variant="outline"
                onClick={() => setFiltersOpen(!filtersOpen)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </div>
          </div>
          
          {/* Additional Filters */}
          {filtersOpen && (
            <div className="p-3 border rounded-md mb-3 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Campaign</h4>
                  <Select 
                    value={filters.campaignId} 
                    onValueChange={(value) => setFilters({...filters, campaignId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Campaigns" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campaigns</SelectItem>
                      {mappedCampaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.id}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Status</h4>
                  <Select 
                    value={filters.status} 
                    onValueChange={(value) => setFilters({...filters, status: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="sold">Sold</SelectItem>
                      <SelectItem value="duplicate">Duplicate</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          
          {/* Check if any campaigns are mapped */}
          {mappedCampaigns.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No campaigns are mapped to Lead Prosper yet. Map your campaigns to start importing lead data.
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.href = '/data-sources?source=leadprosper&tab=campaigns'}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Map Campaigns
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <LeadProsperLeadsList 
              campaignId={filters.campaignId === 'all' ? undefined : filters.campaignId}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
