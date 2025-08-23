
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
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
import { SubmissionConfirmationDialog } from "@/components/contractors/SubmissionConfirmationDialog";

interface Campaign {
  id: string;
  name: string;
  is_active: boolean;
}

type DailyStats = {
  leads: number;
  cases: number;
  revenue: number;
  adSpend: number;
  youtubeSpend: number;
  metaSpend: number;
  newsbreakSpend: number;
};

export default function ContractorBulkEntry() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState<Campaign[]>([]);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [statsData, setStatsData] = useState<Record<string, DailyStats>>({});
  const [bulkPasteField, setBulkPasteField] = useState<'leads' | 'cases' | 'revenue' | 'adSpend' | 'youtubeSpend' | 'metaSpend' | 'newsbreakSpend' | null>(null);
  const [bulkPasteDialogOpen, setBulkPasteDialogOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [submissionData, setSubmissionData] = useState<{
    contractorInfo: typeof contractorInfo;
    campaigns: Campaign[];
    statsData: Record<string, DailyStats>;
    selectedCampaigns: Set<string>;
  } | null>(null);
  
  const [contractorInfo, setContractorInfo] = useState({
    contractorEmail: "",
    contractorName: "",
    submissionDate: format(subDays(new Date(), 1), 'yyyy-MM-dd'),
    notes: ""
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    if (showActiveOnly) {
      setFilteredCampaigns(campaigns.filter(campaign => campaign.is_active));
    } else {
      // Sort campaigns with active ones first
      const sortedCampaigns = [...campaigns].sort((a, b) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return a.name.localeCompare(b.name);
      });
      setFilteredCampaigns(sortedCampaigns);
    }
  }, [campaigns, showActiveOnly]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, is_active')
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
          adSpend: 0,
          youtubeSpend: 0,
          metaSpend: 0,
          newsbreakSpend: 0
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
        ...(prev[campaignId] || { leads: 0, cases: 0, revenue: 0, adSpend: 0, youtubeSpend: 0, metaSpend: 0, newsbreakSpend: 0 }),
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
            ...(newData[campaignId] || { leads: 0, cases: 0, revenue: 0, adSpend: 0, youtubeSpend: 0, metaSpend: 0, newsbreakSpend: 0 }),
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

  const hasInactiveCampaignsSelected = () => {
    return Array.from(selectedCampaigns).some(campaignId => {
      const campaign = campaigns.find(c => c.id === campaignId);
      return campaign && !campaign.is_active;
    });
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

    // Show warning if submitting for inactive campaigns
    if (hasInactiveCampaignsSelected()) {
      const inactiveCampaigns = Array.from(selectedCampaigns)
        .map(id => campaigns.find(c => c.id === id))
        .filter(c => c && !c.is_active)
        .map(c => c!.name);
      
      const confirmed = window.confirm(
        `You are submitting stats for inactive campaign(s): ${inactiveCampaigns.join(', ')}.\n\nAre you sure you want to continue?`
      );
      
      if (!confirmed) {
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      // Submit stats for each selected campaign
      for (const campaignId of selectedCampaigns) {
        const campaignStats = statsData[campaignId] || { leads: 0, cases: 0, revenue: 0, adSpend: 0, youtubeSpend: 0, metaSpend: 0, newsbreakSpend: 0 };
        
        const { error } = await supabase
          .from('contractor_submissions')
          .insert({
            contractor_email: contractorInfo.contractorEmail,
            contractor_name: contractorInfo.contractorName,
            campaign_id: campaignId,
            submission_date: contractorInfo.submissionDate,
            ad_spend: campaignStats.adSpend || 0,
            youtube_spend: campaignStats.youtubeSpend || 0,
            meta_spend: campaignStats.metaSpend || 0,
            newsbreak_spend: campaignStats.newsbreakSpend || 0,
            leads: campaignStats.leads || 0,
            cases: campaignStats.cases || 0,
            revenue: campaignStats.revenue || 0,
            notes: contractorInfo.notes,
            ip_address: window.location.hostname
          });

        if (error) throw error;
      }

      // Store submission data for confirmation dialog
      setSubmissionData({
        contractorInfo: { ...contractorInfo },
        campaigns: campaigns,
        statsData: { ...statsData },
        selectedCampaigns: new Set(selectedCampaigns)
      });

      // Show confirmation dialog instead of toast
      setShowConfirmation(true);
      
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

              {/* Campaign Filter Toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Select Campaigns & Enter Stats</h3>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-active-only"
                      checked={showActiveOnly}
                      onCheckedChange={setShowActiveOnly}
                    />
                    <Label htmlFor="show-active-only" className="text-sm">
                      Show active campaigns only
                    </Label>
                  </div>
                  {selectedCampaigns.size > 0 && (
                    <Badge variant="secondary">
                      {selectedCampaigns.size} campaign{selectedCampaigns.size > 1 ? 's' : ''} selected
                    </Badge>
                  )}
                </div>
              </div>

              {/* Campaign Selection Table */}
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                  </div>
                ) : filteredCampaigns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No campaigns available
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Campaign</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="text-right">
                          Total Ad Spend ($)
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
                          YouTube ($)
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            disabled={selectedCampaigns.size === 0}
                            onClick={() => {
                              setBulkPasteField('youtubeSpend');
                              setBulkPasteDialogOpen(true);
                            }}
                            type="button"
                          >
                            Bulk Paste
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          Meta ($)
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            disabled={selectedCampaigns.size === 0}
                            onClick={() => {
                              setBulkPasteField('metaSpend');
                              setBulkPasteDialogOpen(true);
                            }}
                            type="button"
                          >
                            Bulk Paste
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">
                          Newsbreak ($)
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-2"
                            disabled={selectedCampaigns.size === 0}
                            onClick={() => {
                              setBulkPasteField('newsbreakSpend');
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
                      {filteredCampaigns.map((campaign) => {
                        const isSelected = selectedCampaigns.has(campaign.id);
                        const campaignStats = statsData[campaign.id] || { leads: 0, cases: 0, revenue: 0, adSpend: 0, youtubeSpend: 0, metaSpend: 0, newsbreakSpend: 0 };
                        
                        return (
                          <TableRow 
                            key={campaign.id} 
                            className={`${isSelected ? "bg-muted/50" : ""} ${!campaign.is_active ? "opacity-75" : ""}`}
                          >
                            <TableCell>
                              <Checkbox
                                id={`select-${campaign.id}`}
                                checked={isSelected}
                                onCheckedChange={(checked) => handleCampaignSelect(campaign.id, !!checked)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{campaign.name}</TableCell>
                            <TableCell>
                              <Badge variant={campaign.is_active ? "default" : "secondary"}>
                                {campaign.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
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
                                step="0.01"
                                value={isSelected ? (campaignStats.youtubeSpend || '') : ''}
                                onChange={(e) => handleInputChange(campaign.id, 'youtubeSpend', e.target.value)}
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
                                value={isSelected ? (campaignStats.metaSpend || '') : ''}
                                onChange={(e) => handleInputChange(campaign.id, 'metaSpend', e.target.value)}
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
                                value={isSelected ? (campaignStats.newsbreakSpend || '') : ''}
                                onChange={(e) => handleInputChange(campaign.id, 'newsbreakSpend', e.target.value)}
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
                disabled={isSubmitting || isLoading || filteredCampaigns.length === 0 || selectedCampaigns.size === 0}
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

      {/* Submission Confirmation Dialog */}
      {submissionData && (
        <SubmissionConfirmationDialog
          open={showConfirmation}
          onOpenChange={setShowConfirmation}
          contractorInfo={submissionData.contractorInfo}
          campaigns={submissionData.campaigns}
          statsData={submissionData.statsData}
          selectedCampaigns={submissionData.selectedCampaigns}
        />
      )}
    </div>
  );
}
