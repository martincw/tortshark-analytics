
import React from "react";
import { cn } from "@/lib/utils";

interface BadgeStatProps {
  label: string;
  value: string | number | React.ReactNode;
  className?: string;
}

export function BadgeStat({ label, value, className }: BadgeStatProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className={cn("font-medium", className)}>{value}</div>
    </div>
  );
}
