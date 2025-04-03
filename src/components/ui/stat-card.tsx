
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  valueClassName?: string;
  description?: string;
  isHighlighted?: boolean;
}

const statCardVariants = cva(
  "overflow-hidden transition-all duration-200",
  {
    variants: {
      highlighted: {
        true: "border-2 shadow-lg hover:shadow-xl",
        false: "hover:border-primary/50 hover:shadow-md",
      }
    },
    defaultVariants: {
      highlighted: false,
    },
  }
);

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  className,
  valueClassName,
  description,
  isHighlighted = false,
}: StatCardProps) {
  return (
    <Card className={cn(statCardVariants({ highlighted: isHighlighted }), className)}>
      <CardContent className={cn("p-6 relative", isHighlighted && "bg-secondary/10")}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              {icon && <span className="text-primary">{icon}</span>}
              {title}
            </p>
            <h3 className={cn("text-2xl font-bold mt-1.5", isHighlighted && "text-2xl md:text-3xl", valueClassName)}>
              {value}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
            {trend && trendValue && (
              <p
                className={cn(
                  "text-xs font-medium flex items-center mt-2 gap-1",
                  trend === "up" && "text-success-DEFAULT",
                  trend === "down" && "text-error-DEFAULT",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trend === "up" && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                )}
                {trend === "down" && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 13a1 1 0 110 2H7a1 1 0 01-1-1v-5a1 1 0 112 0v2.586l4.293-4.293a1 1 0 011.414 0L16 9.586l4.293-4.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0L13 9.414l-3.586 3.586H12z" clipRule="evenodd" />
                  </svg>
                )}
                {trendValue}
              </p>
            )}
          </div>
          {icon && !isHighlighted && <div className="text-primary opacity-90">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
