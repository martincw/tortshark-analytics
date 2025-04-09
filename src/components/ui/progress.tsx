
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
  const getHeightClass = () => {
    switch (size) {
      case "sm": return "h-2";
      case "lg": return "h-6";
      default: return "h-4";
    }
  }
  
  const getVariantClass = () => {
    switch (variant) {
      case "success": return "bg-success-DEFAULT";
      case "warning": return "bg-warning-DEFAULT";
      case "error": return "bg-error-DEFAULT";
      default: return "bg-primary";
    }
  }
  
  const heightClass = getHeightClass();
  const variantClass = getVariantClass();
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-secondary",
          heightClass
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            "h-full w-full flex-1 transition-all",
            indicatorColor || variantClass
          )}
          style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
        >
          {showValue && valuePosition === "inside" && size === "lg" && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-primary-foreground">
              {value}%
            </div>
          )}
        </ProgressPrimitive.Indicator>
      </ProgressPrimitive.Root>
      {showValue && valuePosition === "right" && (
        <span className="text-sm font-medium w-10">{value}%</span>
      )}
    </div>
  )
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
