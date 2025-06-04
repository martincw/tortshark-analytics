
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCampaign } from "@/contexts/CampaignContext";
import { CampaignSelect } from "./stats/CampaignSelect";
import { StatsForm } from "./stats/StatsForm";
import { useStatsSubmission } from "./stats/useStatsSubmission";
import { subDays } from "@/lib/utils/ManualDateUtils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useNavigationWarning } from "@/hooks/useNavigationWarning";
import { DraftRecoveryBanner } from "@/components/ui/draft-recovery-banner";

interface AddStatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface StatsFormData {
  selectedCampaignId: string;
  statsDate: Date;
  leads: number;
  cases: number;
  adSpend: number;
  revenue: number;
}

export const AddStatsDialog: React.FC<AddStatsDialogProps> = ({ open, onOpenChange }) => {
  const { campaigns, fetchCampaigns } = useCampaign();
  const { currentWorkspace } = useWorkspace();
  
  const defaultValues: StatsFormData = {
    selectedCampaignId: "",
    statsDate: subDays(new Date(), 1),
    leads: 0,
    cases: 0,
    adSpend: 0,
    revenue: 0,
  };

  const {
    formData,
    updateField,
    updateForm,
    resetForm,
    isDirty,
    lastSaved,
    hasSavedData
  } = useFormPersistence<StatsFormData>({
    storageKey: "addStatsDialog",
    defaultValues,
    autoSaveDelay: 2000
  });

  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  
  const { submitStats, isSubmitting } = useStatsSubmission({
    fetchCampaigns,
    onClose: () => {
      resetForm();
      onOpenChange(false);
    }
  });

  useNavigationWarning({ 
    isDirty, 
    message: "You have unsaved stats data. Are you sure you want to leave?" 
  });

  // Filter campaigns by current workspace
  const workspaceCampaigns = currentWorkspace 
    ? campaigns.filter(campaign => {
        return campaign.workspace_id === currentWorkspace.id || !campaign.workspace_id;
      })
    : campaigns;

  // Handle dialog open/close
  useEffect(() => {
    if (open) {
      // Check if there's saved data when opening
      if (hasSavedData()) {
        setShowDraftRecovery(true);
      } else {
        // Set default campaign if no saved data
        if (workspaceCampaigns.length > 0 && !formData.selectedCampaignId) {
          updateField('selectedCampaignId', workspaceCampaigns[0].id);
        }
      }
    } else {
      setShowDraftRecovery(false);
    }
  }, [open, workspaceCampaigns, hasSavedData, formData.selectedCampaignId]);

  const handleSubmit = async () => {
    await submitStats(
      formData.selectedCampaignId,
      formData.statsDate,
      formData.leads,
      formData.cases,
      formData.adSpend,
      formData.revenue
    );
  };

  const handleRestoreDraft = () => {
    setShowDraftRecovery(false);
    // Data is already loaded by the persistence hook
  };

  const handleDiscardDraft = () => {
    resetForm();
    setShowDraftRecovery(false);
    // Set default campaign after discarding
    if (workspaceCampaigns.length > 0) {
      updateField('selectedCampaignId', workspaceCampaigns[0].id);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      const shouldClose = window.confirm("You have unsaved changes. Are you sure you want to close?");
      if (!shouldClose) return;
    }
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Campaign Stats</DialogTitle>
        </DialogHeader>
        
        <DraftRecoveryBanner
          show={showDraftRecovery}
          lastSaved={lastSaved}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
        
        <CampaignSelect 
          campaigns={workspaceCampaigns}
          selectedCampaignId={formData.selectedCampaignId}
          onCampaignChange={(value) => updateField('selectedCampaignId', value)}
        />
        
        <StatsForm
          statsDate={formData.statsDate}
          setStatsDate={(date) => updateField('statsDate', date)}
          leads={formData.leads}
          setLeads={(leads) => updateField('leads', leads)}
          cases={formData.cases}
          setCases={(cases) => updateField('cases', cases)}
          adSpend={formData.adSpend}
          setAdSpend={(adSpend) => updateField('adSpend', adSpend)}
          revenue={formData.revenue}
          setRevenue={(revenue) => updateField('revenue', revenue)}
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Stats"}
          </Button>
        </DialogFooter>
        
        {isDirty && (
          <div className="text-xs text-muted-foreground mt-2">
            {lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : "Auto-saving..."}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
