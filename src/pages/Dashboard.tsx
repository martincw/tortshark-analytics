
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

const Dashboard: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Handle date selection with consistent 12pm to avoid timezone issues
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Normalize date to noon to avoid timezone issues
      const normalizedDate = new Date(date);
      normalizedDate.setHours(12, 0, 0, 0);
      setSelectedDate(normalizedDate);
    } else {
      setSelectedDate(undefined);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      
      <div className="flex flex-col space-y-2">
        <label htmlFor="datePicker" className="text-sm font-medium">
          Select a date:
        </label>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="datePicker"
              variant={"outline"}
              className={cn(
                "w-[240px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>
            {selectedDate 
              ? `Data for ${format(selectedDate, "MMMM d, yyyy")}`
              : "Dashboard Overview"
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedDate ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Displaying data for {format(selectedDate, "EEEE, MMMM d, yyyy")}
              </p>
              
              {/* Replace with actual dashboard data components */}
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
    </div>
  );
};

export default Dashboard;
