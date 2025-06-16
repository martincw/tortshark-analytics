
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { CalendarDays, Plus, Minus, DollarSign, Users, Briefcase, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface DayStats {
  date: Date;
  adSpend: string;
  leads: string;
  cases: string;
  revenue: string;
}

interface MultiDayStatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  campaignName: string;
  selectedDates: Date[];
  dayStats: DayStats[];
  onDatesSelected: (dates: Date[]) => void;
  onUpdateDayStats: (dateIndex: number, field: keyof Omit<DayStats, 'date'>, value: string) => void;
  onBulkUpdateField: (field: keyof Omit<DayStats, 'date'>, values: string[]) => void;
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
  onBulkUpdateField,
  onSubmit
}) => {
  const [calendarDates, setCalendarDates] = useState<Date[]>([]);
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteField, setBulkPasteField] = useState<keyof Omit<DayStats, 'date'> | null>(null);
  const [bulkPasteData, setBulkPasteData] = useState("");

  const handleCalendarSelect = (dates: Date[] | undefined) => {
    if (dates) {
      setCalendarDates(dates.sort((a, b) => a.getTime() - b.getTime()));
    } else {
      setCalendarDates([]);
    }
  };

  const applySelectedDates = () => {
    onDatesSelected(calendarDates);
  };

  const removeDate = (dateIndex: number) => {
    const newDates = selectedDates.filter((_, index) => index !== dateIndex);
    onDatesSelected(newDates);
  };

  const openBulkPaste = (field: keyof Omit<DayStats, 'date'>) => {
    setBulkPasteField(field);
    setBulkPasteData("");
    setShowBulkPaste(true);
  };

  const closeBulkPaste = () => {
    setShowBulkPaste(false);
    setBulkPasteField(null);
    setBulkPasteData("");
  };

  const applyBulkPaste = () => {
    if (!bulkPasteField) return;

    const lines = bulkPasteData.trim().split('\n');
    const values = lines.map(line => line.trim()).filter(line => line !== '');
    
    if (values.length === 0) {
      toast.error("No valid data to apply");
      return;
    }

    onBulkUpdateField(bulkPasteField, values);
    
    const appliedCount = Math.min(values.length, dayStats.length);
    toast.success(`Applied ${appliedCount} ${getFieldDisplayName(bulkPasteField)} values`);
    
    closeBulkPaste();
  };

  const getFieldDisplayName = (field: keyof Omit<DayStats, 'date'>) => {
    switch (field) {
      case 'adSpend': return 'Ad Spend';
      case 'leads': return 'Leads';
      case 'cases': return 'Cases';
      case 'revenue': return 'Revenue';
      default: return field;
    }
  };

  const getFieldIcon = (field: keyof Omit<DayStats, 'date'>) => {
    switch (field) {
      case 'adSpend': return <DollarSign className="h-4 w-4" />;
      case 'leads': return <Users className="h-4 w-4" />;
      case 'cases': return <Briefcase className="h-4 w-4" />;
      case 'revenue': return <TrendingUp className="h-4 w-4" />;
      default: return null;
    }
  };

  const getFieldPlaceholder = (field: keyof Omit<DayStats, 'date'>) => {
    switch (field) {
      case 'adSpend': return 'Enter one ad spend amount per line:\n1000\n1200\n800\n950\n1100';
      case 'leads': return 'Enter one lead count per line:\n50\n60\n40\n45\n55';
      case 'cases': return 'Enter one case count per line:\n5\n6\n4\n4\n5';
      case 'revenue': return 'Enter one revenue amount per line:\n25000\n30000\n20000\n22500\n27500';
      default: return 'Enter one value per line';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Multi-Day Stats for {campaignName}</DialogTitle>
          <DialogDescription>
            Select multiple dates and add stats for each day. Field order: Ad Spend, Leads, Cases, Revenue.
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
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onDatesSelected([])}
                  >
                    Change Dates
                  </Button>
                </div>
              </div>

              {/* Bulk Paste Buttons Row */}
              <div className="grid grid-cols-4 gap-2 p-3 bg-muted/30 rounded-lg">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBulkPaste('adSpend')}
                  className="text-xs flex items-center gap-1"
                >
                  {getFieldIcon('adSpend')}
                  Bulk Paste Ad Spend
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBulkPaste('leads')}
                  className="text-xs flex items-center gap-1"
                >
                  {getFieldIcon('leads')}
                  Bulk Paste Leads
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBulkPaste('cases')}
                  className="text-xs flex items-center gap-1"
                >
                  {getFieldIcon('cases')}
                  Bulk Paste Cases
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openBulkPaste('revenue')}
                  className="text-xs flex items-center gap-1"
                >
                  {getFieldIcon('revenue')}
                  Bulk Paste Revenue
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
                    
                    <div className="grid grid-cols-4 gap-3">
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

      {/* Single Field Bulk Paste Dialog */}
      <Dialog open={showBulkPaste} onOpenChange={setShowBulkPaste}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkPasteField && getFieldIcon(bulkPasteField)}
              Bulk Paste {bulkPasteField && getFieldDisplayName(bulkPasteField)}
            </DialogTitle>
            <DialogDescription>
              Paste {bulkPasteField && getFieldDisplayName(bulkPasteField).toLowerCase()} values for {dayStats.length} selected days. Enter one value per line.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-data">
                {bulkPasteField && getFieldDisplayName(bulkPasteField)} Values
              </Label>
              <Textarea
                id="bulk-data"
                value={bulkPasteData}
                onChange={(e) => setBulkPasteData(e.target.value)}
                placeholder={bulkPasteField ? getFieldPlaceholder(bulkPasteField) : "Enter values, one per line"}
                className="min-h-[150px] font-mono text-sm"
              />
            </div>
            
            {bulkPasteData && (
              <div className="text-sm text-muted-foreground">
                {bulkPasteData.trim().split('\n').filter(line => line.trim()).length} values will be applied to {Math.min(bulkPasteData.trim().split('\n').filter(line => line.trim()).length, dayStats.length)} days
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={closeBulkPaste}>
              Cancel
            </Button>
            <Button 
              onClick={applyBulkPaste}
              disabled={!bulkPasteData.trim()}
            >
              Apply {bulkPasteField && getFieldDisplayName(bulkPasteField)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
