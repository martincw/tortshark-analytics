
import { useState, useEffect } from "react";
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
  CardTitle
} from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/campaignUtils";

interface BuyerRanking {
  buyer_id: string;
  buyer_name: string;
  url: string | null;
  payout_amount: number;
  campaign_id: string;
  campaign_name: string;
}

interface SimpleCampaign {
  id: string;
  name: string;
}

export function BuyerRankingsTable() {
  const [rankings, setRankings] = useState<BuyerRanking[]>([]);
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState<SimpleCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");

  useEffect(() => {
    fetchCampaigns();
    fetchRankings();
  }, []);

  useEffect(() => {
    fetchRankings();
  }, [selectedCampaign]);

  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    }
  };

  const fetchRankings = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("buyer_tort_coverage")
        .select(`
          id,
          payout_amount,
          buyer_id,
          campaign_id,
          case_buyers (id, name, url),
          campaigns (id, name)
        `)
        .order("payout_amount", { ascending: false });

      if (selectedCampaign !== "all") {
        query = query.eq("campaign_id", selectedCampaign);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform the data
      const formattedRankings: BuyerRanking[] = (data || []).map((item) => ({
        buyer_id: item.buyer_id,
        buyer_name: item.case_buyers?.name || "Unknown",
        url: item.case_buyers?.url || null,
        payout_amount: item.payout_amount,
        campaign_id: item.campaign_id,
        campaign_name: item.campaigns?.name || "Unknown"
      }));

      setRankings(formattedRankings);
    } catch (error) {
      console.error("Error fetching buyer rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const openBuyerWebsite = (url: string | null) => {
    if (!url) return;
    
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = 'https://' + url;
    }
    
    window.open(formattedUrl, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          <div>
            <CardTitle>Buyer Rankings</CardTitle>
            <CardDescription>
              See which buyers are offering the highest payouts
            </CardDescription>
          </div>
          <div className="w-full sm:w-[200px]">
            <Select 
              value={selectedCampaign} 
              onValueChange={setSelectedCampaign}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No buyer rankings available</p>
            <p className="text-sm mt-1">Add tort coverage for buyers to see their rankings</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Buyer</TableHead>
                {selectedCampaign === "all" && <TableHead>Campaign</TableHead>}
                <TableHead className="text-right">Payout</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((ranking, index) => (
                <TableRow key={`${ranking.buyer_id}-${ranking.campaign_id}`}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{ranking.buyer_name}</TableCell>
                  {selectedCampaign === "all" && (
                    <TableCell>{ranking.campaign_name}</TableCell>
                  )}
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(ranking.payout_amount)}
                  </TableCell>
                  <TableCell className="w-[60px]">
                    {ranking.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openBuyerWebsite(ranking.url)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">Visit website</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
