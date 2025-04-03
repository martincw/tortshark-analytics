
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { calculateMetrics, formatCurrency, formatNumber, formatPercent } from "@/utils/campaignUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeStat } from "@/components/ui/badge-stat";
import { StatCard } from "@/components/ui/stat-card";
import {
  ArrowLeft,
  Edit,
  Trash2,
  DollarSign,
  Users,
  FileCheck,
  TrendingUp,
  BarChart3,
  CreditCard,
  Percent,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaigns, updateCampaign, deleteCampaign } = useCampaign();
  
  const campaign = campaigns.find((c) => c.id === id);
  
  const [isEditing, setIsEditing] = useState(false);
  const [leadCount, setLeadCount] = useState(campaign?.manualStats.leads.toString() || "0");
  const [caseCount, setCaseCount] = useState(campaign?.manualStats.cases.toString() || "0");
  const [retainerCount, setRetainerCount] = useState(campaign?.manualStats.retainers.toString() || "0");
  const [revenue, setRevenue] = useState(campaign?.manualStats.revenue.toString() || "0");
  
  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <h1 className="text-2xl font-bold mb-4">Campaign not found</h1>
        <Button onClick={() => navigate("/")} variant="default">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }
  
  const metrics = calculateMetrics(campaign);

  // Get ROI class based on performance
  const getRoiClass = () => {
    if (metrics.roi > 200) return "text-success-DEFAULT";
    if (metrics.roi > 0) return "text-secondary"; 
    return "text-error-DEFAULT";
  };
  
  const handleSave = () => {
    const updatedCampaign = {
      ...campaign,
      manualStats: {
        ...campaign.manualStats,
        leads: parseInt(leadCount) || 0,
        cases: parseInt(caseCount) || 0,
        retainers: parseInt(retainerCount) || 0,
        revenue: parseFloat(revenue) || 0,
      },
    };
    
    updateCampaign(updatedCampaign);
    setIsEditing(false);
    toast.success("Campaign updated successfully");
  };
  
  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this campaign?")) {
      deleteCampaign(campaign.id);
      navigate("/");
      toast.success("Campaign deleted successfully");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            size="icon"
            className="h-9 w-9"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant="outline"
          >
            <Edit className="mr-2 h-4 w-4" />
            {isEditing ? "Cancel" : "Update Stats"}
          </Button>
          {isEditing ? (
            <Button onClick={handleSave} variant="default">
              Save Changes
            </Button>
          ) : (
            <Button onClick={handleDelete} variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
        </div>
      </div>
      
      {/* Highlight ROI and Profit metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard
          title="Return on Investment"
          value={`${metrics.roi.toFixed(1)}%`}
          icon={<Percent className="h-5 w-5" />}
          trend={metrics.roi > 0 ? "up" : "down"}
          trendValue={metrics.roi > 200 ? "Excellent" : metrics.roi > 100 ? "Good" : metrics.roi > 0 ? "Positive" : "Needs Attention"}
          className="border-2 border-secondary"
          valueClassName={getRoiClass()}
        />
        
        <StatCard
          title="Campaign Profit"
          value={formatCurrency(metrics.profit)}
          icon={<CreditCard className="h-5 w-5" />}
          trend={metrics.profit > 0 ? "up" : "down"}
          trendValue={metrics.profit > 5000 ? "High Performer" : metrics.profit > 0 ? "Profitable" : "Loss"}
          className="border-2 border-secondary"
          valueClassName={getRoiClass()}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ad Spend"
          value={formatCurrency(campaign.stats.adSpend)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Leads"
          value={isEditing ? (
            <Input
              type="number"
              value={leadCount}
              onChange={(e) => setLeadCount(e.target.value)}
              className="h-8 w-24 text-lg font-bold"
            />
          ) : (
            formatNumber(campaign.manualStats.leads)
          )}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Cases"
          value={isEditing ? (
            <Input
              type="number"
              value={caseCount}
              onChange={(e) => setCaseCount(e.target.value)}
              className="h-8 w-24 text-lg font-bold"
            />
          ) : (
            formatNumber(campaign.manualStats.cases)
          )}
          icon={<FileCheck className="h-5 w-5" />}
        />
        <StatCard
          title="Retainers"
          value={isEditing ? (
            <Input
              type="number"
              value={retainerCount}
              onChange={(e) => setRetainerCount(e.target.value)}
              className="h-8 w-24 text-lg font-bold"
            />
          ) : (
            formatNumber(campaign.manualStats.retainers)
          )}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campaign Metrics</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <BadgeStat
                label="Cost Per Click"
                value={formatCurrency(campaign.stats.cpc)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <BadgeStat
                label="Cost Per Lead"
                value={formatCurrency(metrics.costPerLead)}
              />
            </div>
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-muted-foreground" />
              <BadgeStat
                label="Cost Per Case"
                value={formatCurrency(metrics.cpa)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Percent className="h-5 w-5 text-muted-foreground" />
              <BadgeStat
                label="Lead to Case Ratio"
                value={`${campaign.manualStats.leads > 0 ? ((campaign.manualStats.cases / campaign.manualStats.leads) * 100).toFixed(1) : "0"}%`}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <BadgeStat
                  label="Revenue"
                  value={isEditing ? (
                    <Input
                      type="number"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      className="h-8 w-24"
                    />
                  ) : (
                    formatCurrency(campaign.manualStats.revenue)
                  )}
                />
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <BadgeStat
                  label="Average Revenue Per Case"
                  value={campaign.manualStats.cases > 0 
                    ? formatCurrency(campaign.manualStats.revenue / campaign.manualStats.cases) 
                    : "$0.00"}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignDetail;
