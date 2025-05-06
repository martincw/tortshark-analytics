
import React from "react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import { format } from "date-fns";

interface CampaignCardHeaderProps {
  name: string;
  date: string;
  platform?: string;
  right?: React.ReactNode;
}

export function CampaignCardHeader({ 
  name, 
  date,
  platform,
  right 
}: CampaignCardHeaderProps) {
  const formattedDate = date ? format(new Date(date), "MMM d, yyyy") : "No date";
  
  return (
    <CardHeader className="pb-2">
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="text-lg font-bold line-clamp-1">{name}</CardTitle>
          <p className="text-sm text-muted-foreground flex items-center mt-1">
            <Calendar className="h-3 w-3 mr-1 inline" />
            {formattedDate}
          </p>
        </div>
        {right}
      </div>
    </CardHeader>
  );
}
