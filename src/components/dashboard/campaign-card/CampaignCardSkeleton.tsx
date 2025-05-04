
import React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const CampaignCardSkeleton = () => {
  return (
    <Card className="overflow-hidden border border-border/80">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-6 w-24" />
        </div>
      </CardHeader>
      
      <CardContent className="pb-0">
        <Skeleton className="h-16 w-full mb-4 rounded-md" />
        
        <div className="grid grid-cols-2 gap-4 mb-2">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <div className="space-y-1 w-full">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          ))}
        </div>
        
        <div className="border-t pt-2 mt-2">
          <div className="space-y-1">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-4 flex justify-between gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-9" />
      </CardFooter>
    </Card>
  );
};
