
import React from "react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlusCircle, Calendar, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CampaignCardActionsProps {
  onViewDetails: () => void;
  onAddStats: () => void;
  onAddMultiDayStats: () => void;
}

export const CampaignCardActions: React.FC<CampaignCardActionsProps> = ({ 
  onViewDetails,
  onAddStats,
  onAddMultiDayStats
}) => {
  return (
    <CardFooter className="pt-4 flex justify-between gap-2">
      <Button 
        onClick={onViewDetails} 
        variant="outline" 
        className="flex-1 group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors"
      >
        View Details
        <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-0.5 transition-transform" />
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-auto">
            <PlusCircle className="h-4 w-4" />
            <MoreVertical className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onAddStats}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Quick Stats (Single Day)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddMultiDayStats}>
            <Calendar className="h-4 w-4 mr-2" />
            Multi-Day Stats
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </CardFooter>
  );
};
