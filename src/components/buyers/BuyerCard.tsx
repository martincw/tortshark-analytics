import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Globe, Mail, MoreHorizontal, 
  BadgeDollarSign, ExternalLink, 
  Building2, MessageSquare, Phone, 
  AlertCircle
} from "lucide-react";
import { CaseBuyer, BuyerTortCoverage } from "@/types/buyer";
import { formatCurrency } from "@/utils/campaignUtils";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BuyerCardProps {
  buyer: CaseBuyer;
  onViewDetail: (id: string) => void;
  onClick?: () => void;
}

export function BuyerCard({ buyer, onViewDetail }: BuyerCardProps) {
  const [tortCoverage, setTortCoverage] = useState<BuyerTortCoverage[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(false);

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
          buyer_id,
          campaign_id,
          is_active,
          campaigns:campaign_id (
            id, 
            name
          )
        `)
        .eq("buyer_id", buyer.id);

      if (error) throw error;
      
      const formattedCoverage: BuyerTortCoverage[] = (data || []).map(item => ({
        id: item.id,
        buyer_id: item.buyer_id,
        campaign_id: item.campaign_id,
        payout_amount: item.payout_amount,
        is_active: item.is_active,
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

  // Get icon based on buyer platform or type
  const getBuyerIcon = () => {
    const platform = buyer.platform?.toLowerCase();
    
    if (platform === 'email') return <MessageSquare className="h-4 w-4 mr-1" />;
    if (platform === 'phone' || platform === 'sms') return <Phone className="h-4 w-4 mr-1" />;
    if (!buyer.url && !platform) return <AlertCircle className="h-4 w-4 mr-1" />;
    
    return <Building2 className="h-4 w-4 mr-1" />;
  };

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 cursor-pointer hover:border-primary/50" 
      onClick={() => onViewDetail(buyer.id)}
    >
      <CardContent className="p-0">
        {/* Header Section with solid blue background */}
        <div className="bg-[#0EA5E9] p-4 border-b">
          <div className="flex justify-between items-start">
            <div className="flex items-center">
              {getBuyerIcon()}
              <h3 className="font-semibold truncate max-w-[200px] text-white">{buyer.name}</h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-blue-600">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(buyer.id);
                }}>
                  Edit Details
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {buyer.platform && (
            <span className="text-xs text-white/80 mt-1 flex items-center">
              Platform: {buyer.platform}
            </span>
          )}
        </div>

        {/* Main Section */}
        <div className="p-4">
          {/* Contact Info - Only show website as button */}
          <div className="space-y-2 mb-4">
            {buyer.url && (
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 w-full flex items-center justify-center gap-1 text-xs"
                  onClick={openWebsite}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Visit Website
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            )}
            
            {buyer.email && (
              <div className="flex items-center text-sm text-muted-foreground mt-2">
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
                  <div className="text-center text-xs text-primary mt-2">
                    +{tortCoverage.length - 3} more coverages
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-3 border border-dashed rounded-md">
                <p className="text-sm text-muted-foreground">No tort coverage</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
