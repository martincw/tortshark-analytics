
import React from "react";
import { cn } from "@/lib/utils";

interface CustomProgressBarProps {
  value: number;
  className?: string;
  variant?: "default" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  valuePosition?: "inside" | "right";
  animate?: boolean;
}

export function CustomProgressBar({
  value,
  className,
  variant = "default",
  size = "md",
  showValue = false,
  valuePosition = "right",
  animate = true,
}: CustomProgressBarProps) {
  // Ensure value is between 0 and 100
  const progressValue = Math.max(0, Math.min(100, Number(value) || 0));
  
  const getHeightClass = () => {
    switch (size) {
      case "sm": return "h-2";
      case "lg": return "h-6";
      default: return "h-4";
    }
  };
  
  const getVariantClass = () => {
    switch (variant) {
      case "success": return "bg-gradient-to-r from-emerald-400 to-emerald-600";
      case "warning": return "bg-gradient-to-r from-amber-400 to-amber-600";
      case "error": return "bg-gradient-to-r from-rose-400 to-rose-600";
      default: return "bg-gradient-to-r from-primary/70 to-primary";
    }
  };
  
  const heightClass = getHeightClass();
  const variantClass = getVariantClass();
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-secondary/50",
          heightClass
        )}
      >
        <div
          className={cn(
            "absolute left-0 top-0 h-full",
            variantClass,
            animate && "transition-all duration-500 ease-out"
          )}
          style={{ width: `${progressValue}%` }}
        >
          {showValue && valuePosition === "inside" && size !== "sm" && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-primary-foreground drop-shadow-sm">
              {progressValue.toFixed(0)}%
            </div>
          )}
        </div>
      </div>
      {showValue && valuePosition === "right" && (
        <span className="text-sm font-semibold min-w-14 text-right">{progressValue.toFixed(0)}%</span>
      )}
    </div>
  );
}
