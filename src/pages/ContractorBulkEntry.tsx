
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Campaign {
  id: string;
  name: string;
}

type DailyStats = {
  leads: number;
  cases: number;
  revenue: number;
  adSpend: number;
};

export default function ContractorBulkEntry() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [statsData, setStatsData] = useState<Record<string, DailyStats>>({});
  const [bulkPasteField, setBulkPasteField] = useState<'leads' | 'cases' | 'revenue' | 'adSpend' | null>(null);
  const [bulkPasteDialogOpen, setBulkPasteDialogOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  
  const [contractorInfo, setContractorInfo] = useState({
    contractorEmail: "",
    contractorName: "",
    submissionDate: format(new Date(), 'yyyy-MM-dd'),
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

  const handleContractorInfoChange = (field: string, value: string) => {
    setContractorInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCampaignSelect = (campaignId: string, isSelected: boolean) => {
    const newSelectedCampaigns = new Set(selectedCampaigns);
    
    if (isSelected) {
      newSelectedCampaigns.add(campaignId);
      // Initialize stats with defaults
      setStatsData(prev => ({
        ...prev,
        [campaignId]: {
          leads: 0,
          cases: 0,
          revenue: 0,
          adSpend: 0
        }
      }));
    } else {
      newSelectedCampaigns.delete(campaignId);
      setStatsData(prev => {
        const newData = { ...prev };
        delete newData[campaignId];
        return newData;
      });
    }
    
    setSelectedCampaigns(newSelectedCampaigns);
  };

  const handleInputChange = (campaignId: string, field: keyof DailyStats, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    
    setStatsData(prev => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 }),
        [field]: numValue
      }
    }));
  };

  const cleanNumericValue = (value: string): number => {
    const cleanedValue = value.replace(/[$,\s]/g, '');
    return cleanedValue === '' ? 0 : parseFloat(cleanedValue);
  };

  const handleBulkPaste = () => {
    if (!bulkPasteField || selectedCampaigns.size === 0) return;

    const values = pasteContent
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .map(value => {
        const cleanedValue = cleanNumericValue(value);
        return isNaN(cleanedValue) ? 0 : cleanedValue;
      });

    const campaignArray = Array.from(selectedCampaigns);
    const validValues = values.slice(0, campaignArray.length);

    setStatsData(prev => {
      const newData = { ...prev };
      
      validValues.forEach((value, index) => {
        if (index < campaignArray.length) {
          const campaignId = campaignArray[index];
          newData[campaignId] = {
            ...(newData[campaignId] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 }),
            [bulkPasteField]: value
          };
        }
      });

      return newData;
    });

    setBulkPasteDialogOpen(false);
    setPasteContent("");
    setBulkPasteField(null);
    toast.success(`Pasted ${validValues.length} values for ${bulkPasteField}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contractorInfo.contractorEmail || !contractorInfo.contractorName) {
      toast.error('Please fill in your name and email');
      return;
    }

    if (selectedCampaigns.size === 0) {
      toast.error('Please select at least one campaign');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Submit stats for each selected campaign
      for (const campaignId of selectedCampaigns) {
        const campaignStats = statsData[campaignId] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
        
        const { error } = await supabase
          .from('contractor_submissions')
          .insert({
            contractor_email: contractorInfo.contractorEmail,
            contractor_name: contractorInfo.contractorName,
            campaign_id: campaignId,
            submission_date: contractorInfo.submissionDate,
            ad_spend: campaignStats.adSpend || 0,
            leads: campaignStats.leads || 0,
            cases: campaignStats.cases || 0,
            revenue: campaignStats.revenue || 0,
            notes: contractorInfo.notes,
            ip_address: window.location.hostname
          });

        if (error) throw error;
      }

      toast.success(`Stats submitted for ${selectedCampaigns.size} campaign${selectedCampaigns.size > 1 ? 's' : ''}! Admin will review and approve.`);
      
      // Reset form
      setContractorInfo({
        contractorEmail: "",
        contractorName: "",
        submissionDate: format(new Date(), 'yyyy-MM-dd'),
        notes: ""
      });
      setSelectedCampaigns(new Set());
      setStatsData({});
      
    } catch (error) {
      console.error('Error submitting stats:', error);
      toast.error('Failed to submit stats. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Campaign Stats Submission</CardTitle>
            <CardDescription>
              Submit daily campaign statistics for multiple campaigns. Admin will review and approve.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contractor Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contractorName">Your Name *</Label>
                  <Input
                    id="contractorName"
                    value={contractorInfo.contractorName}
                    onChange={(e) => handleContractorInfoChange('contractorName', e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="contractorEmail">Your Email *</Label>
                  <Input
                    id="contractorEmail"
                    type="email"
                    value={contractorInfo.contractorEmail}
                    onChange={(e) => handleContractorInfoChange('contractorEmail', e.target.value)}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="submissionDate">Date *</Label>
                  <Input
                    id="submissionDate"
                    type="date"
                    value={contractorInfo.submissionDate}
                    onChange={(e) => handleContractorInfoChange('submissionDate', e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={contractorInfo.notes}
                    onChange={(e) => handleContractorInfoChange('notes', e.target.value)}
                    placeholder="Any additional notes..."
                  />
                </div>
              </div>

              {/* Campaign Selection Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Select Campaigns & Enter Stats</h3>
                  {selectedCampaigns.size > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {selectedCampaigns.size} campaign{selectedCampaigns.size > 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : campaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No campaigns available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead className="text-right">
                          Ad Spend ($)
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            disabled={selectedCampaigns.size === 0}
                            onClick={() => {
                              setBulkPasteField('adSpend');
                              setBulkPasteDialogOpen(true);
                            }}
                            type="button"
                          >
                            Bulk Paste
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          Leads
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            disabled={selectedCampaigns.size === 0}
                            onClick={() => {
                              setBulkPasteField('leads');
                              setBulkPasteDialogOpen(true);
                            }}
                            type="button"
                          >
                            Bulk Paste
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          Cases
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            disabled={selectedCampaigns.size === 0}
                            onClick={() => {
                              setBulkPasteField('cases');
                              setBulkPasteDialogOpen(true);
                            }}
                            type="button"
                          >
                            Bulk Paste
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          Revenue ($)
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            disabled={selectedCampaigns.size === 0}
                            onClick={() => {
                              setBulkPasteField('revenue');
                              setBulkPasteDialogOpen(true);
                            }}
                            type="button"
                          >
                            Bulk Paste
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaigns.map((campaign) => {
                        const isSelected = selectedCampaigns.has(campaign.id);
                        const campaignStats = statsData[campaign.id] || { leads: 0, cases: 0, revenue: 0, adSpend: 0 };
                        
                        return (
                          <TableRow key={campaign.id} className={isSelected ? "bg-muted/50" : ""}>
                            <TableCell>
                              <Checkbox
                                id={`select-${campaign.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => handleCampaignSelect(campaign.id, !!checked)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{campaign.name}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={isSelected ? (campaignStats.adSpend || '') : ''}
                                onChange={(e) => handleInputChange(campaign.id, 'adSpend', e.target.value)}
                                className="w-24 ml-auto"
                                placeholder="0"
                                disabled={!isSelected}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                value={isSelected ? (campaignStats.leads || '') : ''}
                                onChange={(e) => handleInputChange(campaign.id, 'leads', e.target.value)}
                                className="w-24 ml-auto"
                                placeholder="0"
                                disabled={!isSelected}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                value={isSelected ? (campaignStats.cases || '') : ''}
                                onChange={(e) => handleInputChange(campaign.id, 'cases', e.target.value)}
                                className="w-24 ml-auto"
                                placeholder="0"
                                disabled={!isSelected}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={isSelected ? (campaignStats.revenue || '') : ''}
                                onChange={(e) => handleInputChange(campaign.id, 'revenue', e.target.value)}
                                className="w-24 ml-auto"
                                placeholder="0"
                                disabled={!isSelected}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || isLoading || campaigns.length === 0 || selectedCampaigns.size === 0}
              >
                {isSubmitting ? 'Submitting...' : `Submit Stats for ${selectedCampaigns.size} Campaign${selectedCampaigns.size !== 1 ? 's' : ''}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Paste Dialog */}
      <Dialog open={bulkPasteDialogOpen} onOpenChange={setBulkPasteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Paste {bulkPasteField}</DialogTitle>
            <DialogDescription>
              Paste your data (one value per line) for the selected campaigns. Values will be applied in the order campaigns appear in the table.
              Currency symbols ($) and commas will be automatically removed.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Textarea
              placeholder="Paste your values here, one per line"
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              className="min-h-[200px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPasteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkPaste}>
              Apply Values
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
