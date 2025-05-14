import React, { useState, useEffect } from 'react';
import { hyrosApi } from '@/integrations/hyros/client';
import { parseStoredDate, formatDateForStorage } from '@/lib/utils/ManualDateUtils';

interface HyrosLeadsListProps {
  startDate: string;
  endDate: string;
  campaignId?: string;
  searchTerm?: string;
  pageSize?: number;
}

export default function HyrosLeadsList({
  startDate,
  endDate,
  campaignId,
  searchTerm,
  pageSize = 20
}: HyrosLeadsListProps) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<HyrosLead[]>([]);
  const [nextPageId, setNextPageId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalShown, setTotalShown] = useState(0);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [sourceLinkGroups, setSourceLinkGroups] = useState<{[key: string]: number}>({});
  const [expandedSourceLinks, setExpandedSourceLinks] = useState<{[key: string]: boolean}>({});
  const [hyrosCampaigns, setHyrosCampaigns] = useState<{[id: string]: string}>({});

  // Load HYROS campaign mappings on component mount
  useEffect(() => {
    const fetchHyrosCampaigns = async () => {
      try {
        const campaigns = await hyrosApi.fetchHyrosCampaigns();
        if (campaigns.success && campaigns.campaigns) {
          const campaignMap: {[id: string]: string} = {};
          campaigns.campaigns.forEach(campaign => {
            campaignMap[campaign.hyrosCampaignId] = campaign.name;
          });
          setHyrosCampaigns(campaignMap);
        }
      } catch (error) {
        console.error('Error fetching HYROS campaigns:', error);
      }
    };
    
    fetchHyrosCampaigns();
  }, []);

  // Load leads
  const loadLeads = async (pageId?: string) => {
    try {
      setLoading(true);
      setError(null);

      // Call API to get leads, passing campaignId directly to the API if provided
      const result = await hyrosApi.fetchLeadsForDateRange({
        fromDate: startDate,
        toDate: endDate,
        pageSize,
        pageId,
        emails: searchTerm ? [searchTerm] : undefined,
        campaignId: campaignId
      });

      if (!result.success) {
        setError(result.error || 'Failed to fetch leads from HYROS');
        setLeads([]);
        return;
      }
      
      // Sort leads by creation date
      const sortedLeads = (result.leads || []).sort((a, b) => {
        const dateA = new Date(a.creationDate || '').getTime();
        const dateB = new Date(b.creationDate || '').getTime();
        return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
      });
      
      setLeads(sortedLeads);
      setNextPageId(result.nextPageId);
      setTotalShown((prev) => (pageId ? prev + (sortedLeads.length || 0) : sortedLeads.length || 0));
      
      // Process sourcelink information
      processSourceLinkData(sortedLeads);
    } catch (error) {
      console.error('Error loading leads:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Extract and count sourcelink IDs
  const processSourceLinkData = (leadsData: HyrosLead[]) => {
    const sourceLinkCounts: {[key: string]: number} = {};
    
    leadsData.forEach(lead => {
      // Check first source for sourcelink information
      if (lead.firstSource && typeof lead.firstSource === 'object') {
        const sourceLinkId = lead.firstSource.sourceLinkId || lead.firstSource.id;
        if (sourceLinkId) {
          sourceLinkCounts[sourceLinkId] = (sourceLinkCounts[sourceLinkId] || 0) + 1;
        }
      }
      
      // Also check last source if it's different
      if (lead.lastSource && typeof lead.lastSource === 'object' && 
          lead.lastSource !== lead.firstSource) {
        const sourceLinkId = lead.lastSource.sourceLinkId || lead.lastSource.id;
        if (sourceLinkId) {
          sourceLinkCounts[sourceLinkId] = (sourceLinkCounts[sourceLinkId] || 0) + 1;
        }
      }
    });
    
    setSourceLinkGroups(sourceLinkCounts);
  };

  // Load on initial render and when filters change
  useEffect(() => {
    loadLeads();
  }, [startDate, endDate, campaignId, searchTerm, pageSize, sortDirection]);

  // Handle load more
  const handleLoadMore = () => {
    if (nextPageId) {
      loadLeads(nextPageId);
    }
  };

  // Toggle sort direction
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // Refresh data
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadLeads();
    } catch (error) {
      console.error("Error refreshing leads:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Format date helper
  const formatLeadDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  // Toggle sourcelink expansion
  const toggleSourceLinkExpansion = (id: string) => {
    setExpandedSourceLinks(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Function to get campaign name from source ID
  const getCampaignNameFromSourceId = (sourceId: string): string => {
    if (hyrosCampaigns[sourceId]) {
      return hyrosCampaigns[sourceId];
    }
    return 'Unknown Campaign';
  };

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {leads.length} leads
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSortDirection}
          >
            Date {sortDirection === 'desc' ? <ChevronDown className="ml-2 h-4 w-4" /> : <ChevronUp className="ml-2 h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCcw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* SourceLink ID Section */}
      {Object.keys(sourceLinkGroups).length > 0 && (
        <div className="border rounded-md p-4 bg-background">
          <h3 className="text-md font-medium mb-3">SourceLink IDs</h3>
          <div className="space-y-2">
            {Object.entries(sourceLinkGroups)
              .sort(([_, countA], [__, countB]) => countB - countA)
              .map(([id, count]) => (
                <Collapsible 
                  key={id}
                  open={expandedSourceLinks[id]}
                  onOpenChange={() => toggleSourceLinkExpansion(id)}
                  className="border p-2 rounded-md"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-1">
                          {expandedSourceLinks[id] ? 
                            <ChevronUp className="h-4 w-4" /> : 
                            <ChevronDown className="h-4 w-4" />
                          }
                        </Button>
                      </CollapsibleTrigger>
                      <span className="font-mono text-sm">{id}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {getCampaignNameFromSourceId(id)}
                      </span>
                    </div>
                    <Badge variant="secondary">{count} lead{count !== 1 ? 's' : ''}</Badge>
                  </div>
                  <CollapsibleContent className="pt-2 pl-8">
                    <div className="text-sm text-muted-foreground">
                      {leads.filter(lead => {
                        const firstSourceId = lead.firstSource?.sourceLinkId || lead.firstSource?.id;
                        const lastSourceId = lead.lastSource?.sourceLinkId || lead.lastSource?.id;
                        return firstSourceId === id || lastSourceId === id;
                      }).slice(0, 5).map((lead, idx) => (
                        <div key={idx} className="py-1">
                          {lead.email} - {formatLeadDate(lead.creationDate || '')}
                        </div>
                      ))}
                      {count > 5 && (
                        <div className="text-xs italic pt-1">
                          And {count - 5} more leads...
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
          </div>
        </div>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>
                <div className="flex items-center">
                  Creation Date
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleSortDirection}
                    className="ml-1 p-0 h-6 w-6"
                  >
                    <ArrowUpDown className="h-3 w-3" />
                  </Button>
                </div>
              </TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No leads found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead, index) => (
                <TableRow key={lead.id || index}>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{formatLeadDate(lead.creationDate || '')}</TableCell>
                  <TableCell>
                    {lead.tags && lead.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.map((tag, i) => (
                          <span key={i} className="bg-gray-100 px-2 py-1 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No tags</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.phoneNumbers && lead.phoneNumbers.length > 0 ? (
                      lead.phoneNumbers[0]
                    ) : (
                      <span className="text-muted-foreground text-sm">No phone</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {lead.firstSource ? (
                      <span className="text-sm font-mono">
                        {lead.firstSource.sourceLinkId || lead.firstSource.id || 'Unknown'}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-sm">No source</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {nextPageId && (
        <div className="flex justify-center mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore} 
                  disabled={loading || refreshing}
                >
                  Load More
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
