
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { formatSafeDate, subDays } from "@/lib/utils/ManualDateUtils";

interface StatsFormProps {
  statsDate: Date;
  setStatsDate: (date: Date) => void;
  leads: number;
  setLeads: (leads: number) => void;
  cases: number;
  setCases: (cases: number) => void;
  adSpend: number;
  setAdSpend: (adSpend: number) => void;
  revenue: number;
  setRevenue: (revenue: number) => void;
}

export const StatsForm: React.FC<StatsFormProps> = ({
  statsDate,
  setStatsDate,
  leads,
  setLeads,
  cases,
  setCases,
  adSpend,
  setAdSpend,
  revenue,
  setRevenue
}) => {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="date">Date</Label>
        <DatePicker
          date={statsDate}
          onSelect={(date) => date && setStatsDate(date)}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          {statsDate ? formatSafeDate(statsDate.toISOString(), "EEEE, MMMM d, yyyy") : "Select a date"}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Reordered fields: Ad Spend, Leads, Cases, Revenue */}
        <div className="grid gap-2">
          <Label htmlFor="adSpend">Ad Spend ($)</Label>
          <Input
            id="adSpend"
            type="number"
            min="0"
            step="0.01"
            value={adSpend || ""}
            onChange={(e) => setAdSpend(Number(e.target.value))}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="leads">Leads</Label>
          <Input
            id="leads"
            type="number"
            min="0"
            value={leads || ""}
            onChange={(e) => setLeads(Number(e.target.value))}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="cases">Cases</Label>
          <Input
            id="cases"
            type="number"
            min="0"
            value={cases || ""}
            onChange={(e) => setCases(Number(e.target.value))}
          />
        </div>
        
        <div className="grid gap-2">
          <Label htmlFor="revenue">Revenue ($)</Label>
          <Input
            id="revenue"
            type="number"
            min="0"
            step="0.01"
            value={revenue || ""}
            onChange={(e) => setRevenue(Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};
