
import React, { useState } from "react";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarDays, Plus, Minus } from "lucide-react";
import { format } from "date-fns";

interface DayStats {
  date: Date;
  leads: string;
  cases: string;
  retainers: string;
  revenue: string;
  adSpend: string;
}

interface MultiDayStatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  selectedDates: Date[];
  dayStats: DayStats[];
  onDatesSelected: (dates: Date[]) => void;
  onUpdateDayStats: (dateIndex: number, field: keyof Omit<DayStats, 'date'>, value: string) => void;
  onSubmit: () => void;
}

export const MultiDayStatsDialog: React.FC<MultiDayStatsDialogProps> = ({
  isOpen,
  onClose,
  campaignName,
  selectedDates,
  dayStats,
  onDatesSelected,
  onUpdateDayStats,
  onSubmit
}) => {
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);

  const handleCalendarSelect = (date: Date | undefined) => {
    if (!date) return;
    
    setCalendarDates(prev => {
      const isSelected = prev.some(d => d.getTime() === date.getTime());
      if (isSelected) {
        return prev.filter(d => d.getTime() !== date.getTime());
      } else {
        return [...prev, date].sort((a, b) => a.getTime() - b.getTime());
      }
    });
  };

  const applySelectedDates = () => {
    onDatesSelected(calendarDates);
  };

  const removeDate = (dateIndex: number) => {
    const newDates = selectedDates.filter((_, index) => index !== dateIndex);
    onDatesSelected(newDates);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Multi-Day Stats for {campaignName}</DialogTitle>
          <DialogDescription>
            Select multiple dates and add stats for each day. All values will be added to the campaign totals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {selectedDates.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <Label className="text-sm font-medium">Select Multiple Dates</Label>
              </div>
              <div className="flex flex-col items-center space-y-4">
                <CalendarComponent
                  mode="multiple"
                  selected={calendarDates}
                  onSelect={handleCalendarSelect}
                  className="rounded-md border"
                />
                <Button 
                  onClick={applySelectedDates} 
                  disabled={calendarDates.length === 0}
                  className="w-full"
                >
                  Continue with {calendarDates.length} Selected Date{calendarDates.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Stats for {selectedDates.length} Selected Date{selectedDates.length !== 1 ? 's' : ''}
                </Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onDatesSelected([])}
                >
                  Change Dates
                </Button>
              </div>
              
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {dayStats.map((stat, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">
                        {format(stat.date, "EEEE, MMM d, yyyy")}
                      </h4>
                      {selectedDates.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDate(index)}
                          className="h-6 w-6 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-5 gap-3">
                      <div>
                        <Label htmlFor={`leads-${index}`} className="text-xs">Leads</Label>
                        <Input
                          id={`leads-${index}`}
                          type="number"
                          value={stat.leads}
                          onChange={(e) => onUpdateDayStats(index, 'leads', e.target.value)}
                          min="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`cases-${index}`} className="text-xs">Cases</Label>
                        <Input
                          id={`cases-${index}`}
                          type="number"
                          value={stat.cases}
                          onChange={(e) => onUpdateDayStats(index, 'cases', e.target.value)}
                          min="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`retainers-${index}`} className="text-xs">Retainers</Label>
                        <Input
                          id={`retainers-${index}`}
                          type="number"
                          value={stat.retainers}
                          onChange={(e) => onUpdateDayStats(index, 'retainers', e.target.value)}
                          min="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`revenue-${index}`} className="text-xs">Revenue ($)</Label>
                        <Input
                          id={`revenue-${index}`}
                          type="number"
                          value={stat.revenue}
                          onChange={(e) => onUpdateDayStats(index, 'revenue', e.target.value)}
                          min="0"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`adSpend-${index}`} className="text-xs">Ad Spend ($)</Label>
                        <Input
                          id={`adSpend-${index}`}
                          type="number"
                          value={stat.adSpend}
                          onChange={(e) => onUpdateDayStats(index, 'adSpend', e.target.value)}
                          min="0"
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {selectedDates.length > 0 && (
            <Button onClick={onSubmit}>
              Add Stats for {selectedDates.length} Day{selectedDates.length !== 1 ? 's' : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
