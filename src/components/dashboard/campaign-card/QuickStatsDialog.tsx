
import React, { useState } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { subDays } from "@/lib/utils/ManualDateUtils";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useFormPersistence } from "@/hooks/useFormPersistence";
import { useNavigationWarning } from "@/hooks/useNavigationWarning";
import { DraftRecoveryBanner } from "@/components/ui/draft-recovery-banner";

interface QuickStatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  onSubmit: (stats: QuickStatsData, date: Date) => void;
}

export interface QuickStatsData {
  leads: string;
  cases: string;
  retainers: string;
  revenue: string;
  adSpend: string;
}

interface QuickStatsFormData {
  leads: string;
  cases: string;
  retainers: string;
  revenue: string;
  adSpend: string;
  selectedDate: Date;
}

export const QuickStatsDialog: React.FC<QuickStatsDialogProps> = ({
  isOpen,
  onClose,
  campaignName,
  onSubmit
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [showDraftRecovery, setShowDraftRecovery] = useState(false);
  const { currentWorkspace } = useWorkspace();
  
  const defaultValues: QuickStatsFormData = {
    leads: "0",
    cases: "0",
    retainers: "0",
    revenue: "0",
    adSpend: "0",
    selectedDate: subDays(new Date(), 1)
  };

  const {
    formData,
    updateField,
    resetForm,
    isDirty,
    lastSaved,
    hasSavedData
  } = useFormPersistence<QuickStatsFormData>({
    storageKey: `quickStats-${campaignName}`,
    defaultValues,
    autoSaveDelay: 2000
  });

  useNavigationWarning({ 
    isDirty, 
    message: "You have unsaved quick stats data. Are you sure you want to leave?" 
  });
  
  const handleSubmit = () => {
    const statsData: QuickStatsData = {
      leads: formData.leads,
      cases: formData.cases,
      retainers: formData.retainers,
      revenue: formData.revenue,
      adSpend: formData.adSpend
    };
    
    onSubmit(statsData, formData.selectedDate);
    resetForm();
  };
  
  const onCalendarSelect = (date: Date | undefined) => {
    if (date) {
      updateField('selectedDate', date);
      setCalendarOpen(false);
    }
  };
  
  // Handle dialog open/close
  React.useEffect(() => {
    if (isOpen) {
      if (hasSavedData()) {
        setShowDraftRecovery(true);
      }
    } else {
      setShowDraftRecovery(false);
    }
  }, [isOpen, hasSavedData]);

  const handleClose = () => {
    if (isDirty) {
      const shouldClose = window.confirm("You have unsaved changes. Are you sure you want to close?");
      if (!shouldClose) return;
    }
    resetForm();
    onClose();
  };

  const handleRestoreDraft = () => {
    setShowDraftRecovery(false);
  };

  const handleDiscardDraft = () => {
    resetForm();
    setShowDraftRecovery(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Stats for {campaignName}</DialogTitle>
          <DialogDescription>
            Add leads, cases, retainers, ad spend, and revenue for a specific date. These values will be added to the total.
          </DialogDescription>
        </DialogHeader>
        
        <DraftRecoveryBanner
          show={showDraftRecovery}
          lastSaved={lastSaved}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date-picker" className="text-right">
              Date
            </Label>
            <div className="col-span-3">
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="date-picker"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left",
                      !formData.selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formData.selectedDate ? (
                      format(formData.selectedDate, "PPP")
                    ) : (
                      <span>Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={formData.selectedDate}
                    onSelect={onCalendarSelect}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quick-leads" className="text-right">
              Leads
            </Label>
            <Input
              id="quick-leads"
              type="number"
              value={formData.leads}
              onChange={(e) => updateField('leads', e.target.value)}
              className="col-span-3"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quick-cases" className="text-right">
              Cases
            </Label>
            <Input
              id="quick-cases" 
              type="number"
              value={formData.cases}
              onChange={(e) => updateField('cases', e.target.value)}
              className="col-span-3"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quick-retainers" className="text-right">
              Retainers
            </Label>
            <Input
              id="quick-retainers"
              type="number" 
              value={formData.retainers}
              onChange={(e) => updateField('retainers', e.target.value)}
              className="col-span-3"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quick-adspend" className="text-right">
              Ad Spend ($)
            </Label>
            <Input
              id="quick-adspend"
              type="number" 
              value={formData.adSpend}
              onChange={(e) => updateField('adSpend', e.target.value)}
              className="col-span-3"
              min="0"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quick-revenue" className="text-right">
              Revenue ($)
            </Label>
            <Input
              id="quick-revenue"
              type="number" 
              value={formData.revenue}
              onChange={(e) => updateField('revenue', e.target.value)}
              className="col-span-3"
              min="0"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Stats
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
