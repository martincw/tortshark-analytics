
import React from "react";
import { cn } from "@/lib/utils";

interface CustomProgressBarProps {
  value: number;
  className?: string;
  variant?: "default" | "success" | "warning" | "error";
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  valuePosition?: "inside" | "right";
}

export function CustomProgressBar({
  value,
  className,
  variant = "default",
  size = "md",
  showValue = false,
  valuePosition = "right",
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
      case "success": return "bg-success-DEFAULT";
      case "warning": return "bg-warning-DEFAULT";
      case "error": return "bg-error-DEFAULT";
      default: return "bg-primary";
    }
  };
  
  const heightClass = getHeightClass();
  const variantClass = getVariantClass();
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-secondary",
          heightClass
        )}
      >
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-all",
            variantClass
          )}
          style={{ width: `${progressValue}%` }}
        >
          {showValue && valuePosition === "inside" && size === "lg" && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground">
              {progressValue.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      {showValue && valuePosition === "right" && (
        <span className="text-sm font-medium w-14">{progressValue.toFixed(1)}%</span>
      )}
    </div>
  );
}
