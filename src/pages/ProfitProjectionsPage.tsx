
import React, { useState } from "react";
import { useCampaign } from "@/contexts/CampaignContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency } from "@/utils/campaignUtils";
import { ArrowRight, Briefcase, Calculator, DollarSign, Target } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatDateForStorage, parseStoredDate, formatDisplayDate } from "@/lib/utils/ManualDateUtils";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfitProjectionsCalculator } from "@/components/projections/ProfitProjectionsCalculator";
import { CampaignSelector } from "@/components/projections/CampaignSelector";

const ProfitProjectionsPage = () => {
  const navigate = useNavigate();
  const { campaigns } = useCampaign();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profit Projections</h1>
          <p className="text-muted-foreground mt-1">
            Calculate and visualize profit projections and required ad spend
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/campaigns")}>
          Back to Campaigns
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <CampaignSelector 
            campaigns={campaigns} 
            selectedCampaignId={selectedCampaignId}
            setSelectedCampaignId={setSelectedCampaignId}
          />
        </div>
        
        <div className="lg:col-span-3">
          {selectedCampaignId ? (
            <ProfitProjectionsCalculator 
              selectedCampaignId={selectedCampaignId} 
              campaigns={campaigns}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-8">
                <p className="text-muted-foreground text-center">
                  Please select a campaign to start your profit projections
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitProjectionsPage;
