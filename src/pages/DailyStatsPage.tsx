
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { SingleDayBulkStatsForm } from "@/components/campaigns/SingleDayBulkStatsForm";
import { createDateAtUTCNoon, subDays } from "@/lib/utils/ManualDateUtils";

const DailyStatsPage = () => {
  // Default to yesterday for typical contractor workflow
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(createDateAtUTCNoon(new Date()), 1));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Stats Entry</h1>
          <p className="text-muted-foreground mt-1">
            Enter campaign performance data for a single day
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Date</label>
            <DatePicker 
              date={selectedDate} 
              setDate={(date) => date && setSelectedDate(date)} 
            />
          </div>
          <div className="text-sm text-muted-foreground mt-6">
            Tip: Yesterday is pre-selected for your convenience
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Campaign Stats for {selectedDate.toLocaleDateString()}</CardTitle>
          <CardDescription>
            Select campaigns and enter their performance data. All fields are optional - enter only the data you have available.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SingleDayBulkStatsForm selectedDate={selectedDate} />
        </CardContent>
      </Card>

      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        <h3 className="font-medium mb-2">Quick Tips</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Select multiple campaigns using the checkboxes</li>
          <li>• Use "Bulk Paste" to quickly enter data from spreadsheets</li>
          <li>• Only enter data for the fields you have - empty fields will be saved as 0</li>
          <li>• Your changes are saved immediately when you click "Save Stats"</li>
        </ul>
      </div>
    </div>
  );
};

export default DailyStatsPage;
