
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CaseBuyer } from "@/types/campaign";
import { Badge } from "@/components/ui/badge";

interface BuyerStackDisplayProps {
  campaignId: string;
  limit?: number;
}

export function BuyerStackDisplay({ campaignId, limit = 3 }: BuyerStackDisplayProps) {
  const [buyers, setBuyers] = useState<CaseBuyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBuyers, setTotalBuyers] = useState(0);

  useEffect(() => {
    const fetchBuyerStack = async () => {
      try {
        setLoading(true);
        
        // First get count of all buyers in the stack
        const { count, error: countError } = await supabase
          .from('campaign_buyer_stack')
          .select('id', { count: 'exact' })
          .eq('campaign_id', campaignId);
          
        if (countError) throw countError;
        
        setTotalBuyers(count || 0);
        
        // Then get the limited number of buyers with their details
        const { data, error } = await supabase
          .from('campaign_buyer_stack')
          .select(`
            case_buyers (
              id,
              name,
              url
            )
          `)
          .eq('campaign_id', campaignId)
          .order('stack_order')
          .limit(limit);
          
        if (error) throw error;
        
        const buyersList = data
          .map(item => item.case_buyers as CaseBuyer)
          .filter(buyer => buyer !== null);
          
        setBuyers(buyersList);
      } catch (error) {
        console.error('Error fetching buyer stack:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBuyerStack();
  }, [campaignId, limit]);
  
  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading buyers...</div>;
  }
  
  if (buyers.length === 0) {
    return <div className="text-xs text-muted-foreground">No buyers assigned</div>;
  }
  
  const remainingCount = totalBuyers - buyers.length;
  
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {buyers.map((buyer, index) => (
        <Badge 
          key={buyer.id}
          variant="outline"
          className="text-xs font-normal"
        >
          {index + 1}. {buyer.name}
        </Badge>
      ))}
      
      {remainingCount > 0 && (
        <Badge 
          variant="secondary"
          className="text-xs font-normal"
        >
          +{remainingCount} more
        </Badge>
      )}
    </div>
  );
}
