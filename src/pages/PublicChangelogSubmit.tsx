import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, History, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  workspace_id: string;
}

const CHANGE_TYPE_OPTIONS = [
  { value: "ad_creative", label: "Ad/Creative Change" },
  { value: "targeting", label: "Targeting Change" },
  { value: "spend_increase", label: "Ad Spend Increase" },
  { value: "spend_decrease", label: "Ad Spend Decrease" },
];

const PublicChangelogSubmit: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Form state
  const [employeeName, setEmployeeName] = useState("");
  const [formCampaignId, setFormCampaignId] = useState("");
  const [formChangeType, setFormChangeType] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formChangeDate, setFormChangeDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Sort campaigns alphabetically
  const sortedCampaigns = useMemo(() => 
    [...campaigns].sort((a, b) => a.name.localeCompare(b.name)),
    [campaigns]
  );

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const { data, error } = await supabase
          .from("campaigns")
          .select("id, name, workspace_id")
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        setCampaigns(data || []);
      } catch (error) {
        console.error("Error fetching campaigns:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCampaigns();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formCampaignId || !formChangeType || !formTitle.trim() || !employeeName.trim()) {
      return;
    }

    const selectedCampaign = campaigns.find(c => c.id === formCampaignId);
    if (!selectedCampaign) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("campaign_changelog")
        .insert({
          workspace_id: selectedCampaign.workspace_id,
          campaign_id: formCampaignId,
          change_type: formChangeType,
          title: formTitle.trim(),
          description: `Submitted by: ${employeeName.trim()}${formDescription.trim() ? `\n\n${formDescription.trim()}` : ""}`,
          change_date: formChangeDate,
        });

      if (error) throw error;
      
      setIsSubmitted(true);
    } catch (error) {
      console.error("Error submitting changelog entry:", error);
      alert("Failed to submit change. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnother = () => {
    setIsSubmitted(false);
    setFormCampaignId("");
    setFormChangeType("");
    setFormTitle("");
    setFormDescription("");
    setFormChangeDate(format(new Date(), "yyyy-MM-dd"));
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="mb-6">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Change Logged Successfully!</h2>
            <p className="text-muted-foreground mb-6">
              Your change has been recorded and will be analyzed for performance impact.
            </p>
            <Button onClick={handleSubmitAnother} className="w-full">
              Log Another Change
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <History className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Log a Campaign Change</CardTitle>
          <CardDescription>
            Record ad/creative, targeting, or budget changes to track their impact
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading campaigns...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="employee-name">Your Name *</Label>
                <Input
                  id="employee-name"
                  placeholder="Enter your name"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="campaign">Campaign *</Label>
                <Select value={formCampaignId} onValueChange={setFormCampaignId} required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedCampaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="change-type">Change Type *</Label>
                <Select value={formChangeType} onValueChange={setFormChangeType} required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select change type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANGE_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="change-date">Change Date *</Label>
                <Input
                  id="change-date"
                  type="date"
                  value={formChangeDate}
                  onChange={(e) => setFormChangeDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="title">What Changed? *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Increased daily budget by 20%"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="description">Additional Details (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Any additional context about the change..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full mt-6"
                disabled={isSubmitting || !formCampaignId || !formChangeType || !formTitle.trim() || !employeeName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Change"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicChangelogSubmit;
