
import React from "react";
import { DateRangePicker } from "./DateRangePicker";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function DashboardHeader() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaign Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor and manage all your mass tort advertising campaigns
        </p>
      </div>
      <div className="flex gap-4 w-full md:w-auto">
        <DateRangePicker />
        <Button className="w-full md:w-auto" onClick={() => navigate("/add-campaign")}>
          <Plus className="mr-2 h-4 w-4" /> Add Campaign
        </Button>
      </div>
    </div>
  );
}
