
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Campaign } from "@/types/campaign";
import { CampaignPerformanceSection } from "@/components/campaigns/CampaignPerformanceSection";
import { BuyerStack } from "@/components/buyers/BuyerStack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaigns, isLoading } = useCampaign();
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    if (!isLoading && campaigns && id) {
      const foundCampaign = campaigns.find(c => c.id === id);
      setCampaign(foundCampaign || null);
    }
  }, [campaigns, id, isLoading]);

  if (isLoading) {
    return <div>Loading campaign details...</div>;
  }

  if (!campaign) {
    return (
      <div>
        <div className="mb-4">
          <Button
            onClick={() => navigate("/campaigns")}
            variant="outline"
            size="icon"
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
        <h1>Campaign not found</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => navigate("/campaigns")}
          variant="outline"
          size="icon"
          className="h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="buyers">Buyers</TabsTrigger>
        </TabsList>
        <TabsContent value="performance" className="space-y-6 pt-4">
          <CampaignPerformanceSection campaign={campaign} />
        </TabsContent>
        <TabsContent value="buyers" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Buyer Stack</CardTitle>
              <CardDescription>
                Manage the priority order of buyers for this campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BuyerStack campaignId={campaign.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CampaignDetail;
