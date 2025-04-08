
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import CampaignForm from "@/components/campaigns/CampaignForm";

const AddCampaignPage = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          onClick={() => navigate("/campaigns")}
          variant="outline"
          size="icon"
          className="h-9 w-9"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Add New Campaign</h1>
      </div>
      
      <CampaignForm onCancel={() => navigate("/campaigns")} />
    </div>
  );
};

export default AddCampaignPage;
