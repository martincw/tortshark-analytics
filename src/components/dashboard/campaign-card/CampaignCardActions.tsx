
import React from "react";
import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, PlusCircle } from "lucide-react";

interface CampaignCardActionsProps {
  onViewDetails: () => void;
  onAddStats: () => void;
}

export const CampaignCardActions: React.FC<CampaignCardActionsProps> = ({ 
  onViewDetails,
  onAddStats 
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
      <Button onClick={onAddStats} variant="outline" className="w-auto">
        <PlusCircle className="h-4 w-4" />
      </Button>
    </CardFooter>
  );
};
