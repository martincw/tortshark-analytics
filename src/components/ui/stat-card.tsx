
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number | React.ReactNode;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
  valueClassName?: string;
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendValue,
  className,
  valueClassName,
}: StatCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className={cn("text-2xl font-bold mt-1", valueClassName)}>{value}</h3>
            {trend && trendValue && (
              <p
                className={cn(
                  "text-xs font-medium flex items-center mt-1",
                  trend === "up" && "text-success-DEFAULT",
                  trend === "down" && "text-error-DEFAULT",
                  trend === "neutral" && "text-muted-foreground"
                )}
              >
                {trendValue}
              </p>
            )}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
