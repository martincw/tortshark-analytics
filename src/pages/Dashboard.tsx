
import React, { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DailyAveragesSection } from "@/components/dashboard/DailyAveragesSection";
import { OverviewStats } from "@/components/dashboard/OverviewStats";

// Helper function to create a Date object in local time
function createLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  // JavaScript months are 0-indexed, so subtract 1 from the month
  return new Date(year, month - 1, day);
}

const Dashboard: React.FC = () => {
  const [inputDate, setInputDate] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value; // Expected format: "YYYY-MM-DD"
    setInputDate(dateStr);
    if (dateStr) {
      // Convert the date string to a local Date using our helper function
      const localDate = createLocalDate(dateStr);
      setSelectedDate(localDate);
    } else {
      setSelectedDate(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DashboardHeader />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <OverviewStats />
      </div>
      
      <div className="flex flex-col space-y-2 my-6">
        <label htmlFor="datePicker" className="text-sm font-medium">
          Select a Date:
        </label>
        <input
          id="datePicker"
          type="date"
          value={inputDate}
          onChange={handleDateChange}
          className="w-[240px] px-3 py-2 border rounded-md"
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {selectedDate 
              ? `Data for ${selectedDate.toLocaleDateString('en-US', {
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric'
                })}`
              : "Dashboard Overview"
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Displaying data for {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-accent/10 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Total Leads</h3>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="bg-accent/10 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Total Cases</h3>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="bg-accent/10 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Revenue</h3>
                  <p className="text-2xl font-bold">$0.00</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Please select a date to view data.</p>
          )}
        </CardContent>
      </Card>
      
      <DailyAveragesSection />
    </div>
  );
};

export default Dashboard;
