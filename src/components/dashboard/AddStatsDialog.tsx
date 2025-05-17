
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { CampaignSelect } from "./stats/CampaignSelect";
import { StatsForm } from "./stats/StatsForm";
import { useStatsSubmission } from "./stats/useStatsSubmission";
import { subDays } from "@/lib/utils/ManualDateUtils";

interface AddStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddStatsDialog: React.FC<AddStatsDialogProps> = ({ open, onOpenChange }) => {
  const { campaigns, fetchCampaigns } = useCampaign();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [statsDate, setStatsDate] = useState<Date>(() => {
    // Default to yesterday instead of today
    return subDays(new Date(), 1);
  });
  const [leads, setLeads] = useState<number>(0);
  const [cases, setCases] = useState<number>(0);
  const [adSpend, setAdSpend] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);
  
  // Track if this is the initial dialog open to only set default campaign once
  const [isInitialOpen, setIsInitialOpen] = useState<boolean>(true);
  
  const { submitStats, isSubmitting } = useStatsSubmission({
    fetchCampaigns,
    onClose: () => onOpenChange(false)
  });

  // Handle dialog open/close
  useEffect(() => {
    if (open) {
      // Only set the default campaign ID if it's the initial open or no campaign is selected
      if (isInitialOpen || selectedCampaignId === "") {
        setSelectedCampaignId(campaigns.length > 0 ? campaigns[0].id : "");
        setIsInitialOpen(false);
      }
      
      // Reset form fields except selected campaign
      setStatsDate(subDays(new Date(), 1)); // Set to yesterday
      setLeads(0);
      setCases(0);
      setAdSpend(0);
      setRevenue(0);
    }
  }, [open, campaigns, isInitialOpen, selectedCampaignId]);

  const handleSubmit = async () => {
    await submitStats(
      selectedCampaignId,
      statsDate,
      leads,
      cases,
      adSpend,
      revenue
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Campaign Stats</DialogTitle>
        </DialogHeader>
        
        <CampaignSelect 
          campaigns={campaigns}
          selectedCampaignId={selectedCampaignId}
          onCampaignChange={setSelectedCampaignId}
        />
        
        <StatsForm
          statsDate={statsDate}
          setStatsDate={setStatsDate}
          leads={leads}
          setLeads={setLeads}
          cases={cases}
          setCases={setCases}
          adSpend={adSpend}
          setAdSpend={setAdSpend}
          revenue={revenue}
          setRevenue={setRevenue}
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Stats"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
