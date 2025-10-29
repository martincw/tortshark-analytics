import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Globe, Mail, ExternalLink, 
  BadgeDollarSign, Building2, MessageSquare, Phone, 
  AlertCircle, ToggleLeft, ToggleRight
} from "lucide-react";
import { CaseBuyer, BuyerTortCoverage } from "@/types/buyer";
import { formatCurrency } from "@/utils/campaignUtils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface BuyerListItemProps {
  buyer: CaseBuyer;
  onViewDetail: (id: string) => void;
}

export function BuyerListItem({ buyer, onViewDetail }: BuyerListItemProps) {
  const [tortCoverage, setTortCoverage] = useState<BuyerTortCoverage[]>([]);
  const [loadingCoverage, setLoadingCoverage] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
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

  const toggleTortCoverageActive = async (coverageId: string, isActive: boolean) => {
    setUpdatingId(coverageId);
    try {
      const { error } = await supabase
        .from('buyer_tort_coverage')
        .update({ is_active: isActive })
        .eq('id', coverageId);

      if (error) throw error;
      
      setTortCoverage(prevCoverage => 
        prevCoverage.map(coverage => 
          coverage.id === coverageId 
            ? { ...coverage, is_active: isActive } 
            : coverage
        )
      );
      
      toast.success(`Tort coverage ${isActive ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling tort coverage active status:', error);
      toast.error('Failed to update tort coverage status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleActive = (e: React.MouseEvent, coverageId: string, currentStatus: boolean) => {
    e.stopPropagation();
    toggleTortCoverageActive(coverageId, !currentStatus);
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

  const getBuyerIcon = () => {
    const platform = buyer.platform?.toLowerCase();
    
    if (platform === 'email') return <MessageSquare className="h-4 w-4" />;
    if (platform === 'phone' || platform === 'sms') return <Phone className="h-4 w-4" />;
    if (!buyer.url && !platform) return <AlertCircle className="h-4 w-4" />;
    
    return <Building2 className="h-4 w-4" />;
  };

  return (
    <div 
      className="flex items-center gap-4 p-4 border rounded-lg hover:border-primary/50 transition-all cursor-pointer bg-card"
      onClick={() => onViewDetail(buyer.id)}
    >
      {/* Icon & Name */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#0EA5E9] text-white">
          {getBuyerIcon()}
        </div>
        <div>
          <h3 className="font-semibold">{buyer.name}</h3>
          {buyer.platform && (
            <span className="text-xs text-muted-foreground">Platform: {buyer.platform}</span>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex items-center gap-4 min-w-[300px]">
        {buyer.email && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 mr-1.5" />
            <span className="truncate max-w-[150px]">{buyer.email}</span>
          </div>
        )}
        {buyer.url && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 flex items-center gap-1 text-xs"
            onClick={openWebsite}
          >
            <Globe className="h-3.5 w-3.5" />
            Website
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Tort Coverage */}
      <div className="flex-1 min-w-[250px]">
        {loadingCoverage ? (
          <div className="flex justify-center py-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          </div>
        ) : tortCoverage.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{tortCoverage.length} torts</Badge>
            {tortCoverage.slice(0, 2).map((coverage) => (
              <div 
                key={coverage.id} 
                className={`flex items-center gap-2 text-xs border rounded-md px-2 py-1 ${!coverage.is_active ? 'opacity-60' : ''}`}
              >
                {coverage.is_active ? (
                  <ToggleRight className="h-3 w-3 text-green-500" />
                ) : (
                  <ToggleLeft className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="truncate max-w-[80px]">{coverage.campaigns?.name}</span>
                <span className="text-muted-foreground">{formatCurrency(coverage.payout_amount)}</span>
              </div>
            ))}
            {tortCoverage.length > 2 && (
              <Badge variant="outline">+{tortCoverage.length - 2} more</Badge>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No tort coverage</span>
        )}
      </div>
    </div>
  );
}
