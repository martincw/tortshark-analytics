
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { subDays } from "@/lib/utils/ManualDateUtils";
import { CampaignSelect } from "./stats/CampaignSelect";
import { StatsForm } from "./stats/StatsForm";
import { useStatsSubmission } from "./stats/useStatsSubmission";

interface AddStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddStatsDialog: React.FC<AddStatsDialogProps> = ({ open, onOpenChange }) => {
  const { campaigns, fetchCampaigns } = useCampaign();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [statsDate, setStatsDate] = useState<Date>(() => {
    // Default to yesterday
    return subDays(new Date(), 1);
  });
  const [leads, setLeads] = useState<number>(0);
  const [cases, setCases] = useState<number>(0);
  const [adSpend, setAdSpend] = useState<number>(0);
  const [revenue, setRevenue] = useState<number>(0);
  
  const { submitStats, isSubmitting } = useStatsSubmission({
    fetchCampaigns,
    onClose: () => onOpenChange(false)
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedCampaignId(campaigns.length > 0 ? campaigns[0].id : "");
      setStatsDate(subDays(new Date(), 1));
      setLeads(0);
      setCases(0);
      setAdSpend(0);
      setRevenue(0);
    }
  }, [open, campaigns]);

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
