
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

export const QuickStatsDialog: React.FC<QuickStatsDialogProps> = ({
  isOpen,
  onClose,
  campaignName,
  onSubmit
}) => {
  // Initialize form state only when dialog opens
  const [quickStats, setQuickStats] = useState<QuickStatsData>({
    leads: "0",
    cases: "0",
    retainers: "0",
    revenue: "0",
    adSpend: "0"
  });
  // Set default date to yesterday instead of today
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(new Date(), 1));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { currentWorkspace } = useWorkspace();
  
  const handleSubmit = () => {
    onSubmit(quickStats, selectedDate);
  };
  
  const onCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };
  
  // Reset the form values when the dialog opens/closes
  React.useEffect(() => {
    if (isOpen) {
      // Only reset values, not the campaign selection
      setQuickStats({
        leads: "0",
        cases: "0",
        retainers: "0",
        revenue: "0",
        adSpend: "0"
      });
      setSelectedDate(subDays(new Date(), 1));
    }
  }, [isOpen]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Stats for {campaignName}</DialogTitle>
          <DialogDescription>
            Add leads, cases, retainers, ad spend, and revenue for a specific date. These values will be added to the total.
          </DialogDescription>
        </DialogHeader>
        
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
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Select date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
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
              value={quickStats.leads}
              onChange={(e) => setQuickStats({...quickStats, leads: e.target.value})}
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
              value={quickStats.cases}
              onChange={(e) => setQuickStats({...quickStats, cases: e.target.value})}
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
              value={quickStats.retainers}
              onChange={(e) => setQuickStats({...quickStats, retainers: e.target.value})}
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
              value={quickStats.adSpend}
              onChange={(e) => setQuickStats({...quickStats, adSpend: e.target.value})}
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
              value={quickStats.revenue}
              onChange={(e) => setQuickStats({...quickStats, revenue: e.target.value})}
              className="col-span-3"
              min="0"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Stats
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
