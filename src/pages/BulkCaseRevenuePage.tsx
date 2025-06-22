
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { createDateAtUTCNoon, subDays } from "@/lib/utils/ManualDateUtils";
import { BulkCaseRevenueForm } from "@/components/campaigns/BulkCaseRevenueForm";
import { TrendingUp, Plus, DollarSign, Briefcase } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const BulkCaseRevenuePage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(subDays(createDateAtUTCNoon(new Date()), 1));

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center justify-center gap-2">
          <Plus className="h-8 w-8 text-green-600" />
          Bulk Case & Revenue Entry
        </h1>
        <p className="text-muted-foreground">
          Add closed cases and revenue to existing campaign stats
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Additive Entry</CardTitle>
            <Plus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Safe</div>
            <p className="text-xs text-muted-foreground">
              Values are added to existing stats, never overwritten
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cases</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">Track</div>
            <p className="text-xs text-muted-foreground">
              Add closed cases for all campaigns at once
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">Income</div>
            <p className="text-xs text-muted-foreground">
              Record revenue from closed cases
            </p>
          </CardContent>
        </Card>
      </div>

      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          <strong>How it works:</strong> This tool adds cases and revenue to your campaign stats without affecting 
          leads, ad spend, or other metrics. If stats already exist for the selected date, the values will be added 
          to the existing numbers. If no stats exist, new entries will be created.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Select Date & Enter Data</CardTitle>
          <CardDescription>
            Choose the date for case closures and revenue, then enter data for each campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Date for Case & Revenue Entry</label>
            <DatePicker 
              date={selectedDate} 
              setDate={(date) => date && setSelectedDate(date)} 
            />
          </div>

          <BulkCaseRevenueForm selectedDate={selectedDate} />
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>💡 <strong>Tip:</strong> Use bulk paste to quickly enter data from spreadsheets</p>
        <p>🔒 <strong>Safe:</strong> Your existing leads and ad spend data will never be modified</p>
      </div>
    </div>
  );
};

export default BulkCaseRevenuePage;
