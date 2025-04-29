
import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Mail, MoreHorizontal, ChevronDown, ChevronUp, BadgeDollarSign, ExternalLink } from "lucide-react";
import { CaseBuyer, BuyerTortCoverage } from "@/types/campaign";
import { formatCurrency } from "@/utils/campaignUtils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BuyerCardProps {
  buyer: CaseBuyer;
  onViewCoverage: () => void;
  onClick?: () => void;
}

export function BuyerCard({ buyer, onViewCoverage, onClick }: BuyerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tortCoverage, setTortCoverage] = useState<BuyerTortCoverage[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(false);

  useEffect(() => {
    if (expanded) {
      fetchTortCoverage();
    }
  }, [expanded, buyer.id]);

  useEffect(() => {
    // Always fetch tort coverage on initial load
    fetchTortCoverage();
  }, [buyer.id]);

  const fetchTortCoverage = async () => {
    setLoadingCoverage(true);
    try {
      const { data, error } = await supabase
        .from("buyer_tort_coverage")
        .select(`
          id, 
          payout_amount,
          campaigns:campaign_id (
            id, 
            name
          )
        `)
        .eq("buyer_id", buyer.id);

      if (error) throw error;
      
      // Map the returned data to match our BuyerTortCoverage interface
      const formattedCoverage: BuyerTortCoverage[] = (data || []).map(item => ({
        id: item.id,
        buyer_id: buyer.id,
        campaign_id: item.campaigns?.id || '',
        payout_amount: item.payout_amount,
        campaigns: item.campaigns
      }));
      
      setTortCoverage(formattedCoverage);
    } catch (error) {
      console.error("Error fetching tort coverage:", error);
    } finally {
      setLoadingCoverage(false);
    }
  };

  const openWebsite = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!buyer.url) {
      toast.error("No website URL available");
      return;
    }
    
    let fullUrl = buyer.url;
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }
    
    window.open(fullUrl, '_blank');
  };

  const averagePayout = tortCoverage.length > 0
    ? tortCoverage.reduce((sum, item) => sum + (item.payout_amount || 0), 0) / tortCoverage.length
    : 0;

  const totalPotentialValue = tortCoverage.reduce((sum, item) => sum + (item.payout_amount || 0), 0);

  return (
    <Card 
      className={`overflow-hidden transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-primary/50' : ''}`} 
      onClick={onClick}
    >
      <CardContent className="p-0">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-accent/10 to-background p-4 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold truncate max-w-[200px]">{buyer.name}</h3>
              {buyer.platform && (
                <span className="text-xs text-muted-foreground">
                  Platform: {buyer.platform}
                </span>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onViewCoverage();
                }}>
                  Manage Coverage
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  if (onClick) onClick();
                }}>
                  View Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Section */}
        <div className="p-4">
          {/* Contact Info */}
          <div className="space-y-2 mb-4">
            {buyer.url && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  <span className="truncate max-w-[150px]">{buyer.url}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={openWebsite}>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            )}
            
            {buyer.email && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                <span className="truncate max-w-[200px]">{buyer.email}</span>
              </div>
            )}
          </div>
          
          {/* Tort Coverage Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Tort Coverage</h4>
              <Badge variant="secondary">{tortCoverage.length} torts</Badge>
            </div>
            
            {loadingCoverage ? (
              <div className="flex justify-center py-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : tortCoverage.length > 0 ? (
              <div className="space-y-2">
                {tortCoverage.slice(0, 3).map((coverage) => (
                  <div key={coverage.id} className="flex items-center justify-between text-sm border-b pb-2">
                    <span className="truncate max-w-[180px]">{coverage.campaigns?.name}</span>
                    <div className="flex items-center">
                      <BadgeDollarSign className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <span>{formatCurrency(coverage.payout_amount)}</span>
                    </div>
                  </div>
                ))}
                
                {tortCoverage.length > 3 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs h-7 mt-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewCoverage();
                    }}
                  >
                    View {tortCoverage.length - 3} more
                  </Button>
                )}
                
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                  <div className="text-center p-2 bg-muted/30 rounded-md">
                    <div className="text-xs text-muted-foreground">Avg. Payout</div>
                    <div className="font-semibold">
                      {formatCurrency(averagePayout)}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-muted/30 rounded-md">
                    <div className="text-xs text-muted-foreground">Total Value</div>
                    <div className="font-semibold">
                      {formatCurrency(totalPotentialValue)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-3 border border-dashed rounded-md">
                <p className="text-sm text-muted-foreground">No tort coverage</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewCoverage();
                  }}
                >
                  Add Coverage
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t p-2 bg-muted/20 flex justify-end">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-xs h-7" 
          onClick={(e) => {
            e.stopPropagation();
            onViewCoverage();
          }}
        >
          Manage Coverage
        </Button>
      </CardFooter>
    </Card>
  );
}
