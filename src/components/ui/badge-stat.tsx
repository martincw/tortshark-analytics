
import React from "react";
import { cn } from "@/lib/utils";

interface BadgeStatProps {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function BadgeStat({ label, value, trend, trendValue, className }: BadgeStatProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{value}</span>
        {trend && trendValue && (
          <span
            className={cn(
              "text-xs font-medium",
              trend === "up" && "text-success-DEFAULT",
              trend === "down" && "text-error-DEFAULT",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}
