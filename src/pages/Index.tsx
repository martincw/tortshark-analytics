import { DateRangePicker } from "@/components/dashboard/DateRangePicker";
import { useCampaign } from "@/contexts/CampaignContext";

const Index = () => {
  const { dateRange } = useCampaign();
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <div className="w-full md:w-auto">
          <DateRangePicker />
        </div>
      </div>
      
      {/* Dashboard content will go here */}
    </div>
  );
};

export default Index;
