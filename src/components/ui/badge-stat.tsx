
import React from "react";
import { cn } from "@/lib/utils";

interface BadgeStatProps {
  label: string;
  value: string | number | React.ReactNode;
  className?: string;
  isDimmed?: boolean;
}

export function BadgeStat({ label, value, className, isDimmed = false }: BadgeStatProps) {
  return (
    <div className="space-y-1">
      <p className={cn(
        "text-xs", 
        isDimmed ? "text-muted-foreground/70" : "text-muted-foreground"
      )}>
        {label}
      </p>
      <div className={cn(
        "font-medium transition-colors", 
        isDimmed ? "text-foreground/70" : "text-foreground",
        className
      )}>
        {value}
      </div>
    </div>
  );
}
