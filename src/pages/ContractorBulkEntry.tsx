
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Campaign {
  id: string;
  name: string;
}

export default function ContractorBulkEntry() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    contractorEmail: "",
    contractorName: "",
    campaignId: "",
    submissionDate: format(new Date(), 'yyyy-MM-dd'),
    adSpend: "",
    leads: "",
    cases: "",
    revenue: "",
    notes: ""
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCampaigns(data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.contractorEmail || !formData.contractorName || !formData.campaignId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('contractor_submissions')
        .insert({
          contractor_email: formData.contractorEmail,
          contractor_name: formData.contractorName,
          campaign_id: formData.campaignId,
          submission_date: formData.submissionDate,
          ad_spend: parseFloat(formData.adSpend) || 0,
          leads: parseInt(formData.leads) || 0,
          cases: parseInt(formData.cases) || 0,
          revenue: parseFloat(formData.revenue) || 0,
          notes: formData.notes,
          ip_address: window.location.hostname
        });

      if (error) throw error;

      toast.success('Stats submitted successfully! Admin will review and approve.');
      
      // Reset form
      setFormData({
        contractorEmail: "",
        contractorName: "",
        campaignId: "",
        submissionDate: format(new Date(), 'yyyy-MM-dd'),
        adSpend: "",
        leads: "",
        cases: "",
        revenue: "",
        notes: ""
      });
      
    } catch (error) {
      console.error('Error submitting stats:', error);
      toast.error('Failed to submit stats. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Campaign Stats Submission</CardTitle>
            <CardDescription>
              Submit daily campaign statistics for admin review and approval
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractorName">Your Name *</Label>
                  <Input
                    id="contractorName"
                    value={formData.contractorName}
                    onChange={(e) => handleInputChange('contractorName', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="contractorEmail">Your Email *</Label>
                  <Input
                    id="contractorEmail"
                    type="email"
                    value={formData.contractorEmail}
                    onChange={(e) => handleInputChange('contractorEmail', e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="campaign">Campaign *</Label>
                  {isLoading ? (
                    <div className="h-10 w-full flex items-center justify-center border border-input bg-background rounded-md text-sm text-muted-foreground">
                      Loading campaigns...
                    </div>
                  ) : campaigns.length === 0 ? (
                    <div className="h-10 w-full flex items-center justify-center border border-input bg-background rounded-md text-sm text-muted-foreground">
                      No campaigns available
                    </div>
                  ) : (
                    <Select value={formData.campaignId} onValueChange={(value) => handleInputChange('campaignId', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campaign" />
                      </SelectTrigger>
                      <SelectContent>
                        {campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="submissionDate">Date *</Label>
                  <Input
                    id="submissionDate"
                    type="date"
                    value={formData.submissionDate}
                    onChange={(e) => handleInputChange('submissionDate', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="adSpend">Ad Spend ($)</Label>
                  <Input
                    id="adSpend"
                    type="number"
                    step="0.01"
                    value={formData.adSpend}
                    onChange={(e) => handleInputChange('adSpend', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                
                <div>
                  <Label htmlFor="leads">Leads</Label>
                  <Input
                    id="leads"
                    type="number"
                    value={formData.leads}
                    onChange={(e) => handleInputChange('leads', e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="cases">Cases</Label>
                  <Input
                    id="cases"
                    type="number"
                    value={formData.cases}
                    onChange={(e) => handleInputChange('cases', e.target.value)}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="revenue">Revenue ($)</Label>
                  <Input
                    id="revenue"
                    type="number"
                    step="0.01"
                    value={formData.revenue}
                    onChange={(e) => handleInputChange('revenue', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any additional notes or comments..."
                  rows={3}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || isLoading || campaigns.length === 0}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Stats'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
