
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface CampaignCardHeaderProps {
  name: string;
  date: string;
  platform?: string;
}

export const CampaignCardHeader: React.FC<CampaignCardHeaderProps> = ({ 
  name, 
  date,
  platform = "Google Ads" 
}) => {
  const formattedDate = format(new Date(date), "MMM d, yyyy");

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
        <Badge variant="default" className="shrink-0">
          {platform}
        </Badge>
      </div>
    </CardHeader>
  );
};
