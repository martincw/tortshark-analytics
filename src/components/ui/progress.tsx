
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface ProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  indicatorColor?: string;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  valuePosition?: "inside" | "right";
  variant?: "default" | "success" | "warning" | "error";
}

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  ProgressProps
>(({ 
  className, 
  value, 
  indicatorColor, 
  size = "md", 
  showValue = false,
  valuePosition = "right",
  variant = "default",
  ...props 
}, ref) => {
  // Ensure value is a number for progress calculations
  const numericValue = typeof value === 'number' ? value : 0;
  
  const getHeightClass = () => {
    switch (size) {
      case "sm": return "h-2";
      case "lg": return "h-6";
      default: return "h-4";
    }
  }
  
  const getVariantClass = () => {
    switch (variant) {
      case "success": return "bg-success";
      case "warning": return "bg-warning";
      case "error": return "bg-error";
      default: return "bg-primary";
    }
  }
  
  const heightClass = getHeightClass();
  const variantClass = getVariantClass();
  
  // Extract height class from className if provided (e.g., "h-2")
  const hasCustomHeight = className?.includes('h-');
  
  return (
    <div className="flex items-center gap-2">
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-muted",
          hasCustomHeight ? className : heightClass,
          !hasCustomHeight && className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all",
            indicatorColor || variantClass
          )}
          style={{ transform: `translateX(-${100 - numericValue}%)` }}
        >
          {showValue && valuePosition === "inside" && size === "lg" && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground">
              {numericValue.toFixed(1)}%
            </div>
          )}
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
      {showValue && valuePosition === "right" && (
        <span className="text-sm font-medium w-14">{numericValue.toFixed(1)}%</span>
      )}
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
