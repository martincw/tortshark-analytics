
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import QuickDateSelector from "@/components/dashboard/QuickDateSelector";
import { useCampaign } from "@/contexts/CampaignContext";
import { useState } from "react";
import { Card } from "@/components/ui/card";

const Index = () => {
  const { dateRange, setDateRange } = useCampaign();
  const [showDateSelector, setShowDateSelector] = useState(false);
  
  const handleDateSelect = (range: any) => {
    setDateRange(range);
  };
  
  const handleClearDates = () => {
    setDateRange({ startDate: "", endDate: "" });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <DateRangePicker />
          <div className="relative">
            <Card className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[300px] p-4 shadow-md">
              <QuickDateSelector
                onSelect={handleDateSelect}
                currentRange={dateRange}
                onClear={handleClearDates}
              />
            </Card>
          </div>
        </div>
      </div>
      
      {/* Dashboard content will go here */}
    </div>
  );
};

export default Index;
