import { useCampaign } from "@/contexts/CampaignContext";

const CampaignListPage = () => {
  const { campaigns } = useCampaign();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">All Campaigns</h1>
      <ul className="space-y-2">
        {campaigns.map((campaign) => (
          <li key={campaign.id} className="text-foreground">
            {campaign.name}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CampaignListPage;
