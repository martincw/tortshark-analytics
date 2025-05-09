
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RefreshCcw, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { hyrosApi } from '@/integrations/hyros/client';
import { HyrosLeadsListResponse, HyrosLead } from '@/integrations/hyros/types';
import { cn } from '@/lib/utils';

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<HyrosLead[]>([]);
  const [nextPageId, setNextPageId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalShown, setTotalShown] = useState(0);

  // Load leads
  const loadLeads = async (pageId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result: HyrosLeadsListResponse = await hyrosApi.fetchLeadsForDateRange({
        fromDate: startDate,
        toDate: endDate,
        pageSize,
        pageId,
        emails: searchTerm ? [searchTerm] : undefined
      });

      setLeads(result.leads || []);
      setNextPageId(result.nextPageId);
      setTotalShown((prev) => (pageId ? prev + (result.leads?.length || 0) : result.leads?.length || 0));
    } catch (error) {
      console.error('Error loading leads:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Load on initial render and when filters change
  useEffect(() => {
    loadLeads();
  }, [startDate, endDate, campaignId, searchTerm, pageSize]);

  // Handle load more
  const handleLoadMore = () => {
    if (nextPageId) {
      loadLeads(nextPageId);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadLeads();
      toast({
        title: "Refreshed",
        description: "Lead data has been refreshed.",
      });
    } catch (error) {
      console.error("Error refreshing leads:", error);
      toast({
        title: "Error",
        description: "Failed to refresh leads.",
        variant: "destructive",
      });
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

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Creation Date</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Phone</TableHead>
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
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No leads found. Try adjusting your filters.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead, index) => (
                <TableRow key={lead.id || index}>
                  <TableCell>{lead.email}</TableCell>
                  <TableCell>{formatLeadDate(lead.creationDate)}</TableCell>
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
