
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
import { CalendarDays, Plus, Minus, Copy, Eye } from "lucide-react";
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
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteData, setBulkPasteData] = useState("");
  const [previewData, setPreviewData] = useState<string[][]>([]);

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

  const parseBulkData = (data: string) => {
    const lines = data.trim().split('\n');
    const parsed: string[][] = [];
    
    for (const line of lines) {
      if (line.trim()) {
        // Support both comma and tab separation
        const values = line.split(/[,\t]/).map(v => v.trim());
        if (values.length >= 4) {
          parsed.push(values.slice(0, 4)); // Take first 4 values: adSpend, leads, cases, revenue
        }
      }
    }
    
    return parsed;
  };

  const handleBulkPastePreview = () => {
    const parsed = parseBulkData(bulkPasteData);
    setPreviewData(parsed);
  };

  const applyBulkPaste = () => {
    if (previewData.length === 0) {
      toast.error("No valid data to apply");
      return;
    }

    // Apply the data to the selected days
    previewData.forEach((row, index) => {
      if (index < dayStats.length && row.length >= 4) {
        onUpdateDayStats(index, 'adSpend', row[0] || '0');
        onUpdateDayStats(index, 'leads', row[1] || '0');
        onUpdateDayStats(index, 'cases', row[2] || '0');
        onUpdateDayStats(index, 'revenue', row[3] || '0');
      }
    });

    setShowBulkPaste(false);
    setBulkPasteData("");
    setPreviewData([]);
    toast.success("Bulk data applied successfully");
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
                    onClick={() => setShowBulkPaste(true)}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Bulk Paste
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onDatesSelected([])}
                  >
                    Change Dates
                  </Button>
                </div>
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

      {/* Bulk Paste Dialog */}
      <Dialog open={showBulkPaste} onOpenChange={setShowBulkPaste}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Bulk Paste Data</DialogTitle>
            <DialogDescription>
              Paste data in the format: Ad Spend, Leads, Cases, Revenue (comma or tab separated). One row per day.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-data">Paste Data</Label>
              <Textarea
                id="bulk-data"
                value={bulkPasteData}
                onChange={(e) => setBulkPasteData(e.target.value)}
                placeholder="Example:&#10;1000,50,5,25000&#10;1200,60,6,30000&#10;800,40,4,20000"
                className="min-h-[120px] font-mono text-sm"
              />
            </div>
            
            {bulkPasteData && (
              <Button
                variant="outline"
                onClick={handleBulkPastePreview}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview Data
              </Button>
            )}
            
            {previewData.length > 0 && (
              <div className="border rounded p-3 bg-muted/30">
                <Label className="text-sm font-medium">Preview:</Label>
                <div className="mt-2 text-xs space-y-1">
                  <div className="grid grid-cols-4 gap-2 font-semibold">
                    <span>Ad Spend</span>
                    <span>Leads</span>
                    <span>Cases</span>
                    <span>Revenue</span>
                  </div>
                  {previewData.slice(0, 5).map((row, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2">
                      {row.map((cell, cellIndex) => (
                        <span key={cellIndex}>{cell}</span>
                      ))}
                    </div>
                  ))}
                  {previewData.length > 5 && (
                    <div className="text-muted-foreground">
                      ...and {previewData.length - 5} more rows
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPaste(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applyBulkPaste}
              disabled={previewData.length === 0}
            >
              Apply Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};
